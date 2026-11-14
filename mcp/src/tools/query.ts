import type { SupabaseClient } from '@supabase/supabase-js';

import { ToolError } from './entities.js';
import { type SchemaCatalog, type TableInfo, isHiddenIdentifier } from './schema.js';

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

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 500;
export const MAX_RESULT_BYTES = 100_000;

/** PostgREST list syntax, every value quoted so commas and parentheses stay inside it. */
export function inList(values: (string | number)[]): string {
  const quoted = values.map(value =>
    typeof value === 'number' ? String(value) : `"${value.replace(/[\\"]/g, c => `\\${c}`)}"`);
  return `(${quoted.join(',')})`;
}

/** The longest prefix of rows whose JSON stays within maxBytes. */
export function fitRows(rows: unknown[], maxBytes: number): { rows: unknown[]; truncated?: string } {
  let size = 2; // []
  let fitting = 0;
  for (const row of rows) {
    const next = size + JSON.stringify(row).length + (fitting > 0 ? 1 : 0);
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
      : `Only ${fitting} of the ${rows.length} rows fit in ${maxBytes} bytes. Select fewer columns, or page with offset: ${fitting}.`,
  };
}

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
  return String(value);
}

export class QueryReader {
  constructor(
    private db: () => Promise<SupabaseClient>,
    private catalog: SchemaCatalog,
    private maxBytes = MAX_RESULT_BYTES,
  ) {}

  async describe(table?: string): Promise<TableInfo[]> {
    if (table === undefined) return this.catalog.tables();
    const found = await this.catalog.table(table);
    if (!found) throw new ToolError(`Unknown table "${table}". Call describe without a table to list them.`);
    return [found];
  }

  async query(input: QueryInput): Promise<QueryResult> {
    const filters = input.filters ?? [];
    const order = input.order ?? [];
    const named = [input.table, input.select ?? '', ...filters.map(f => f.column), ...order.map(o => o.column)];
    if (named.some(isHiddenIdentifier)) {
      throw new ToolError("Not readable: the MCP server's own connection tables (mcp_*).");
    }
    if (!(await this.catalog.table(input.table))) {
      throw new ToolError(`Unknown table "${input.table}". Call describe to list the tables you can read.`);
    }

    const limit = Math.min(Math.max(Math.trunc(input.limit ?? DEFAULT_LIMIT), 0), MAX_LIMIT);
    const offset = Math.max(Math.trunc(input.offset ?? 0), 0);
    const select = input.select?.trim() || '*';
    const countOnly = limit === 0;

    const table = (await this.db()).from(input.table);
    let request: any = countOnly
      ? table.select(select, { count: 'exact', head: true })
      : table.select(select, input.count ? { count: 'exact' } : undefined);
    for (const { column, op, value } of filters) {
      request = request.filter(column, op, filterValue(op, value, column));
    }
    for (const { column, ascending } of order) {
      request = request.order(column, { ascending: ascending ?? true });
    }
    if (!countOnly) request = request.range(offset, offset + limit - 1);

    const { data, error, count } = await request;
    if (error) {
      const message = error.message || `The query failed (${error.code ?? 'no details'}).`;
      throw new ToolError(error.hint ? `${message} — ${error.hint}` : message);
    }

    const result: QueryResult = { rows: [] };
    if (input.count || countOnly) result.count = count ?? 0;
    if (!countOnly) {
      const fitted = fitRows((data ?? []) as unknown[], this.maxBytes);
      result.rows = fitted.rows;
      if (fitted.truncated) result.truncated = fitted.truncated;
    }
    return result;
  }
}
