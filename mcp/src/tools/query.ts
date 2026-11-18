import type { SupabaseClient } from '@supabase/supabase-js';

import { ToolError } from './entities.js';
import { type SchemaCatalog, type TableInfo, isHiddenIdentifier, reachesHiddenTable } from './schema.js';

/**
 * Read-only queries over every table Claude may read, as PostgREST requests
 * with the assistant's own session: RLS decides what comes back, exactly as
 * for the other tools. Nothing here writes.
 */

export const FILTER_OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is'] as const;
export type FilterOp = typeof FILTER_OPS[number];
export type FilterValue = string | number | boolean | null | (string | number)[];

export interface QueryInput {
  table: string;
  select?: string;
  filters?: { column: string; op: FilterOp; value: FilterValue }[];
  order?: { column: string; ascending?: boolean }[];
  limit?: number;
  offset?: number;
  count?: boolean;
}

export interface QueryResult {
  count?: number;
  rows: unknown[];
  truncated?: string;
}

/** describe without a table: enough to pick tables, without every column's details. */
export interface TableSummary {
  name: string;
  note: string | null;
  columns: string[];
}

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 500;
export const MAX_RESULT_BYTES = 100_000;

/** PostgREST list syntax, every value quoted so commas and parentheses stay inside it. */
export function inList(values: (string | number)[]): string {
  const quoted = values.map(value =>
    typeof value === 'number' ? String(value) : `"${value.replace(/[\\"]/g, c => `\\${c}`)}"`);
  return `(${quoted.join(',')})`;
}

/** The longest prefix of rows whose JSON stays within maxBytes (UTF-8). */
export function fitRows(rows: unknown[], maxBytes: number, offset = 0): { rows: unknown[]; truncated?: string } {
  let size = 2; // []
  let fitting = 0;
  for (const row of rows) {
    const next = size + Buffer.byteLength(JSON.stringify(row)) + (fitting > 0 ? 1 : 0);
    if (next > maxBytes) break;
    size = next;
    fitting++;
  }
  if (fitting === rows.length) return { rows };
  const kept = rows.slice(0, fitting);
  return {
    rows: kept,
    truncated: fitting === 0
      ? `Even one of the ${rows.length} rows is larger than ${maxBytes} bytes. Select fewer columns (leave out long texts).`
      : `Only ${fitting} of the ${rows.length} rows fit in ${maxBytes} bytes. Select fewer columns, or page with offset: ${offset + fitting}.`,
  };
}

/** Unknown column, unparseable select, relationship not found or ambiguous. */
const SCHEMA_ERRORS = new Set(['42703', 'PGRST100', 'PGRST200', 'PGRST201']);

function filterValue(op: FilterOp, value: FilterValue, column: string): string {
  if (op === 'in') {
    if (!Array.isArray(value)) throw new ToolError(`Filter on ${column}: "in" needs a list of values.`);
    return inList(value);
  }
  if (Array.isArray(value)) throw new ToolError(`Filter on ${column}: only "in" takes a list.`);
  if (op === 'is') {
    if (value !== null && value !== true && value !== false) {
      throw new ToolError(`Filter on ${column}: "is" takes only null, true or false.`);
    }
    return String(value);
  }
  if (value === null) throw new ToolError(`Filter on ${column}: to match null, use op "is" with value null.`);
  return String(value);
}

/**
 * A unique tie-breaker so that pages over offset neither repeat nor skip
 * rows: Postgres has no row order without ORDER BY. Every readable table has
 * an id primary key except combat_tokens, whose key is combatant_id.
 */
function tieBreaker(table: TableInfo): string[] {
  const names = table.columns.map(c => c.name);
  for (const key of ['id', 'combatant_id']) {
    if (names.includes(key)) return [key];
  }
  return table.columns.filter(c => !/json/.test(c.type)).map(c => c.name);
}

export class QueryReader {
  constructor(
    private db: () => Promise<SupabaseClient>,
    private catalog: SchemaCatalog,
    private maxBytes = MAX_RESULT_BYTES,
  ) {}

  async describe(table?: string): Promise<TableSummary[] | TableInfo[]> {
    if (table === undefined) {
      return (await this.catalog.refresh()).map(({ name, note, columns }) => ({ name, note, columns: columns.map(c => c.name) }));
    }
    const found = await this.catalog.find(table);
    if (!found) throw new ToolError(`Unknown table "${table}". Call describe without a table to list them.`);
    const values = await this.catalog.values(table);
    return [{ ...found, columns: found.columns.map(c => ({ ...c, occurring: values[c.name] ?? null })) }];
  }

  async query(input: QueryInput): Promise<QueryResult> {
    const filters = input.filters ?? [];
    const order = input.order ?? [];
    const named = [input.table, input.select ?? '', ...filters.map(f => f.column), ...order.map(o => o.column)];
    if (isHiddenIdentifier(input.table) || named.slice(1).some(reachesHiddenTable)) {
      throw new ToolError("Not readable: the MCP server's own connection tables (mcp_*).");
    }
    if (named.some(name => /["\\]/.test(name))) {
      throw new ToolError('Write table and column names without quotes or backslashes.');
    }
    const info = await this.catalog.find(input.table);
    if (!info) {
      throw new ToolError(`Unknown table "${input.table}". Call describe to list the tables you can read.`);
    }

    const limit = Math.min(Math.max(Math.trunc(input.limit ?? DEFAULT_LIMIT), 0), MAX_LIMIT);
    const offset = Math.max(Math.trunc(input.offset ?? 0), 0);
    const select = input.select?.trim() || '*';
    const countOnly = limit === 0;

    // Count-only is a GET with limit 0, not a HEAD request: a HEAD error
    // response has no body, so Claude would get no message to fix it by.
    const table = (await this.db()).from(input.table);
    let request: any = table.select(select, input.count || countOnly ? { count: 'exact' } : undefined);
    for (const { column, op, value } of filters) {
      request = request.filter(column, op, filterValue(op, value, column));
    }
    for (const { column, ascending } of order) {
      request = request.order(column, { ascending: ascending ?? true });
    }
    if (!countOnly) {
      for (const column of tieBreaker(info)) {
        if (!order.some(o => o.column === column)) request = request.order(column, { ascending: true });
      }
    }
    request = countOnly ? request.limit(0) : request.range(offset, offset + limit - 1);

    const { data, error, count } = await request;
    if (error) {
      let message = error.message || `The query failed (${error.code ?? 'no details'}).`;
      if (error.hint) message += ` — ${error.hint}`;
      if (SCHEMA_ERRORS.has(error.code)) message += ` Call describe with table "${input.table}" to see its columns and foreign keys.`;
      throw new ToolError(message);
    }

    const result: QueryResult = { rows: [] };
    if (input.count || countOnly) result.count = count ?? 0;
    if (!countOnly) {
      const fitted = fitRows((data ?? []) as unknown[], this.maxBytes, offset);
      result.rows = fitted.rows;
      if (fitted.truncated) result.truncated = fitted.truncated;
    }
    return result;
  }
}
