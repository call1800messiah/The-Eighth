/**
 * Mentions are stored as ordinary Markdown links with a `mention:` target:
 *
 *   [Alrik](mention:person/5f0c2a4e-…)
 *
 * The label is the target's name when the mention was written. Renderers show
 * the current name instead when the viewer can see the target.
 *
 * The database parses the same syntax (supabase/migrations/012_mentions.sql)
 * to maintain the `mentions` backlink table, so keep the two in step.
 */

export type MentionEntityType = 'person' | 'place' | 'quest' | 'note';

export const MENTION_ENTITY_TYPES: readonly MentionEntityType[] = ['person', 'place', 'quest', 'note'];

export interface MentionRef {
  entityType: MentionEntityType;
  entityId: string;
  label: string;
}

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const TYPES = MENTION_ENTITY_TYPES.join('|');

/** A whole mention link at the start of the input, for the Markdown tokenizers. */
export const MENTION_LINK_START = new RegExp(`^\\[((?:\\\\.|[^\\\\\\[\\]\\n])*)\\]\\(mention:(${TYPES})\\/(${UUID})\\)`);

const MENTION_LINK_GLOBAL = new RegExp(MENTION_LINK_START.source.slice(1), 'g');
const MENTION_HREF = new RegExp(`^mention:(${TYPES})\\/(${UUID})$`);


export function mentionHref(entityType: MentionEntityType, entityId: string): string {
  return `mention:${entityType}/${entityId.toLowerCase()}`;
}


export function parseMentionHref(href: string | null | undefined): Omit<MentionRef, 'label'> | null {
  const match = MENTION_HREF.exec(href ?? '');
  return match
    ? { entityType: match[1] as MentionEntityType, entityId: match[2].toLowerCase() }
    : null;
}


/** Backslash-escapes what would end the link text early. */
export function escapeMentionLabel(label: string): string {
  return label.replace(/\s+/g, ' ').trim().replace(/([\\\[\]])/g, '\\$1');
}


export function unescapeMentionLabel(label: string): string {
  return label.replace(/\\(.)/g, '$1');
}


export function formatMention(ref: MentionRef): string {
  return `[${escapeMentionLabel(ref.label)}](${mentionHref(ref.entityType, ref.entityId)})`;
}


/** Every mention in a Markdown text, in order, duplicates included. */
export function extractMentions(markdown: string | null | undefined): MentionRef[] {
  const refs: MentionRef[] = [];
  for (const match of (markdown ?? '').matchAll(MENTION_LINK_GLOBAL)) {
    refs.push({
      entityType: match[2] as MentionEntityType,
      entityId: match[3].toLowerCase(),
      label: unescapeMentionLabel(match[1]),
    });
  }
  return refs;
}


export function mentionKey(entityType: string, entityId: string): string {
  return `${entityType}/${entityId.toLowerCase()}`;
}


export interface MentionRoute {
  path: string;
  queryParams?: Record<string, string>;
}

/**
 * Where a mention link leads. Notes have no page of their own, so the notes
 * list picks the note out of its query parameter.
 */
export function mentionRoute(entityType: MentionEntityType, entityId: string): MentionRoute {
  switch (entityType) {
    case 'person': return { path: `/people/${entityId}` };
    case 'place': return { path: `/places/${entityId}` };
    case 'quest': return { path: `/quests/${entityId}` };
    case 'note': return { path: '/notes', queryParams: { note: entityId } };
  }
}


export function mentionUrl(entityType: MentionEntityType, entityId: string): string {
  const { path, queryParams } = mentionRoute(entityType, entityId);
  const query = new URLSearchParams(queryParams ?? {}).toString();
  return query ? `${path}?${query}` : path;
}


/**
 * Markdown reduced to its text, for one-line previews and text filters.
 * Mentions keep their label.
 */
export function markdownToPlainText(markdown: string | null | undefined): string {
  return (markdown ?? '')
    .replace(MENTION_LINK_GLOBAL, (_m, label) => unescapeMentionLabel(label))
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/gm, '')
    .replace(/(\*\*|__|~~|`)/g, '')
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=$|[\s).,;:!?])/g, '$1$2')
    .replace(/\\([\\`*_{}\[\]()#+\-.!~|>])/g, '$1')
    // The editor writes these characters as entities.
    .replace(/&(lt|gt|quot|#39|amp);/g, (_m, entity) => ENTITIES[entity]);
}

const ENTITIES: Record<string, string> = { lt: '<', gt: '>', quot: '"', '#39': "'", amp: '&' };
