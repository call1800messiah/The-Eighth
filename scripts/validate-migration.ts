/**
 * Post-Migration Validation Script
 *
 * Validates data integrity in Supabase after migration from Firebase.
 * Checks row counts, referential integrity, access control correctness,
 * hierarchical data, and storage files.
 *
 * Usage:
 *   npx tsx scripts/validate-migration.ts
 *   npm run migrate:verify
 *
 * Requirements:
 *   - Local Supabase running (npx supabase start)
 *   - Migration completed (npm run migrate:transform)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

interface CheckResult {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

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
  } catch { /* fall through */ }
  throw new Error('Cannot determine Supabase credentials.');
}

async function countRows(supabase: SupabaseClient, table: string): Promise<number> {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`Count ${table}: ${error.message}`);
  return count ?? 0;
}

// ============================================================================
// VALIDATION CHECKS
// ============================================================================

class MigrationValidator {
  private supabase: SupabaseClient;
  private results: CheckResult[] = [];
  private exportDir = path.join(process.cwd(), 'data', 'export');

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  private pass(id: string, name: string, message: string) {
    this.results.push({ id, name, status: 'pass', message });
  }

  private fail(id: string, name: string, message: string, details?: string) {
    this.results.push({ id, name, status: 'fail', message, details });
  }

  private warn(id: string, name: string, message: string, details?: string) {
    this.results.push({ id, name, status: 'warn', message, details });
  }

  // --------------------------------------------------------------------------
  // T-POST-001: Row Count Validation
  // --------------------------------------------------------------------------

  async checkRowCounts(): Promise<void> {
    console.log('T-POST-001: Row count validation...');

    const exportStats = JSON.parse(
      fs.readFileSync(path.join(this.exportDir, '_export_stats.json'), 'utf8')
    );

    // Map export collection names to PG table names + expected counts
    const expectations: { table: string; exportCollection: string; exact?: boolean }[] = [
      { table: 'users', exportCollection: 'users', exact: true },
      { table: 'people', exportCollection: 'people', exact: true },
      { table: 'places', exportCollection: 'places', exact: true },
      { table: 'quests', exportCollection: 'quests', exact: true },
      { table: 'projects', exportCollection: 'projects', exact: true },
      { table: 'achievements', exportCollection: 'achievements', exact: true },
      { table: 'inventory', exportCollection: 'inventory', exact: true },
      { table: 'notes', exportCollection: 'notes', exact: true },
      { table: 'rolls', exportCollection: 'rolls', exact: true },
      { table: 'flows', exportCollection: 'flows', exact: true },
      { table: 'rules', exportCollection: 'rules', exact: true },
      { table: 'campaign', exportCollection: 'campaign', exact: true },
      { table: 'timelines', exportCollection: 'timelines', exact: true },
    ];

    const statMap = new Map<string, number>();
    for (const stat of exportStats.stats) {
      statMap.set(stat.collection, stat.count);
      if (stat.subcollections) {
        for (const sub of stat.subcollections) {
          statMap.set(`${stat.collection}_${sub.name}`, sub.count);
        }
      }
    }

    let allMatch = true;
    const details: string[] = [];

    for (const { table, exportCollection, exact } of expectations) {
      const expected = statMap.get(exportCollection) ?? 0;
      const actual = await countRows(this.supabase, table);
      const match = exact ? actual === expected : actual >= expected;

      details.push(`  ${table}: ${actual}/${expected} ${match ? '✓' : '✗'}`);
      if (!match) allMatch = false;
    }

    // Check subcollection counts
    const infoCount = await countRows(this.supabase, 'info_boxes');
    const expectedInfo = (statMap.get('people_info') ?? 0) +
      (statMap.get('places_info') ?? 0) +
      (statMap.get('quests_info') ?? 0);
    details.push(`  info_boxes: ${infoCount}/${expectedInfo} ${infoCount === expectedInfo ? '✓' : '✗'}`);
    if (infoCount !== expectedInfo) allMatch = false;

    const eventCount = await countRows(this.supabase, 'historic_events');
    const expectedEvents = statMap.get('timelines_events') ?? 0;
    details.push(`  historic_events: ${eventCount}/${expectedEvents} ${eventCount === expectedEvents ? '✓' : '✗'}`);
    if (eventCount !== expectedEvents) allMatch = false;

    const fighterCount = await countRows(this.supabase, 'combatants');
    const expectedFighters = statMap.get('combat_fighters') ?? 0;
    details.push(`  combatants: ${fighterCount}/${expectedFighters} ${fighterCount === expectedFighters ? '✓' : '✗'}`);
    if (fighterCount !== expectedFighters) allMatch = false;

    if (allMatch) {
      this.pass('T-POST-001', 'Row counts', `All row counts match export (${details.length} tables)`);
    } else {
      this.fail('T-POST-001', 'Row counts', 'Some row counts do not match', details.join('\n'));
    }
    console.log(details.join('\n'));
  }

  // --------------------------------------------------------------------------
  // T-POST-002/003/004: Foreign Key Integrity (hierarchical)
  // --------------------------------------------------------------------------

  async checkForeignKeyIntegrity(): Promise<void> {
    console.log('T-POST-002/003/004: Foreign key integrity...');

    // People with location_id → places
    const { data: peopleWithLoc } = await this.supabase
      .from('people').select('id, name, location_id').not('location_id', 'is', null);
    const { data: allPlaces } = await this.supabase.from('places').select('id');
    const placeIds = new Set(allPlaces?.map(p => p.id) || []);

    const orphanedLocations = (peopleWithLoc || []).filter(p => !placeIds.has(p.location_id));
    if (orphanedLocations.length === 0) {
      this.pass('T-POST-002', 'People → Places FK', `${(peopleWithLoc || []).length} location references valid`);
    } else {
      this.fail('T-POST-002', 'People → Places FK',
        `${orphanedLocations.length} orphaned location references`,
        orphanedLocations.map(p => `  ${p.name}: ${p.location_id}`).join('\n'));
    }

    // Places with parent_id → places
    const { data: placesWithParent } = await this.supabase
      .from('places').select('id, name, parent_id').not('parent_id', 'is', null);
    const orphanedPlaceParents = (placesWithParent || []).filter(p => !placeIds.has(p.parent_id));
    if (orphanedPlaceParents.length === 0) {
      this.pass('T-POST-003', 'Places → Places FK', `${(placesWithParent || []).length} parent references valid`);
    } else {
      this.fail('T-POST-003', 'Places → Places FK',
        `${orphanedPlaceParents.length} orphaned parent references`);
    }

    // Quests with parent_id → quests
    const { data: allQuests } = await this.supabase.from('quests').select('id');
    const questIds = new Set(allQuests?.map(q => q.id) || []);
    const { data: questsWithParent } = await this.supabase
      .from('quests').select('id, name, parent_id').not('parent_id', 'is', null);
    const orphanedQuestParents = (questsWithParent || []).filter(q => !questIds.has(q.parent_id));
    if (orphanedQuestParents.length === 0) {
      this.pass('T-POST-004', 'Quests → Quests FK', `${(questsWithParent || []).length} parent references valid`);
    } else {
      this.fail('T-POST-004', 'Quests → Quests FK',
        `${orphanedQuestParents.length} orphaned parent references`);
    }
  }

  // --------------------------------------------------------------------------
  // T-POST-005/006: Junction Table Integrity
  // --------------------------------------------------------------------------

  async checkJunctionIntegrity(): Promise<void> {
    console.log('T-POST-005/006: Junction table integrity...');

    const { data: allPeople } = await this.supabase.from('people').select('id');
    const { data: allRules } = await this.supabase.from('rules').select('id');
    const personIds = new Set(allPeople?.map(p => p.id) || []);
    const ruleIds = new Set(allRules?.map(r => r.id) || []);

    const junctionTables = [
      'person_advantages', 'person_disadvantages', 'person_feats',
      'person_skills', 'person_spells', 'person_cantrips', 'person_liturgies',
    ];

    let allValid = true;
    const details: string[] = [];

    for (const table of junctionTables) {
      const { data: rows } = await this.supabase.from(table).select('person_id, rule_id');
      const orphanedPerson = (rows || []).filter(r => !personIds.has(r.person_id));
      const orphanedRule = (rows || []).filter(r => !ruleIds.has(r.rule_id));

      if (orphanedPerson.length > 0 || orphanedRule.length > 0) {
        allValid = false;
        details.push(`  ${table}: ${orphanedPerson.length} orphaned person, ${orphanedRule.length} orphaned rule`);
      } else {
        details.push(`  ${table}: ${(rows || []).length} rows ✓`);
      }
    }

    if (allValid) {
      this.pass('T-POST-005', 'Junction table integrity', 'All junction references valid');
    } else {
      this.fail('T-POST-005', 'Junction table integrity', 'Orphaned junction references found', details.join('\n'));
    }
    console.log(details.join('\n'));
  }

  // --------------------------------------------------------------------------
  // T-POST-007/008: Document Access - No Owners/GMs
  // --------------------------------------------------------------------------

  async checkDocumentAccess(): Promise<void> {
    console.log('T-POST-007/008: Document access validation...');

    // Get GM user IDs
    const { data: gmRoles } = await this.supabase
      .from('user_roles').select('user_id').eq('role', 'gm');
    const gmUserIds = new Set(gmRoles?.map(r => r.user_id) || []);

    // Check no GMs in document_access
    const { data: allAccess } = await this.supabase.from('document_access').select('user_id, entity_type, entity_id');
    const gmInAccess = (allAccess || []).filter(a => gmUserIds.has(a.user_id));

    if (gmInAccess.length === 0) {
      this.pass('T-POST-008', 'No GMs in document_access', `${(allAccess || []).length} entries, 0 GM entries`);
    } else {
      this.fail('T-POST-008', 'No GMs in document_access', `${gmInAccess.length} GM entries found in document_access`);
    }

    // Check no owners in document_access
    // We need to check each entity type's owner_id
    const entityTables: Record<string, string> = {
      person: 'people', place: 'places', quest: 'quests', project: 'projects',
      achievement: 'achievements', inventory: 'inventory', note: 'notes',
      roll: 'rolls', flow: 'flows',
    };

    let ownerCount = 0;
    for (const [entityType, table] of Object.entries(entityTables)) {
      const { data: entities } = await this.supabase.from(table).select('id, owner_id');
      const ownerMap = new Map((entities || []).map(e => [e.id, e.owner_id]));

      const accessForType = (allAccess || []).filter(a => a.entity_type === entityType);
      for (const entry of accessForType) {
        const ownerId = ownerMap.get(entry.entity_id);
        if (ownerId && ownerId === entry.user_id) {
          ownerCount++;
        }
      }
    }

    if (ownerCount === 0) {
      this.pass('T-POST-007', 'No owners in document_access', 'No owner entries found in document_access');
    } else {
      this.fail('T-POST-007', 'No owners in document_access', `${ownerCount} owner entries found in document_access`);
    }
  }

  // --------------------------------------------------------------------------
  // T-POST-009/010: Hierarchical Depth (no circular refs)
  // --------------------------------------------------------------------------

  async checkHierarchicalDepth(): Promise<void> {
    console.log('T-POST-009/010: Hierarchical depth validation...');

    const checkHierarchy = async (table: string, checkId: string): Promise<void> => {
      const { data: rows } = await this.supabase.from(table).select('id, name, parent_id');
      const parentMap = new Map((rows || []).map(r => [r.id, r.parent_id]));

      let maxDepth = 0;
      let hasCycles = false;
      const cycleNodes: string[] = [];

      for (const row of rows || []) {
        const visited = new Set<string>();
        let current: string | null = row.id;
        let depth = 0;

        while (current) {
          if (visited.has(current)) {
            hasCycles = true;
            cycleNodes.push(row.name || row.id);
            break;
          }
          visited.add(current);
          current = parentMap.get(current) || null;
          depth++;
        }
        maxDepth = Math.max(maxDepth, depth);
      }

      if (hasCycles) {
        this.fail(checkId, `${table} hierarchy`, `Circular references found`, cycleNodes.join(', '));
      } else if (maxDepth > 10) {
        this.warn(checkId, `${table} hierarchy`, `Max depth ${maxDepth} (suspiciously deep)`);
      } else {
        this.pass(checkId, `${table} hierarchy`, `Max depth ${maxDepth}, no cycles (${(rows || []).length} rows)`);
      }
    };

    await checkHierarchy('places', 'T-POST-009');
    await checkHierarchy('quests', 'T-POST-010');
  }

  // --------------------------------------------------------------------------
  // T-POST-011: Person Relationships
  // --------------------------------------------------------------------------

  async checkPersonRelationships(): Promise<void> {
    console.log('T-POST-011: Person relationships...');

    const { data: rels } = await this.supabase.from('person_relationships').select('person_id, related_person_id, relationship_type');
    const { data: allPeople } = await this.supabase.from('people').select('id');
    const personIds = new Set(allPeople?.map(p => p.id) || []);

    const orphaned = (rels || []).filter(r => !personIds.has(r.person_id) || !personIds.has(r.related_person_id));
    const selfRef = (rels || []).filter(r => r.person_id === r.related_person_id);

    if (orphaned.length === 0 && selfRef.length === 0) {
      this.pass('T-POST-011', 'Person relationships', `${(rels || []).length} relationships valid`);
    } else {
      const issues: string[] = [];
      if (orphaned.length > 0) issues.push(`${orphaned.length} orphaned references`);
      if (selfRef.length > 0) issues.push(`${selfRef.length} self-references`);
      this.fail('T-POST-011', 'Person relationships', issues.join(', '));
    }
  }

  // --------------------------------------------------------------------------
  // T-POST-012/013: Storage Files
  // --------------------------------------------------------------------------

  async checkStorageFiles(): Promise<void> {
    console.log('T-POST-012/013: Storage files...');

    // Check if storage migration results exist
    const storagePath = path.join(this.exportDir, '_storage_migration.json');
    if (!fs.existsSync(storagePath)) {
      this.warn('T-POST-012', 'Storage files migrated', 'Storage migration results not found (skipped)');
      this.warn('T-POST-013', 'Audio files present', 'Storage migration results not found (skipped)');
      return;
    }

    const storageResults = JSON.parse(fs.readFileSync(storagePath, 'utf8'));

    if (storageResults.failed === 0 && storageResults.uploaded === storageResults.firebaseFiles) {
      this.pass('T-POST-012', 'Storage files migrated',
        `${storageResults.uploaded}/${storageResults.firebaseFiles} files migrated`);
    } else {
      this.fail('T-POST-012', 'Storage files migrated',
        `${storageResults.failed} files failed, ${storageResults.uploaded}/${storageResults.firebaseFiles} migrated`);
    }

    // Check audio files in Supabase Storage
    const { data: audioFiles, error } = await this.supabase.storage
      .from('the-eighth').list('audio', { limit: 100 });

    const audioCount = audioFiles?.filter(f => f.id !== null).length || 0;
    if (audioCount > 0) {
      this.pass('T-POST-013', 'Audio files present', `${audioCount} audio files in storage`);
    } else {
      this.fail('T-POST-013', 'Audio files present', 'No audio files found in storage');
    }
  }

  // --------------------------------------------------------------------------
  // T-POST-014: Combat Data
  // --------------------------------------------------------------------------

  async checkCombatData(): Promise<void> {
    console.log('T-POST-014: Combat data...');

    const sessionCount = await countRows(this.supabase, 'combat_sessions');
    const combatantCount = await countRows(this.supabase, 'combatants');

    // Check all combatants reference valid sessions
    const { data: combatants } = await this.supabase
      .from('combatants').select('id, person_id, name, combat_session_id');
    const { data: sessions } = await this.supabase.from('combat_sessions').select('id');
    const sessionIds = new Set(sessions?.map(s => s.id) || []);

    const orphanedSession = (combatants || []).filter(c => !sessionIds.has(c.combat_session_id));

    // Check person references
    const { data: allPeople } = await this.supabase.from('people').select('id');
    const personIds = new Set(allPeople?.map(p => p.id) || []);
    const combatantsWithPerson = (combatants || []).filter(c => c.person_id);
    const orphanedPerson = combatantsWithPerson.filter(c => !personIds.has(c.person_id));

    // Check constraint: person_id OR name must be set
    const invalidCombatants = (combatants || []).filter(c => !c.person_id && !c.name);

    const issues: string[] = [];
    if (orphanedSession.length > 0) issues.push(`${orphanedSession.length} orphaned session refs`);
    if (orphanedPerson.length > 0) issues.push(`${orphanedPerson.length} orphaned person refs`);
    if (invalidCombatants.length > 0) issues.push(`${invalidCombatants.length} without person_id or name`);

    if (issues.length === 0) {
      this.pass('T-POST-014', 'Combat data',
        `${sessionCount} sessions, ${combatantCount} combatants - all valid`);
    } else {
      this.fail('T-POST-014', 'Combat data', issues.join(', '));
    }
  }

  // --------------------------------------------------------------------------
  // T-POST-015: Rules Migration
  // --------------------------------------------------------------------------

  async checkRulesMigration(): Promise<void> {
    console.log('T-POST-015: Rules migration...');

    const { data: rules } = await this.supabase.from('rules').select('id, category, name');
    const categories = new Map<string, number>();
    for (const rule of rules || []) {
      categories.set(rule.category, (categories.get(rule.category) || 0) + 1);
    }

    const details = [...categories.entries()]
      .map(([cat, count]) => `  ${cat}: ${count}`)
      .join('\n');

    // Check config tables
    const configCount = await countRows(this.supabase, 'rules_config');
    const attrCount = await countRows(this.supabase, 'allowed_attributes');
    const hitLocCount = await countRows(this.supabase, 'hit_locations');
    const stateCount = await countRows(this.supabase, 'combat_states');

    const allPresent = configCount > 0 && attrCount > 0 && hitLocCount > 0 && stateCount > 0;

    if (allPresent && (rules || []).length > 0) {
      this.pass('T-POST-015', 'Rules migration',
        `${(rules || []).length} rules, config: ${configCount} config, ${attrCount} attrs, ${hitLocCount} hit locs, ${stateCount} states`);
    } else {
      this.fail('T-POST-015', 'Rules migration',
        `Missing data: rules=${(rules || []).length}, config=${configCount}, attrs=${attrCount}`);
    }
    console.log(details);
  }

  // --------------------------------------------------------------------------
  // Run all checks
  // --------------------------------------------------------------------------

  async run(): Promise<void> {
    console.log('='.repeat(80));
    console.log('Post-Migration Validation');
    console.log('='.repeat(80));
    console.log('');

    await this.checkRowCounts();
    console.log('');
    await this.checkForeignKeyIntegrity();
    console.log('');
    await this.checkJunctionIntegrity();
    console.log('');
    await this.checkDocumentAccess();
    console.log('');
    await this.checkHierarchicalDepth();
    console.log('');
    await this.checkPersonRelationships();
    console.log('');
    await this.checkStorageFiles();
    console.log('');
    await this.checkCombatData();
    console.log('');
    await this.checkRulesMigration();

    // Print summary
    console.log('');
    console.log('='.repeat(80));
    console.log('VALIDATION RESULTS');
    console.log('='.repeat(80));
    console.log('');

    const passes = this.results.filter(r => r.status === 'pass');
    const fails = this.results.filter(r => r.status === 'fail');
    const warns = this.results.filter(r => r.status === 'warn');

    for (const r of this.results) {
      const icon = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⚠️';
      console.log(`${icon} ${r.id}: ${r.name} - ${r.message}`);
      if (r.details && r.status !== 'pass') {
        console.log(r.details);
      }
    }

    console.log('');
    console.log(`${passes.length} passed, ${fails.length} failed, ${warns.length} warnings`);
    console.log('');

    if (fails.length > 0) {
      console.log('⛔ VALIDATION FAILED: Fix errors before proceeding.');
      process.exitCode = 1;
    } else if (warns.length > 0) {
      console.log('⚠️  VALIDATION PASSED with warnings. Review before proceeding.');
    } else {
      console.log('✅ ALL CHECKS PASSED. Migration verified successfully.');
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const { url, serviceRoleKey } = getSupabaseCredentials();
  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const validator = new MigrationValidator(supabase);
  await validator.run();
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((error) => {
    console.error('Validation failed:', error.message || error);
    process.exit(1);
  });
