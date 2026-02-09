/**
 * Firebase to Supabase Data Transformation & Migration Script
 *
 * Reads exported JSON from data/export/, transforms data, and loads
 * into local Supabase PostgreSQL.
 *
 * Usage:
 *   npx supabase db reset           # Reset database first
 *   npx tsx scripts/transform-and-migrate.ts
 *   npm run migrate:transform
 *
 * Requirements:
 *   - Local Supabase running (npx supabase start)
 *   - Exported data in data/export/ (npm run migrate:export)
 *   - Or set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

const EXPORT_DIR = path.join(process.cwd(), 'data', 'export');
const BATCH_SIZE = 100;

const INFO_TYPE_MAP: Record<number, string> = {
  0: 'appearance',
  1: 'background',
  2: 'note',
  3: 'character',
  4: 'goals',
  5: 'reward',
};

// ============================================================================
// TYPES
// ============================================================================

interface ExportDoc {
  id: string;
  data: Record<string, any>;
}

interface SubcollectionDoc {
  parentId: string;
  id: string;
  data: Record<string, any>;
}

// ============================================================================
// HELPERS
// ============================================================================

function uuid(): string {
  return crypto.randomUUID();
}

function readTenant(): string {
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const match = envContent.match(/NG_APP_TENANT\s*=\s*(\S+)/);
    return match?.[1]?.trim() || 'the-eighth';
  } catch {
    return 'the-eighth';
  }
}

function getSupabaseCredentials(): { url: string; serviceRoleKey: string } {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      url: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }

  try {
    const output = execSync('npx supabase status --output env', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const vars: Record<string, string> = {};
    for (const line of output.split(/\r?\n/)) {
      const match = line.match(/^(\w+)="?([^"]*)"?$/);
      if (match) vars[match[1]] = match[2].trim();
    }
    if (vars.API_URL && vars.SERVICE_ROLE_KEY) {
      return { url: vars.API_URL, serviceRoleKey: vars.SERVICE_ROLE_KEY };
    }
  } catch {
    // Fall through to error
  }

  throw new Error(
    'Cannot determine Supabase credentials. Either:\n' +
    '  - Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars, or\n' +
    '  - Ensure local Supabase is running (npx supabase start)'
  );
}

function loadJson<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, filename), 'utf8'));
}

function toTimestamptz(ts: { seconds: number; nanoseconds: number } | null | undefined): string | null {
  if (!ts || typeof ts.seconds !== 'number') return null;
  return new Date(ts.seconds * 1000).toISOString();
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function singularize(plural: string): string {
  if (plural === 'children') return 'child';
  if (plural.endsWith('s')) return plural.slice(0, -1);
  return plural;
}

// ============================================================================
// ID MAPPER
// ============================================================================

class IdMapper {
  private maps = new Map<string, Map<string, string>>();

  register(collection: string, firebaseId: string, supabaseUuid?: string): string {
    if (!this.maps.has(collection)) this.maps.set(collection, new Map());
    const map = this.maps.get(collection)!;
    if (supabaseUuid) {
      // Explicit UUID always wins (e.g. from Supabase Auth)
      map.set(firebaseId, supabaseUuid);
    } else if (!map.has(firebaseId)) {
      map.set(firebaseId, uuid());
    }
    return map.get(firebaseId)!;
  }

  get(collection: string, firebaseId: string): string | undefined {
    return this.maps.get(collection)?.get(firebaseId);
  }

  require(collection: string, firebaseId: string): string {
    const id = this.get(collection, firebaseId);
    if (!id) throw new Error(`No ID mapping for ${collection}/${firebaseId}`);
    return id;
  }
}

// ============================================================================
// BATCH INSERT HELPER
// ============================================================================

async function batchInsert(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, any>[]
): Promise<number> {
  if (rows.length === 0) return 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      throw new Error(`Insert into ${table} failed (batch ${i}-${i + batch.length}): ${error.message}`);
    }
  }
  return rows.length;
}

async function batchUpdate(
  supabase: SupabaseClient,
  table: string,
  updates: { id: string; data: Record<string, any> }[]
): Promise<number> {
  let count = 0;
  for (const { id, data } of updates) {
    if (Object.keys(data).length === 0) continue;
    const { error } = await supabase.from(table).update(data).eq('id', id);
    if (error) {
      throw new Error(`Update ${table}/${id} failed: ${error.message}`);
    }
    count++;
  }
  return count;
}

// ============================================================================
// MIGRATION CLASS
// ============================================================================

class Migration {
  private supabase: SupabaseClient;
  private ids = new IdMapper();
  private tenant: string;

  // Loaded export data
  private users: ExportDoc[] = [];
  private people: ExportDoc[] = [];
  private places: ExportDoc[] = [];
  private quests: ExportDoc[] = [];
  private projects: ExportDoc[] = [];
  private achievements: ExportDoc[] = [];
  private inventory: ExportDoc[] = [];
  private notes: ExportDoc[] = [];
  private rolls: ExportDoc[] = [];
  private flows: ExportDoc[] = [];
  private rules: ExportDoc[] = [];
  private campaign: ExportDoc[] = [];
  private timelines: ExportDoc[] = [];
  private peopleInfo: SubcollectionDoc[] = [];
  private placesInfo: SubcollectionDoc[] = [];
  private questsInfo: SubcollectionDoc[] = [];
  private timelinesEvents: SubcollectionDoc[] = [];
  private combatFighters: ExportDoc[] = [];

  // GM user firebase IDs (for document_access filtering)
  private gmFirebaseIds = new Set<string>();

  // Credentials for output
  private userCredentials: { name: string; email: string; password: string }[] = [];

  constructor(supabase: SupabaseClient, tenant: string) {
    this.supabase = supabase;
    this.tenant = tenant;
  }

  // --------------------------------------------------------------------------
  // Step 0: Load all exported data
  // --------------------------------------------------------------------------

  loadData(): void {
    console.log('Loading exported data...');
    this.users = loadJson('users.json');
    this.people = loadJson('people.json');
    this.places = loadJson('places.json');
    this.quests = loadJson('quests.json');
    this.projects = loadJson('projects.json');
    this.achievements = loadJson('achievements.json');
    this.inventory = loadJson('inventory.json');
    this.notes = loadJson('notes.json');
    this.rolls = loadJson('rolls.json');
    this.flows = loadJson('flows.json');
    this.rules = loadJson('rules.json');
    this.campaign = loadJson('campaign.json');
    this.timelines = loadJson('timelines.json');
    this.peopleInfo = loadJson('people_info.json');
    this.placesInfo = loadJson('places_info.json');
    this.questsInfo = loadJson('quests_info.json');
    this.timelinesEvents = loadJson('timelines_events.json');
    this.combatFighters = loadJson('combat_fighters.json');

    // Identify GM users
    for (const user of this.users) {
      if (user.data.isGM) this.gmFirebaseIds.add(user.id);
    }

    // Pre-register all IDs
    for (const doc of this.users) this.ids.register('users', doc.id);
    for (const doc of this.people) this.ids.register('people', doc.id);
    for (const doc of this.places) this.ids.register('places', doc.id);
    for (const doc of this.quests) this.ids.register('quests', doc.id);
    for (const doc of this.projects) this.ids.register('projects', doc.id);
    for (const doc of this.achievements) this.ids.register('achievements', doc.id);
    for (const doc of this.inventory) this.ids.register('inventory', doc.id);
    for (const doc of this.notes) this.ids.register('notes', doc.id);
    for (const doc of this.rolls) this.ids.register('rolls', doc.id);
    for (const doc of this.flows) this.ids.register('flows', doc.id);
    for (const doc of this.rules) this.ids.register('rules', doc.id);
    for (const doc of this.campaign) this.ids.register('campaign', doc.id);
    for (const doc of this.timelines) this.ids.register('timelines', doc.id);

    console.log('  Data loaded and IDs pre-registered.\n');
  }

  // --------------------------------------------------------------------------
  // Step 1: Seed rules config from rules.json
  // --------------------------------------------------------------------------

  async seedRulesConfig(): Promise<void> {
    console.log('Step 1: Seeding rules config...');
    const rulesJson = JSON.parse(
      fs.readFileSync(path.join('src', 'assets', this.tenant, 'rules.json'), 'utf8')
    );

    // rules_config
    const n1 = await batchInsert(this.supabase, 'rules_config', [{
      id: uuid(),
      tenant: this.tenant,
      edition: rulesJson.edition,
      addable_rule_types: rulesJson.addableRuleTypes,
    }]);
    console.log(`  rules_config: ${n1}`);

    // allowed_attributes
    const attrs = rulesJson.allowedAttributes.map((a: any) => ({
      id: uuid(),
      tenant: this.tenant,
      name: a.name,
      short_code: a.shortCode,
      display_style: a.displayStyle,
      sort_order: a.order || 0,
      roll_type: a.rollType || null,
    }));
    const n2 = await batchInsert(this.supabase, 'allowed_attributes', attrs);
    console.log(`  allowed_attributes: ${n2}`);

    // hit_locations
    const locs = Object.entries(rulesJson.hitLocations).map(([roll, name]) => ({
      id: uuid(),
      tenant: this.tenant,
      roll_value: parseInt(roll, 10),
      location_name: name as string,
    }));
    const n3 = await batchInsert(this.supabase, 'hit_locations', locs);
    console.log(`  hit_locations: ${n3}`);

    // combat_states
    const states = rulesJson.states.map((s: any) => ({
      id: uuid(),
      tenant: this.tenant,
      name: s.name,
    }));
    const n4 = await batchInsert(this.supabase, 'combat_states', states);
    console.log(`  combat_states: ${n4}`);
  }

  // --------------------------------------------------------------------------
  // Step 2: Create auth users + users table + user_roles
  // --------------------------------------------------------------------------

  async migrateUsers(): Promise<void> {
    console.log('Step 2: Migrating users...');

    // Delete any existing auth users (for idempotent re-runs)
    const { data: existingUsers } = await this.supabase.auth.admin.listUsers();
    for (const user of existingUsers?.users || []) {
      await this.supabase.auth.admin.deleteUser(user.id);
    }

    const usersRows: Record<string, any>[] = [];
    const rolesRows: Record<string, any>[] = [];

    for (const doc of this.users) {
      const email = `${slugify(doc.data.name)}@${this.tenant}.local`;
      const password = crypto.randomBytes(12).toString('base64url');

      // Create Supabase Auth user
      const { data: authData, error } = await this.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: doc.data.name },
      });
      if (error) throw new Error(`Failed to create auth user ${doc.data.name}: ${error.message || JSON.stringify(error)}`);

      const supabaseUuid = authData.user.id;
      this.ids.register('users', doc.id, supabaseUuid);

      this.userCredentials.push({ name: doc.data.name, email, password });

      usersRows.push({
        id: supabaseUuid,
        firebase_uid: doc.id,
        name: doc.data.name,
        view_ancestry: doc.data.viewAncestry ?? false,
        view_banner: doc.data.viewBanner ?? false,
        view_location: doc.data.viewLocation ?? false,
        view_name: doc.data.viewName ?? false,
        view_title: doc.data.viewTitle ?? false,
      });

      // Assign roles
      if (doc.data.isGM) {
        rolesRows.push({ id: uuid(), user_id: supabaseUuid, role: 'gm' });
      } else {
        rolesRows.push({ id: uuid(), user_id: supabaseUuid, role: 'player' });
      }
    }

    const n1 = await batchInsert(this.supabase, 'users', usersRows);
    console.log(`  users: ${n1}`);
    const n2 = await batchInsert(this.supabase, 'user_roles', rolesRows);
    console.log(`  user_roles: ${n2}`);

    // Write credentials file
    const credPath = path.join(EXPORT_DIR, '_user_credentials.json');
    fs.writeFileSync(credPath, JSON.stringify(this.userCredentials, null, 2), 'utf8');
    console.log(`  Credentials written to ${credPath}`);
  }

  // --------------------------------------------------------------------------
  // Step 3: Migrate rules
  // --------------------------------------------------------------------------

  async migrateRules(): Promise<void> {
    console.log('Step 3: Migrating rules...');

    const rows = this.rules.map(doc => ({
      id: this.ids.require('rules', doc.id),
      category: doc.data.type,
      name: doc.data.name,
      description: doc.data.rules || doc.data.description || null,
      is_static: false,
      is_custom: true,
    }));

    const n = await batchInsert(this.supabase, 'rules', rows);
    console.log(`  rules: ${n}`);
  }

  // --------------------------------------------------------------------------
  // Step 4: Migrate timelines
  // --------------------------------------------------------------------------

  async migrateTimelines(): Promise<void> {
    console.log('Step 4: Migrating timelines...');

    const rows = this.timelines.map(doc => ({
      id: this.ids.require('timelines', doc.id),
      name: doc.data.name,
      owner_id: doc.data.owner ? this.ids.get('users', doc.data.owner) || null : null,
    }));

    const n = await batchInsert(this.supabase, 'timelines', rows);
    console.log(`  timelines: ${n}`);
  }

  // --------------------------------------------------------------------------
  // Step 5: Migrate places (first pass - no parent_id)
  // --------------------------------------------------------------------------

  async migratePlaces(): Promise<void> {
    console.log('Step 5: Migrating places (first pass)...');

    const rows = this.places.map(doc => ({
      id: this.ids.require('places', doc.id),
      name: doc.data.name,
      type: doc.data.type || 'unknown',
      image: doc.data.image || null,
      inhabitants: doc.data.inhabitants || null,
      parent_id: null, // Set in second pass
      owner_id: this.ids.get('users', doc.data.owner) || null,
    }));

    const n = await batchInsert(this.supabase, 'places', rows);
    console.log(`  places: ${n}`);
  }

  // --------------------------------------------------------------------------
  // Step 6: Migrate people (first pass - no location_id)
  // --------------------------------------------------------------------------

  async migratePeople(): Promise<void> {
    console.log('Step 6: Migrating people (first pass)...');

    const rows = this.people.map(doc => ({
      id: this.ids.require('people', doc.id),
      name: doc.data.name,
      title: doc.data.title || null,
      image: doc.data.image || null,
      banner: doc.data.banner || null,
      pc: doc.data.pc ?? false,
      culture: doc.data.culture || null,
      profession: doc.data.profession || null,
      race: doc.data.race || null,
      birthday: doc.data.birthday || null,
      birthyear: doc.data.birthyear ?? null,
      deathday: doc.data.deathday || null,
      height: doc.data.height ?? null,
      location_id: null, // Set in second pass
      xp: doc.data.xp ?? null,
      owner_id: this.ids.get('users', doc.data.owner) || null,
    }));

    const n = await batchInsert(this.supabase, 'people', rows);
    console.log(`  people: ${n}`);
  }

  // --------------------------------------------------------------------------
  // Step 7: Migrate quests (first pass - no parent_id)
  // --------------------------------------------------------------------------

  async migrateQuests(): Promise<void> {
    console.log('Step 7: Migrating quests (first pass)...');

    const rows = this.quests.map(doc => ({
      id: this.ids.require('quests', doc.id),
      name: doc.data.name,
      type: doc.data.type || 'unknown',
      description: doc.data.description || null,
      completed: doc.data.completed ?? false,
      parent_id: null, // Set in second pass
      owner_id: this.ids.get('users', doc.data.owner) || null,
    }));

    const n = await batchInsert(this.supabase, 'quests', rows);
    console.log(`  quests: ${n}`);
  }

  // --------------------------------------------------------------------------
  // Step 8: Second pass - hierarchical FKs
  // --------------------------------------------------------------------------

  async updateHierarchicalFKs(): Promise<void> {
    console.log('Step 8: Updating hierarchical FKs...');

    // Places parent_id
    const placeUpdates = this.places
      .filter(doc => doc.data.parentId && typeof doc.data.parentId === 'string')
      .map(doc => ({
        id: this.ids.require('places', doc.id),
        data: { parent_id: this.ids.get('places', doc.data.parentId) || null },
      }))
      .filter(u => u.data.parent_id !== null);
    const n1 = await batchUpdate(this.supabase, 'places', placeUpdates);
    console.log(`  places.parent_id: ${n1} updated`);

    // People location_id
    const peopleUpdates = this.people
      .filter(doc => doc.data.location && typeof doc.data.location === 'string' && doc.data.location.length > 0)
      .map(doc => ({
        id: this.ids.require('people', doc.id),
        data: { location_id: this.ids.get('places', doc.data.location) || null },
      }))
      .filter(u => u.data.location_id !== null);
    const n2 = await batchUpdate(this.supabase, 'people', peopleUpdates);
    console.log(`  people.location_id: ${n2} updated`);

    // Quests parent_id
    const questUpdates = this.quests
      .filter(doc => doc.data.parentId && typeof doc.data.parentId === 'string')
      .map(doc => ({
        id: this.ids.require('quests', doc.id),
        data: { parent_id: this.ids.get('quests', doc.data.parentId) || null },
      }))
      .filter(u => u.data.parent_id !== null);
    const n3 = await batchUpdate(this.supabase, 'quests', questUpdates);
    console.log(`  quests.parent_id: ${n3} updated`);
  }

  // --------------------------------------------------------------------------
  // Step 9: Migrate campaign
  // --------------------------------------------------------------------------

  async migrateCampaign(): Promise<void> {
    console.log('Step 9: Migrating campaign...');

    for (const doc of this.campaign) {
      const row = {
        id: this.ids.require('campaign', doc.id),
        name: doc.data.name || doc.data.ship || '',
        captain: doc.data.captain || null,
        crewcount: doc.data.crewcount ?? null,
        date: doc.data.date || null,
        ship: doc.data.ship || null,
        ship_id: doc.data.shipLink ? this.ids.get('places', doc.data.shipLink) || null : null,
        stamina_reduction: doc.data.staminaReduction ?? null,
        timeline_id: doc.data.timelineId ? this.ids.get('timelines', doc.data.timelineId) || null : null,
        xp: doc.data.xp ?? null,
      };

      const n = await batchInsert(this.supabase, 'campaign', [row]);
      console.log(`  campaign: ${n}`);
    }
  }

  // --------------------------------------------------------------------------
  // Step 10: Migrate projects + milestones + requirements
  // --------------------------------------------------------------------------

  async migrateProjects(): Promise<void> {
    console.log('Step 10: Migrating projects...');

    const projectRows = this.projects.map(doc => ({
      id: this.ids.require('projects', doc.id),
      name: doc.data.name,
      benefit: doc.data.benefit || null,
      interval: doc.data.interval || null,
      owner_id: this.ids.get('users', doc.data.owner) || null,
    }));
    const n1 = await batchInsert(this.supabase, 'projects', projectRows);
    console.log(`  projects: ${n1}`);

    // Project milestones (from mDesc + mReq)
    const milestoneRows: Record<string, any>[] = [];
    for (const doc of this.projects) {
      const projectId = this.ids.require('projects', doc.id);
      const mDesc = doc.data.mDesc || {};
      const mReq = doc.data.mReq || {};
      const keys = new Set([...Object.keys(mDesc), ...Object.keys(mReq)]);
      let order = 0;
      for (const key of keys) {
        milestoneRows.push({
          id: uuid(),
          project_id: projectId,
          description: mDesc[key] || null,
          required_points: mReq[key] ?? 0,
          sort_order: order++,
        });
      }
    }
    const n2 = await batchInsert(this.supabase, 'project_milestones', milestoneRows);
    console.log(`  project_milestones: ${n2}`);

    // Project requirements (from rSkill + rThresh + rReq + rCur)
    const reqRows: Record<string, any>[] = [];
    for (const doc of this.projects) {
      const projectId = this.ids.require('projects', doc.id);
      const rSkill = doc.data.rSkill || {};
      const rThresh = doc.data.rThresh || {};
      const rReq = doc.data.rReq || {};
      const rCur = doc.data.rCur || {};
      const keys = new Set([
        ...Object.keys(rSkill), ...Object.keys(rThresh),
        ...Object.keys(rReq), ...Object.keys(rCur),
      ]);
      let order = 0;
      for (const key of keys) {
        reqRows.push({
          id: uuid(),
          project_id: projectId,
          skill: rSkill[key] || 'unknown',
          current_points: rCur[key] ?? 0,
          required_points: rReq[key] ?? 0,
          threshold: rThresh[key] ?? 0,
          sort_order: order++,
        });
      }
    }
    const n3 = await batchInsert(this.supabase, 'project_requirements', reqRows);
    console.log(`  project_requirements: ${n3}`);
  }

  // --------------------------------------------------------------------------
  // Step 11: Migrate achievements + achievement_people
  // --------------------------------------------------------------------------

  async migrateAchievements(): Promise<void> {
    console.log('Step 11: Migrating achievements...');

    const rows = this.achievements.map(doc => ({
      id: this.ids.require('achievements', doc.id),
      name: doc.data.name,
      description: doc.data.description || null,
      icon: doc.data.icon || null,
      unlocked: toTimestamptz(doc.data.unlocked) || new Date().toISOString(),
      owner_id: this.ids.get('users', doc.data.owner) || null,
    }));
    const n1 = await batchInsert(this.supabase, 'achievements', rows);
    console.log(`  achievements: ${n1}`);

    // achievement_people junction
    const junctionRows: Record<string, any>[] = [];
    for (const doc of this.achievements) {
      const achievementId = this.ids.require('achievements', doc.id);
      const peopleIds: string[] = doc.data.people || [];
      for (const personFirebaseId of peopleIds) {
        const personId = this.ids.get('people', personFirebaseId);
        if (personId) {
          junctionRows.push({
            id: uuid(),
            achievement_id: achievementId,
            person_id: personId,
          });
        }
      }
    }
    const n2 = await batchInsert(this.supabase, 'achievement_people', junctionRows);
    console.log(`  achievement_people: ${n2}`);
  }

  // --------------------------------------------------------------------------
  // Step 12: Migrate inventory
  // --------------------------------------------------------------------------

  async migrateInventory(): Promise<void> {
    console.log('Step 12: Migrating inventory...');

    const rows = this.inventory.map(doc => ({
      id: this.ids.require('inventory', doc.id),
      name: doc.data.name,
      amount: doc.data.amount ?? 1,
      character: doc.data.character || null,
      owner_id: this.ids.get('users', doc.data.owner) || null,
    }));

    const n = await batchInsert(this.supabase, 'inventory', rows);
    console.log(`  inventory: ${n}`);
  }

  // --------------------------------------------------------------------------
  // Step 13: Migrate notes
  // --------------------------------------------------------------------------

  async migrateNotes(): Promise<void> {
    console.log('Step 13: Migrating notes...');

    const rows = this.notes.map(doc => ({
      id: this.ids.require('notes', doc.id),
      title: doc.data.title || null,
      content: doc.data.content || null,
      category: doc.data.category || null,
      owner_id: this.ids.get('users', doc.data.owner) || null,
      created_at: toTimestamptz(doc.data.created) || undefined,
      modified_at: toTimestamptz(doc.data.modified) || undefined,
    }));

    const n = await batchInsert(this.supabase, 'notes', rows);
    console.log(`  notes: ${n}`);
  }

  // --------------------------------------------------------------------------
  // Step 14: Migrate rolls
  // --------------------------------------------------------------------------

  async migrateRolls(): Promise<void> {
    console.log('Step 14: Migrating rolls...');

    const rows = this.rolls.map(doc => {
      const d = doc.data;
      const row: Record<string, any> = {
        id: this.ids.require('rolls', doc.id),
        type: d.type,
        owner_id: this.ids.get('users', d.owner) || null,
        created_at: toTimestamptz(d.created) || undefined,
        modifier: d.modifier ?? null,
        name: d.name || null,
      };

      switch (d.type) {
        case 'attribute':
          row.attribute = d.attribute ?? null;
          row.roll = d.roll ?? null;
          break;
        case 'skill':
        case 'skill5':
          row.attributes = d.attributes || null;
          row.rolls = d.rolls || null;
          row.skill_points = d.skillPoints ?? null;
          break;
        case 'damage':
        case 'dice':
          row.dice_rolls = d.rolls || null;
          row.dice_type = d.diceType != null ? `d${d.diceType}` : null;
          break;
      }

      return row;
    });

    const n = await batchInsert(this.supabase, 'rolls', rows);
    console.log(`  rolls: ${n}`);
  }

  // --------------------------------------------------------------------------
  // Step 15: Migrate flows + flow_items
  // --------------------------------------------------------------------------

  async migrateFlows(): Promise<void> {
    console.log('Step 15: Migrating flows...');

    const flowRows = this.flows.map(doc => ({
      id: this.ids.require('flows', doc.id),
      title: doc.data.title || null,
      date: doc.data.date || new Date().toISOString(),
      owner_id: this.ids.get('users', doc.data.owner) || null,
    }));
    const n1 = await batchInsert(this.supabase, 'flows', flowRows);
    console.log(`  flows: ${n1}`);

    // Flow items
    const itemRows: Record<string, any>[] = [];
    for (const doc of this.flows) {
      const flowId = this.ids.require('flows', doc.id);
      const items: any[] = doc.data.items || [];

      for (const item of items) {
        let entityId: string | undefined;
        switch (item.type) {
          case 'person': entityId = this.ids.get('people', item.personId); break;
          case 'place': entityId = this.ids.get('places', item.placeId); break;
          case 'quest': entityId = this.ids.get('quests', item.questId); break;
          case 'note': entityId = this.ids.get('notes', item.noteId); break;
        }
        if (!entityId) continue; // Skip orphaned references

        itemRows.push({
          id: uuid(),
          flow_id: flowId,
          type: item.type,
          entity_id: entityId,
          sort_order: item.order ?? 0,
        });
      }
    }
    const n2 = await batchInsert(this.supabase, 'flow_items', itemRows);
    console.log(`  flow_items: ${n2}`);
  }

  // --------------------------------------------------------------------------
  // Step 16: Migrate person junction tables
  // --------------------------------------------------------------------------

  async migratePersonJunctions(): Promise<void> {
    console.log('Step 16: Migrating person junction tables...');

    const advantageRows: Record<string, any>[] = [];
    const disadvantageRows: Record<string, any>[] = [];
    const featRows: Record<string, any>[] = [];
    const skillRows: Record<string, any>[] = [];
    const spellRows: Record<string, any>[] = [];
    const cantripRows: Record<string, any>[] = [];
    const liturgyRows: Record<string, any>[] = [];
    const attributeRows: Record<string, any>[] = [];
    const tagRows: Record<string, any>[] = [];

    for (const doc of this.people) {
      const personId = this.ids.require('people', doc.id);
      const d = doc.data;

      // Advantages: Record<ruleId, {level?, details?}>
      if (d.advantages) {
        for (const [ruleFirebaseId, val] of Object.entries(d.advantages as Record<string, any>)) {
          const ruleId = this.ids.get('rules', ruleFirebaseId);
          if (!ruleId) continue;
          advantageRows.push({
            id: uuid(), person_id: personId, rule_id: ruleId,
            level: val?.level || null, details: val?.details || null,
          });
        }
      }

      // Disadvantages: Record<ruleId, {level?, details?}>
      if (d.disadvantages) {
        for (const [ruleFirebaseId, val] of Object.entries(d.disadvantages as Record<string, any>)) {
          const ruleId = this.ids.get('rules', ruleFirebaseId);
          if (!ruleId) continue;
          disadvantageRows.push({
            id: uuid(), person_id: personId, rule_id: ruleId,
            level: val?.level || null, details: val?.details || null,
          });
        }
      }

      // Feats: Record<ruleId, {level?, details?}>
      if (d.feats) {
        for (const [ruleFirebaseId, val] of Object.entries(d.feats as Record<string, any>)) {
          const ruleId = this.ids.get('rules', ruleFirebaseId);
          if (!ruleId) continue;
          featRows.push({
            id: uuid(), person_id: personId, rule_id: ruleId,
            level: val?.level || null, details: val?.details || null,
          });
        }
      }

      // Skills: Record<ruleId, number>
      if (d.skills) {
        for (const [ruleFirebaseId, value] of Object.entries(d.skills as Record<string, number>)) {
          const ruleId = this.ids.get('rules', ruleFirebaseId);
          if (!ruleId) continue;
          skillRows.push({
            id: uuid(), person_id: personId, rule_id: ruleId, value: value ?? 0,
          });
        }
      }

      // Spells: Record<ruleId, number>
      if (d.spells) {
        for (const [ruleFirebaseId, value] of Object.entries(d.spells as Record<string, number>)) {
          const ruleId = this.ids.get('rules', ruleFirebaseId);
          if (!ruleId) continue;
          spellRows.push({
            id: uuid(), person_id: personId, rule_id: ruleId, value: value ?? 0,
          });
        }
      }

      // Cantrips: Record<ruleId, number>
      if (d.cantrips) {
        for (const [ruleFirebaseId, value] of Object.entries(d.cantrips as Record<string, number>)) {
          const ruleId = this.ids.get('rules', ruleFirebaseId);
          if (!ruleId) continue;
          cantripRows.push({
            id: uuid(), person_id: personId, rule_id: ruleId, value: value ?? 0,
          });
        }
      }

      // Liturgies: Record<ruleId, number> (Firebase field is "liturgys")
      if (d.liturgys) {
        for (const [ruleFirebaseId, value] of Object.entries(d.liturgys as Record<string, number>)) {
          const ruleId = this.ids.get('rules', ruleFirebaseId);
          if (!ruleId) continue;
          liturgyRows.push({
            id: uuid(), person_id: personId, rule_id: ruleId, value: value ?? 0,
          });
        }
      }

      // Attributes: Array<{type, current, max}>
      if (d.attributes && Array.isArray(d.attributes)) {
        for (const attr of d.attributes) {
          attributeRows.push({
            id: uuid(), person_id: personId,
            type: attr.type, current: attr.current ?? 0, max: attr.max ?? 0,
          });
        }
      }

      // Tags: string[]
      if (d.tags && Array.isArray(d.tags)) {
        for (const tag of d.tags) {
          tagRows.push({ id: uuid(), person_id: personId, tag });
        }
      }
    }

    const results = [
      ['person_advantages', await batchInsert(this.supabase, 'person_advantages', advantageRows)],
      ['person_disadvantages', await batchInsert(this.supabase, 'person_disadvantages', disadvantageRows)],
      ['person_feats', await batchInsert(this.supabase, 'person_feats', featRows)],
      ['person_skills', await batchInsert(this.supabase, 'person_skills', skillRows)],
      ['person_spells', await batchInsert(this.supabase, 'person_spells', spellRows)],
      ['person_cantrips', await batchInsert(this.supabase, 'person_cantrips', cantripRows)],
      ['person_liturgies', await batchInsert(this.supabase, 'person_liturgies', liturgyRows)],
      ['person_attributes', await batchInsert(this.supabase, 'person_attributes', attributeRows)],
      ['person_tags', await batchInsert(this.supabase, 'person_tags', tagRows)],
    ] as const;

    for (const [table, count] of results) {
      console.log(`  ${table}: ${count}`);
    }
  }

  // --------------------------------------------------------------------------
  // Step 17: Migrate person relationships
  // --------------------------------------------------------------------------

  async migratePersonRelationships(): Promise<void> {
    console.log('Step 17: Migrating person relationships...');

    const rows: Record<string, any>[] = [];
    const seen = new Set<string>(); // Deduplicate

    for (const doc of this.people) {
      const personId = this.ids.require('people', doc.id);
      const relatives = doc.data.relatives as Record<string, string[]> | undefined;
      if (!relatives) continue;

      for (const [relType, relatedIds] of Object.entries(relatives)) {
        const type = singularize(relType);
        for (const relatedFirebaseId of relatedIds) {
          const relatedId = this.ids.get('people', relatedFirebaseId);
          if (!relatedId || personId === relatedId) continue;

          const key = `${personId}:${relatedId}:${type}`;
          if (seen.has(key)) continue;
          seen.add(key);

          rows.push({
            id: uuid(),
            person_id: personId,
            related_person_id: relatedId,
            relationship_type: type,
          });
        }
      }
    }

    const n = await batchInsert(this.supabase, 'person_relationships', rows);
    console.log(`  person_relationships: ${n}`);
  }

  // --------------------------------------------------------------------------
  // Step 18: Migrate info boxes
  // --------------------------------------------------------------------------

  async migrateInfoBoxes(): Promise<void> {
    console.log('Step 18: Migrating info boxes...');

    const rows: Record<string, any>[] = [];

    const processInfoDocs = (docs: SubcollectionDoc[], entityType: string, collection: string) => {
      for (const doc of docs) {
        const entityId = this.ids.get(collection, doc.parentId);
        if (!entityId) continue;

        rows.push({
          id: uuid(),
          type: INFO_TYPE_MAP[doc.data.type as number] || 'note',
          content: doc.data.content || '',
          entity_type: entityType,
          entity_id: entityId,
          owner_id: this.ids.get('users', doc.data.owner) || null,
          created_at: toTimestamptz(doc.data.created) || undefined,
          modified_at: toTimestamptz(doc.data.modified) || undefined,
        });
      }
    };

    processInfoDocs(this.peopleInfo, 'person', 'people');
    processInfoDocs(this.placesInfo, 'place', 'places');
    processInfoDocs(this.questsInfo, 'quest', 'quests');

    const n = await batchInsert(this.supabase, 'info_boxes', rows);
    console.log(`  info_boxes: ${n}`);
  }

  // --------------------------------------------------------------------------
  // Step 19: Migrate historic events
  // --------------------------------------------------------------------------

  async migrateHistoricEvents(): Promise<void> {
    console.log('Step 19: Migrating historic events...');

    const rows = this.timelinesEvents.map(doc => ({
      id: uuid(),
      timeline_id: this.ids.require('timelines', doc.parentId),
      content: doc.data.content || '',
      date: doc.data.date || null,
      type: doc.data.type != null ? String(doc.data.type) : null,
      owner_id: this.ids.get('users', doc.data.owner) || null,
      created_at: toTimestamptz(doc.data.created) || undefined,
      modified_at: toTimestamptz(doc.data.modified) || undefined,
    }));

    const n = await batchInsert(this.supabase, 'historic_events', rows);
    console.log(`  historic_events: ${n}`);
  }

  // --------------------------------------------------------------------------
  // Step 20: Migrate combat
  // --------------------------------------------------------------------------

  async migrateCombat(): Promise<void> {
    console.log('Step 20: Migrating combat...');

    if (this.combatFighters.length === 0) {
      console.log('  No combat data to migrate.');
      return;
    }

    // Create a single combat session
    const sessionId = uuid();
    await batchInsert(this.supabase, 'combat_sessions', [{
      id: sessionId,
      name: 'Active Combat',
      is_active: true,
    }]);
    console.log('  combat_sessions: 1');

    // Combatants
    const combatantRows: Record<string, any>[] = [];
    const stateRows: Record<string, any>[] = [];
    const combatantIdMap = new Map<string, string>(); // fighter firebase id -> combatant uuid

    for (const doc of this.combatFighters) {
      const combatantId = uuid();
      combatantIdMap.set(doc.id, combatantId);

      const personId = doc.data.person ? this.ids.get('people', doc.data.person) || null : null;

      combatantRows.push({
        id: combatantId,
        combat_session_id: sessionId,
        person_id: personId,
        name: personId ? null : (doc.data.name || 'Unknown Enemy'),
        initiative: doc.data.initiative ?? 0,
        active: doc.data.active ?? true,
      });

      // Combatant states
      if (doc.data.states && Array.isArray(doc.data.states)) {
        for (const state of doc.data.states) {
          stateRows.push({
            id: uuid(),
            combatant_id: combatantId,
            state: state.name,
          });
        }
      }
    }

    const n1 = await batchInsert(this.supabase, 'combatants', combatantRows);
    console.log(`  combatants: ${n1}`);

    if (stateRows.length > 0) {
      const n2 = await batchInsert(this.supabase, 'combatant_states', stateRows);
      console.log(`  combatant_states: ${n2}`);
    }
  }

  // --------------------------------------------------------------------------
  // Step 21: Migrate document_access
  // --------------------------------------------------------------------------

  async migrateDocumentAccess(): Promise<void> {
    console.log('Step 21: Migrating document_access...');

    const rows: Record<string, any>[] = [];
    const seen = new Set<string>();

    const processEntities = (
      docs: ExportDoc[],
      entityType: string,
      collection: string,
    ) => {
      for (const doc of docs) {
        const entityId = this.ids.get(collection, doc.id);
        if (!entityId) continue;

        const access: string[] = doc.data.access || [];
        const ownerFirebaseId: string = doc.data.owner || '';

        for (const userFirebaseId of access) {
          // Skip owners (they have access via owner_id)
          if (userFirebaseId === ownerFirebaseId) continue;
          // Skip GMs (they have access via RLS is_gm())
          if (this.gmFirebaseIds.has(userFirebaseId)) continue;

          const userId = this.ids.get('users', userFirebaseId);
          if (!userId) continue;

          const key = `${entityType}:${entityId}:${userId}`;
          if (seen.has(key)) continue;
          seen.add(key);

          rows.push({
            id: uuid(),
            entity_type: entityType,
            entity_id: entityId,
            user_id: userId,
          });
        }
      }
    };

    processEntities(this.people, 'person', 'people');
    processEntities(this.places, 'place', 'places');
    processEntities(this.quests, 'quest', 'quests');
    processEntities(this.projects, 'project', 'projects');
    processEntities(this.achievements, 'achievement', 'achievements');
    processEntities(this.inventory, 'inventory', 'inventory');
    processEntities(this.notes, 'note', 'notes');
    processEntities(this.rolls, 'roll', 'rolls');
    processEntities(this.flows, 'flow', 'flows');

    const n = await batchInsert(this.supabase, 'document_access', rows);
    console.log(`  document_access: ${n}`);
  }

  // --------------------------------------------------------------------------
  // Run all steps
  // --------------------------------------------------------------------------

  async run(): Promise<void> {
    console.log('='.repeat(80));
    console.log('Firebase to Supabase Data Migration');
    console.log('='.repeat(80));
    console.log(`Tenant: ${this.tenant}\n`);

    this.loadData();

    await this.seedRulesConfig();
    await this.migrateUsers();
    await this.migrateRules();
    await this.migrateTimelines();
    await this.migratePlaces();
    await this.migratePeople();
    await this.migrateQuests();
    await this.updateHierarchicalFKs();
    await this.migrateCampaign();
    await this.migrateProjects();
    await this.migrateAchievements();
    await this.migrateInventory();
    await this.migrateNotes();
    await this.migrateRolls();
    await this.migrateFlows();
    await this.migratePersonJunctions();
    await this.migratePersonRelationships();
    await this.migrateInfoBoxes();
    await this.migrateHistoricEvents();
    await this.migrateCombat();
    await this.migrateDocumentAccess();

    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`\nUser credentials saved to: ${path.join(EXPORT_DIR, '_user_credentials.json')}`);
    console.log('\nNext step: npm run migrate:verify');
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const { url, serviceRoleKey } = getSupabaseCredentials();
  const tenant = readTenant();

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const migration = new Migration(supabase, tenant);
  await migration.run();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\nMigration failed:', error.message || error);
    process.exit(1);
  });
