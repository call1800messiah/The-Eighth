import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Reads and writes campaign entities as the assistant user. Every query goes
 * through PostgREST with that user's session, so RLS (migration 013) is what
 * actually enforces "drafts only"; the checks here exist to give Claude a
 * useful message instead of a bare policy violation.
 */

export const ENTITY_TYPES = ['person', 'place', 'quest', 'note'] as const;
export type EntityType = typeof ENTITY_TYPES[number];
export type DraftType = Exclude<EntityType, 'note'>;

const TABLES: Record<EntityType, string> = {
  person: 'people',
  place: 'places',
  quest: 'quests',
  note: 'notes',
};

const PATHS: Record<EntityType, string> = {
  person: '/people/',
  place: '/places/',
  quest: '/quests/',
  note: '/notes?note=',
};

/** Info box kinds as stored (info_type enum) and how the app labels them. */
export const INFO_TYPES = {
  appearance: 'Erscheinungsbild',
  background: 'Hintergrund',
  character: 'Charakter',
  goals: 'Ziele',
  reward: 'Belohnung',
  note: 'Notizen',
} as const;
export type InfoType = keyof typeof INFO_TYPES;
export type Infos = Partial<Record<InfoType, string>>;

export const PLACE_TYPES = {
  barony: 'Baronie', castle: 'Burg', city: 'Stadt', forest: 'Wald', fortifiedYard: 'Wehrhof',
  hamlet: 'Weiler', island: 'Insel', landmass: 'Landmasse', ocean: 'Gewässer', place: 'Ort',
  principality: 'Fürstentum', ship: 'Schiff', shire: 'Grafschaft', state: 'Staat', town: 'Dorf',
} as const;

export const QUEST_TYPES = {
  main: 'Hauptqueste', scene: 'Szene', sub: 'Subquest', task: 'Aufgabe',
} as const;

/** Relations link_entities understands, and what they write. */
export const RELATIONS = {
  located_in: 'person → place: where the person can usually be found',
  part_of: 'place → place or quest → quest: the parent (region, castle, main quest, …)',
  has_parent: 'person → person: the second person is a parent of the first',
  has_child: 'person → person: the second person is a child of the first',
  has_partner: 'person → person',
  has_sibling: 'person → person',
} as const;
export type Relation = keyof typeof RELATIONS;

const RELATIONSHIP_TYPES: Partial<Record<Relation, string>> = {
  has_parent: 'parents',
  has_child: 'children',
  has_partner: 'partners',
  has_sibling: 'siblings',
};

export interface PersonFields {
  name?: string;
  title?: string | null;
  race?: string | null;
  culture?: string | null;
  profession?: string | null;
  birthday?: string | null;
  birthyear?: number | null;
  deathday?: string | null;
  height?: number | null;
}

export interface PlaceFields {
  name?: string;
  type?: keyof typeof PLACE_TYPES;
  inhabitants?: string | null;
}

export interface QuestFields {
  name?: string;
  type?: keyof typeof QUEST_TYPES;
  description?: string | null;
}

export type DraftFields = PersonFields | PlaceFields | QuestFields;

export interface SearchHit {
  type: EntityType;
  id: string;
  name: string;
  status: 'draft' | 'published';
  detail?: string;
  /** Ready to paste into a text field. */
  mention: string;
}

/** A failure Claude can act on; becomes an isError tool result. */
export class ToolError extends Error {}

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const MENTION = new RegExp(`\\]\\(mention:(person|place|quest|note)\\/(${UUID})\\)`, 'g');

export function mentionLink(type: EntityType, id: string, name: string): string {
  return `[${name.replace(/\s+/g, ' ').trim().replace(/([\\[\]])/g, '\\$1')}](mention:${type}/${id})`;
}

/** Escapes LIKE wildcards so a search for "50%" means that. */
function likePattern(text: string, anywhere = true): string {
  const escaped = text.replace(/[\\%_]/g, c => `\\${c}`);
  return anywhere ? `%${escaped}%` : escaped;
}

function snippet(text: string | null | undefined, length = 120): string | undefined {
  if (!text) return undefined;
  const plain = text
    .replace(/\[((?:\\.|[^\]\\])*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > length ? `${plain.slice(0, length - 1)}…` : plain;
}

function failure(error: { code?: string; message: string }, action: string): never {
  if (error.code === '42501') {
    throw new ToolError(`${action}: not allowed. Claude can only create drafts and change its own drafts that a GM has not published yet.`);
  }
  if (error.code === '23503') {
    throw new ToolError(`${action}: a referenced entity does not exist.`);
  }
  if (error.code === '22P02') {
    throw new ToolError(`${action}: an id is not a valid UUID.`);
  }
  throw new Error(`${action}: ${error.message}`);
}


export class EntityRepository {
  private userId: string | null = null;

  constructor(
    private db: () => Promise<SupabaseClient>,
    /** Public app origin, for links the GM can open. */
    private appUrl: URL,
  ) {}

  url(type: EntityType, id: string): string {
    return new URL(`${PATHS[type]}${id}`, this.appUrl).href;
  }

  get reviewUrl(): string {
    return new URL('/drafts', this.appUrl).href;
  }

  private async me(): Promise<string> {
    if (!this.userId) {
      const { data, error } = await (await this.db()).auth.getUser();
      if (error || !data.user) throw new Error('No assistant session');
      this.userId = data.user.id;
    }
    return this.userId;
  }

  // ── Reading ────────────────────────────────────────────────────────────

  async search(query: string, types: readonly EntityType[] = ENTITY_TYPES, limit = 10): Promise<SearchHit[]> {
    const text = query.trim();
    if (!text) throw new ToolError('Search text is empty.');
    let hits = await this.searchFor(text, types, limit);
    // "Alrik von Gareth" should still find "Alrik": fall back to single words.
    if (hits.length === 0) {
      const words = text.split(/\s+/).filter(word => word.length >= 3);
      if (words.length > 1) {
        const all = (await Promise.all(words.map(word => this.searchFor(word, types, limit)))).flat();
        hits = [...new Map(all.map(hit => [`${hit.type}/${hit.id}`, hit])).values()];
      }
    }
    return hits.slice(0, limit * types.length);
  }

  private async searchFor(text: string, types: readonly EntityType[], limit: number): Promise<SearchHit[]> {
    const db = await this.db();
    const pattern = likePattern(text);
    const results = await Promise.all(types.map(async (type): Promise<SearchHit[]> => {
      switch (type) {
        case 'person': {
          const { data, error } = await db.from('people').select('id, name, title, profession, status').ilike('name', pattern).order('name').limit(limit);
          if (error) failure(error, 'Searching people');
          return (data ?? []).map(row => ({
            type, id: row.id, name: row.name, status: row.status,
            detail: [row.title, row.profession].filter(Boolean).join(', ') || undefined,
            mention: mentionLink(type, row.id, row.name),
          }));
        }
        case 'place': {
          const { data, error } = await db.from('places').select('id, name, type, status').ilike('name', pattern).order('name').limit(limit);
          if (error) failure(error, 'Searching places');
          return (data ?? []).map(row => ({
            type, id: row.id, name: row.name, status: row.status,
            detail: PLACE_TYPES[row.type as keyof typeof PLACE_TYPES] ?? row.type,
            mention: mentionLink(type, row.id, row.name),
          }));
        }
        case 'quest': {
          const { data, error } = await db.from('quests').select('id, name, type, completed, status').ilike('name', pattern).order('name').limit(limit);
          if (error) failure(error, 'Searching quests');
          return (data ?? []).map(row => ({
            type, id: row.id, name: row.name, status: row.status,
            detail: `${QUEST_TYPES[row.type as keyof typeof QUEST_TYPES] ?? row.type}${row.completed ? ', abgeschlossen' : ''}`,
            mention: mentionLink(type, row.id, row.name),
          }));
        }
        case 'note': {
          const [byTitle, byContent] = await Promise.all([
            db.from('notes').select('id, title, content, category').ilike('title', pattern).limit(limit),
            db.from('notes').select('id, title, content, category').ilike('content', pattern).limit(limit),
          ]);
          if (byTitle.error) failure(byTitle.error, 'Searching notes');
          if (byContent.error) failure(byContent.error, 'Searching notes');
          const rows = [...new Map([...(byTitle.data ?? []), ...(byContent.data ?? [])].map(row => [row.id, row])).values()];
          return rows.slice(0, limit).map(row => {
            const name = row.title || snippet(row.content, 40) || 'Notiz';
            return {
              type, id: row.id, name, status: 'published' as const,
              detail: [row.category, snippet(row.content)].filter(Boolean).join(': ') || undefined,
              mention: mentionLink(type, row.id, name),
            };
          });
        }
      }
    }));
    return results.flat();
  }

  async get(type: EntityType, id: string): Promise<Record<string, unknown>> {
    const db = await this.db();
    const { data: row, error } = await db.from(TABLES[type]).select('*').eq('id', id).maybeSingle();
    if (error) failure(error, `Reading ${type}`);
    if (!row) throw new ToolError(`No ${type} with id ${id}.`);

    const result: Record<string, unknown> = { type, ...pick(row, FIELDS[type]), url: this.url(type, id) };
    if (type !== 'note') {
      result['mention'] = mentionLink(type, id, row.name);
      result['infos'] = await this.infos(type, id);
    } else {
      result['mention'] = mentionLink(type, id, row.title || snippet(row.content, 40) || 'Notiz');
    }

    const nameOf = async (table: string, refId: string | null) => {
      if (!refId) return null;
      const { data } = await db.from(table).select('id, name').eq('id', refId).maybeSingle();
      return data ? { id: data.id, name: data.name } : { id: refId, name: null };
    };

    if (type === 'person') {
      result['location'] = await nameOf('places', row.location_id);
      const { data: relationships } = await db.from('person_relationships')
        .select('relationship_type, related:people!person_relationships_related_person_id_fkey(id, name)')
        .eq('person_id', id);
      result['relationships'] = (relationships ?? []).map((rel: any) => ({ type: rel.relationship_type, ...rel.related }));
    }
    if (type === 'place') {
      result['partOf'] = await nameOf('places', row.parent_id);
      const [{ data: children }, { data: residents }] = await Promise.all([
        db.from('places').select('id, name').eq('parent_id', id).order('name'),
        db.from('people').select('id, name').eq('location_id', id).order('name'),
      ]);
      result['contains'] = children ?? [];
      result['people'] = residents ?? [];
    }
    if (type === 'quest') {
      result['partOf'] = await nameOf('quests', row.parent_id);
      const { data: subquests } = await db.from('quests').select('id, name, completed').eq('parent_id', id).order('name');
      result['subquests'] = subquests ?? [];
    }
    return result;
  }

  private async infos(type: DraftType, id: string): Promise<Record<string, string>> {
    const { data, error } = await (await this.db()).from('info_boxes')
      .select('type, content').eq('entity_type', type).eq('entity_id', id).order('created_at');
    if (error) failure(error, 'Reading info boxes');
    const infos: Record<string, string> = {};
    for (const box of data ?? []) {
      infos[box.type] = infos[box.type] ? `${infos[box.type]}\n\n${box.content}` : box.content;
    }
    return infos;
  }

  /** Mentions pointing at entities that do not exist (typos, invented ids). */
  async unknownMentions(texts: (string | null | undefined)[]): Promise<string[]> {
    const refs = new Map<string, { type: EntityType; id: string }>();
    for (const text of texts) {
      for (const match of (text ?? '').matchAll(MENTION)) {
        refs.set(`${match[1]}/${match[2].toLowerCase()}`, { type: match[1] as EntityType, id: match[2].toLowerCase() });
      }
    }
    const db = await this.db();
    const unknown: string[] = [];
    for (const type of ENTITY_TYPES) {
      const ids = [...refs.values()].filter(ref => ref.type === type).map(ref => ref.id);
      if (ids.length === 0) continue;
      const { data, error } = await db.from(TABLES[type]).select('id').in('id', ids);
      if (error) failure(error, 'Checking mentions');
      const found = new Set((data ?? []).map(row => row.id));
      unknown.push(...ids.filter(id => !found.has(id)).map(id => `${type}/${id}`));
    }
    return unknown;
  }

  // ── Writing drafts ─────────────────────────────────────────────────────

  /** Same name, case-insensitive: likely the same thing. */
  async sameName(type: DraftType, name: string): Promise<SearchHit[]> {
    const { data, error } = await (await this.db()).from(TABLES[type])
      .select('id, name, status').ilike('name', likePattern(name.trim(), false));
    if (error) failure(error, 'Checking for duplicates');
    return (data ?? []).map(row => ({
      type, id: row.id, name: row.name, status: row.status, mention: mentionLink(type, row.id, row.name),
    }));
  }

  async createDraft(type: DraftType, fields: DraftFields & { name: string }, infos: Infos = {}): Promise<{ id: string }> {
    const db = await this.db();
    const owner = await this.me();
    const row: Record<string, unknown> = { ...clean(fields), status: 'draft', owner_id: owner };
    if (type === 'person') row['pc'] = false;
    if (type === 'quest') row['completed'] = false;
    const { data, error } = await db.from(TABLES[type]).insert(row).select('id').single();
    if (error) failure(error, `Creating the ${type}`);
    await this.writeInfos(type, data.id, infos);
    return { id: data.id };
  }

  async requireOwnDraft(type: DraftType, id: string): Promise<Record<string, any>> {
    const { data, error } = await (await this.db()).from(TABLES[type]).select('*').eq('id', id).maybeSingle();
    if (error) failure(error, `Reading ${type}`);
    if (!data) throw new ToolError(`No ${type} with id ${id}.`);
    if (data.status !== 'draft' || data.owner_id !== await this.me()) {
      throw new ToolError(`${data.name} is not one of Claude's drafts (it is ${data.status === 'draft' ? 'someone else\'s draft' : 'published'}), so it cannot be changed here. Suggest the change to the GM instead.`);
    }
    return data;
  }

  async updateDraft(type: DraftType, id: string, fields: DraftFields, infos: Infos = {}): Promise<void> {
    await this.requireOwnDraft(type, id);
    const changes = clean(fields);
    if (Object.keys(changes).length > 0) {
      const { error } = await (await this.db()).from(TABLES[type]).update(changes).eq('id', id);
      if (error) failure(error, `Updating the ${type}`);
    }
    await this.writeInfos(type, id, infos);
  }

  /** One info box per kind; an empty string removes it. */
  private async writeInfos(type: DraftType, id: string, infos: Infos): Promise<void> {
    const db = await this.db();
    const owner = await this.me();
    for (const [kind, content] of Object.entries(infos) as [InfoType, string | undefined][]) {
      if (content === undefined) continue;
      const { error: deleteError } = await db.from('info_boxes').delete()
        .eq('entity_type', type).eq('entity_id', id).eq('type', kind);
      if (deleteError) failure(deleteError, `Replacing ${kind}`);
      if (content.trim() === '') continue;
      const { error } = await db.from('info_boxes').insert({
        type: kind, content: content.trim(), entity_type: type, entity_id: id, owner_id: owner,
      });
      if (error) failure(error, `Writing ${kind}`);
    }
  }

  async link(
    from: { type: DraftType; id: string },
    relation: Relation,
    to: { type: DraftType; id: string },
    remove = false,
  ): Promise<string> {
    const expected: Record<Relation, [DraftType, DraftType][]> = {
      located_in: [['person', 'place']],
      part_of: [['place', 'place'], ['quest', 'quest']],
      has_parent: [['person', 'person']],
      has_child: [['person', 'person']],
      has_partner: [['person', 'person']],
      has_sibling: [['person', 'person']],
    };
    if (!expected[relation].some(([a, b]) => a === from.type && b === to.type)) {
      throw new ToolError(`"${relation}" links ${expected[relation].map(([a, b]) => `${a} → ${b}`).join(' or ')}, not ${from.type} → ${to.type}.`);
    }
    if (from.id === to.id) throw new ToolError('An entity cannot be linked to itself.');

    const source = await this.requireOwnDraft(from.type, from.id);
    const db = await this.db();
    const { data: target, error: targetError } = await db.from(TABLES[to.type]).select('id, name').eq('id', to.id).maybeSingle();
    if (targetError) failure(targetError, 'Reading the link target');
    if (!target) throw new ToolError(`No ${to.type} with id ${to.id}.`);

    const relationshipType = RELATIONSHIP_TYPES[relation];
    if (relationshipType) {
      if (remove) {
        const { error } = await db.from('person_relationships').delete()
          .eq('person_id', from.id).eq('related_person_id', to.id).eq('relationship_type', relationshipType);
        if (error) failure(error, 'Removing the relationship');
      } else {
        const { error } = await db.from('person_relationships').upsert(
          { person_id: from.id, related_person_id: to.id, relationship_type: relationshipType },
          { onConflict: 'person_id,related_person_id,relationship_type', ignoreDuplicates: true },
        );
        if (error) failure(error, 'Adding the relationship');
      }
    } else {
      const column = relation === 'located_in' ? 'location_id' : 'parent_id';
      if (remove && source[column] !== to.id) {
        return `${source.name} was not linked to ${target.name}.`;
      }
      if (!remove && relation === 'part_of' && await this.wouldCycle(from.type as 'place' | 'quest', from.id, to.id)) {
        throw new ToolError(`${target.name} is already part of ${source.name}; that would make a loop.`);
      }
      const { error } = await db.from(TABLES[from.type]).update({ [column]: remove ? null : to.id }).eq('id', from.id);
      if (error) failure(error, 'Linking');
    }
    return `${remove ? 'Removed' : 'Linked'}: ${source.name} ${relation} ${target.name}.`;
  }

  private async wouldCycle(type: 'place' | 'quest', childId: string, parentId: string): Promise<boolean> {
    const db = await this.db();
    let current: string | null = parentId;
    for (let depth = 0; current && depth < 50; depth++) {
      if (current === childId) return true;
      const { data }: { data: { parent_id: string | null } | null } =
        await db.from(TABLES[type]).select('parent_id').eq('id', current).maybeSingle();
      current = data?.parent_id ?? null;
    }
    return false;
  }
}


const FIELDS: Record<EntityType, string[]> = {
  person: ['id', 'name', 'title', 'race', 'culture', 'profession', 'birthday', 'birthyear', 'deathday', 'height', 'pc', 'status', 'created_at'],
  place: ['id', 'name', 'type', 'inhabitants', 'status', 'created_at'],
  quest: ['id', 'name', 'type', 'description', 'completed', 'status', 'created_at'],
  note: ['id', 'title', 'category', 'content', 'created_at', 'modified_at'],
};

function pick(row: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(keys.filter(key => row[key] !== null && row[key] !== undefined).map(key => [key, row[key]]));
}

/** Drops undefined, trims strings, turns empty strings into NULL. */
function clean(fields: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    out[key] = typeof value === 'string' ? (value.trim() || null) : value;
  }
  return out;
}
