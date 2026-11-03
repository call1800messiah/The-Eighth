import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import {
  ENTITY_TYPES,
  EntityRepository,
  INFO_TYPES,
  type Infos,
  PLACE_TYPES,
  QUEST_TYPES,
  RELATIONS,
  ToolError,
} from './entities.js';

const MARKDOWN_NOTE =
  'Markdown. Refer to existing people, places, quests and notes with mention links exactly as search_entities returns them, ' +
  'e.g. [Alrik](mention:person/<uuid>); the app turns them into links and backlinks.';

export const INSTRUCTIONS = `This server is a tabletop RPG campaign ("TheEighth"). It lets you look up the campaign's people, places, quests and notes, and add new people, places and quests as drafts.

How to work with it:
- Always call search_entities before creating anything, and reuse what exists instead of creating a duplicate. Mention existing entities in your text with the mention link from the search result.
- Everything you create is a draft. Only GMs and you can see drafts until a GM approves them in the app's review queue. Tell the user that, and give them the review link from the tool result.
- You can change only your own drafts (update_draft, link_entities). Published entities are read-only for you; if one should change, say so to the user.
- Write in the language of the existing entries (usually German), in Markdown. Keep the GM's facts; mark your own inventions as suggestions where it matters.`;

const id = z.string().uuid();
const draftType = z.enum(['person', 'place', 'quest']);

const markdown = (what: string) => z.string().max(20000).describe(`${what} ${MARKDOWN_NOTE}`);

const infoShape = (kinds: (keyof typeof INFO_TYPES)[]) => z.object(Object.fromEntries(
  kinds.map(kind => [kind, markdown(`"${INFO_TYPES[kind]}" section.`).optional()]),
)).partial().optional();

const personInfos = infoShape(['appearance', 'background', 'character', 'goals', 'note']);
const placeInfos = infoShape(['appearance', 'background', 'note']);
const questInfos = infoShape(['goals', 'reward', 'note']);

const optionalText = (description: string) => z.string().max(200).nullable().optional().describe(description);

const personFields = {
  title: optionalText('Title or epithet, e.g. "Baronin von Gareth".'),
  race: optionalText('Spezies/Rasse.'),
  culture: optionalText('Kultur.'),
  profession: optionalText('Profession.'),
  birthday: optionalText('Day and month of birth in the campaign calendar, e.g. "3. Praios".'),
  birthyear: z.number().int().nullable().optional().describe('Year of birth (BF).'),
  deathday: optionalText('Date of death, if dead.'),
  height: z.number().int().min(30).max(400).nullable().optional().describe('Height in cm.'),
};

const placeFields = {
  inhabitants: optionalText('Number or description of inhabitants, e.g. "ca. 1200".'),
};

const questFields = {
  description: markdown('What the quest is about.').nullable().optional(),
};

function text(value: unknown): CallToolResult {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] };
}

function error(message: string): CallToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

/** Runs a tool body; ToolErrors become messages for Claude, anything else is logged. */
async function run(body: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await body();
  } catch (e) {
    if (e instanceof ToolError) {
      return error(e.message);
    }
    console.error(e);
    return error('Something went wrong on the server. Try again; if it keeps failing, tell the user.');
  }
}

function texts(fields: Record<string, unknown>, infos: Infos | undefined): string[] {
  return [
    ...Object.values(fields).filter((value): value is string => typeof value === 'string'),
    ...Object.values(infos ?? {}).filter((value): value is string => typeof value === 'string'),
  ];
}


export function createMcpServer(repo: EntityRepository): McpServer {
  const server = new McpServer(
    { name: 'the-eighth', version: '0.1.0' },
    { instructions: INSTRUCTIONS },
  );

  const created = async (type: 'person' | 'place' | 'quest', name: string, newId: string, written: string[]) => {
    const unknown = await repo.unknownMentions(written);
    return text({
      created: { type, id: newId, name, status: 'draft' },
      mention: `[${name}](mention:${type}/${newId})`,
      url: repo.url(type, newId),
      review: `A GM approves or discards it at ${repo.reviewUrl}`,
      ...(unknown.length ? { warning: `These mention links point at nothing: ${unknown.join(', ')}. Fix them with update_draft.` } : {}),
    });
  };

  const duplicates = async (type: 'person' | 'place' | 'quest', name: string, allow: boolean | undefined) => {
    if (allow) return null;
    const same = await repo.sameName(type, name);
    return same.length === 0 ? null : error(
      `A ${type} named "${name}" already exists:\n${JSON.stringify(same, null, 2)}\n` +
      'Use it (get_entity, mention links) instead of creating a duplicate. If this really is a different one, call again with allow_duplicate: true.');
  };

  server.registerTool('search_entities', {
    title: 'Search the campaign',
    description: 'Finds people, places, quests and notes by name (notes also by content). Call this before creating anything, ' +
      'and to get mention links for entities you refer to. Results include drafts.',
    inputSchema: {
      query: z.string().min(1).max(200).describe('Name or part of it.'),
      types: z.array(z.enum(ENTITY_TYPES)).min(1).optional().describe('Limit to these kinds. Default: all.'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, ({ query, types }) => run(async () => {
    const hits = await repo.search(query, types);
    return text(hits.length ? hits : `Nothing found for "${query}".`);
  }));

  server.registerTool('get_entity', {
    title: 'Read an entity',
    description: 'Everything about one person, place, quest or note: fields, text sections (Markdown), and links to related entities.',
    inputSchema: {
      type: z.enum(ENTITY_TYPES),
      id,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, ({ type, id: entityId }) => run(async () => text(await repo.get(type, entityId))));

  server.registerTool('create_person', {
    title: 'Create a person (draft)',
    description: 'Adds a non-player character as a draft for GM review. Search first. Link it to places and other people afterwards with link_entities.',
    inputSchema: {
      name: z.string().min(1).max(200),
      ...personFields,
      infos: personInfos.describe('Text sections of the person page.'),
      allow_duplicate: z.boolean().optional().describe('Create even though one with the same name exists.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, ({ name, infos, allow_duplicate, ...fields }) => run(async () => {
    const duplicate = await duplicates('person', name, allow_duplicate);
    if (duplicate) return duplicate;
    const { id: newId } = await repo.createDraft('person', { name, ...fields }, infos as Infos);
    return created('person', name, newId, texts(fields, infos as Infos));
  }));

  server.registerTool('create_place', {
    title: 'Create a place (draft)',
    description: 'Adds a place as a draft for GM review. Search first. Put it inside a region, city or building with link_entities (part_of).',
    inputSchema: {
      name: z.string().min(1).max(200),
      type: z.enum(Object.keys(PLACE_TYPES) as [keyof typeof PLACE_TYPES]).describe(
        `Kind of place: ${Object.entries(PLACE_TYPES).map(([key, label]) => `${key} (${label})`).join(', ')}.`),
      ...placeFields,
      infos: placeInfos.describe('Text sections of the place page.'),
      allow_duplicate: z.boolean().optional().describe('Create even though one with the same name exists.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, ({ name, infos, allow_duplicate, ...fields }) => run(async () => {
    const duplicate = await duplicates('place', name, allow_duplicate);
    if (duplicate) return duplicate;
    const { id: newId } = await repo.createDraft('place', { name, ...fields }, infos as Infos);
    return created('place', name, newId, texts(fields, infos as Infos));
  }));

  server.registerTool('create_quest', {
    title: 'Create a quest (draft)',
    description: 'Adds a quest, scene or task as a draft for GM review. Search first. Make it part of a larger quest with link_entities (part_of).',
    inputSchema: {
      name: z.string().min(1).max(200),
      type: z.enum(Object.keys(QUEST_TYPES) as [keyof typeof QUEST_TYPES]).describe(
        `Kind: ${Object.entries(QUEST_TYPES).map(([key, label]) => `${key} (${label})`).join(', ')}.`),
      ...questFields,
      infos: questInfos.describe('Text sections of the quest page.'),
      allow_duplicate: z.boolean().optional().describe('Create even though one with the same name exists.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, ({ name, infos, allow_duplicate, ...fields }) => run(async () => {
    const duplicate = await duplicates('quest', name, allow_duplicate);
    if (duplicate) return duplicate;
    const { id: newId } = await repo.createDraft('quest', { name, ...fields }, infos as Infos);
    return created('quest', name, newId, texts(fields, infos as Infos));
  }));

  server.registerTool('link_entities', {
    title: 'Link two entities',
    description: 'Connects one of your drafts to another entity (published or draft). Relations: ' +
      Object.entries(RELATIONS).map(([key, meaning]) => `${key}: ${meaning}`).join('; ') +
      '. The first entity must be your draft; for family links the reverse direction is added when the GM publishes it.',
    inputSchema: {
      from_type: draftType,
      from_id: id.describe('Your draft.'),
      relation: z.enum(Object.keys(RELATIONS) as [keyof typeof RELATIONS]),
      to_type: draftType,
      to_id: id,
      remove: z.boolean().optional().describe('Remove this link instead of adding it.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, ({ from_type, from_id, relation, to_type, to_id, remove }) => run(async () =>
    text(await repo.link({ type: from_type, id: from_id }, relation, { type: to_type, id: to_id }, remove))));

  server.registerTool('update_draft', {
    title: 'Change one of your drafts',
    description: 'Changes fields or text sections of a draft you created. Only the given fields change; ' +
      'a text section given as "" is removed. Published entities cannot be changed.',
    inputSchema: {
      type: draftType,
      id,
      name: z.string().min(1).max(200).optional(),
      fields: z.object({
        ...personFields,
        ...placeFields,
        ...questFields,
        type: z.string().optional().describe('Place or quest kind, as in create_place / create_quest.'),
      }).partial().optional().describe('Fields to change; which apply depends on the type.'),
      infos: infoShape(['appearance', 'background', 'character', 'goals', 'reward', 'note']).describe('Text sections to replace.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  }, ({ type, id: draftId, name, fields = {}, infos }) => run(async () => {
    const allowed: Record<string, string[]> = {
      person: Object.keys(personFields),
      place: [...Object.keys(placeFields), 'type'],
      quest: [...Object.keys(questFields), 'type'],
    };
    const wrong = Object.keys(fields).filter(key => !allowed[type].includes(key));
    if (wrong.length) {
      return error(`A ${type} has no ${wrong.join(', ')}. Fields: ${allowed[type].join(', ')}.`);
    }
    const kinds = type === 'place' ? PLACE_TYPES : type === 'quest' ? QUEST_TYPES : null;
    if (kinds && fields.type !== undefined && !(fields.type in kinds)) {
      return error(`Unknown ${type} type "${fields.type}". Use one of: ${Object.keys(kinds).join(', ')}.`);
    }
    const changes = { ...fields, ...(name ? { name } : {}) };
    await repo.updateDraft(type, draftId, changes, infos as Infos);
    const unknown = await repo.unknownMentions(texts(changes, infos as Infos));
    return text({
      updated: { type, id: draftId },
      url: repo.url(type, draftId),
      ...(unknown.length ? { warning: `These mention links point at nothing: ${unknown.join(', ')}.` } : {}),
    });
  }));

  return server;
}
