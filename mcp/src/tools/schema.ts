import type { SupabaseClient } from '@supabase/supabase-js';

import { ToolError } from './entities.js';

/**
 * What Claude can read, from assistant_schema() (migrations 015, 016): the
 * tables the assistant has a read policy on, their columns, and the comments
 * that explain them. Cached, and reloaded when describe lists the tables or
 * query meets a table it does not know, in case a migration added one since.
 * The values in use (`occurring`) change with every edit, so values() reads
 * them fresh, one table at a time.
 */

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  /** "table.column" for a foreign key. */
  references: string | null;
  /** Labels of an enum column. */
  values: string[] | null;
  /** Values in use, most frequent first, for a few free-text columns (tags, note categories, ...). Only from describe(table). */
  occurring?: { value: string; count: number }[] | null;
  note: string | null;
}

export interface TableInfo {
  name: string;
  note: string | null;
  columns: ColumnInfo[];
}

/**
 * The MCP server's own OAuth tables. The assistant user has to read them for
 * the OAuth server to work, so the database cannot keep Claude out; the tools
 * refuse any request that names one, embedded or not.
 *
 * postgrest-js strips whitespace from a select string before sending it, so
 * "m cp_grants" would reach PostgREST as "mcp_grants": test what is sent, not
 * what was typed. Quoted identifiers (which could hide the name behind
 * escapes) are refused separately by the query tool.
 */
const HIDDEN = /(?<![A-Za-z0-9_])mcp_/i;

/** A table name that is one of the OAuth tables. */
export function isHiddenIdentifier(text: string): boolean {
  return HIDDEN.test(text.replace(/\s+/g, ''));
}

/**
 * Whether a select string, filter column or order column reaches an OAuth
 * table: an mcp_ name in table position, i.e. embedded (`mcp_x(`), as a hint
 * (`!mcp_x`, `mcp_x!inner`) or as the table part of a path (`mcp_x.col`).
 * An alias or column that merely starts with mcp_ (`mcp_note:field`) is not
 * a table, so it passes.
 */
const HIDDEN_TABLE_POSITION = /(?<![A-Za-z0-9_])mcp_[A-Za-z0-9_]*(?=[(!.])|!mcp_/i;

export function reachesHiddenTable(text: string): boolean {
  return HIDDEN_TABLE_POSITION.test(text.replace(/\s+/g, ''));
}

export class SchemaCatalog {
  private cached: Promise<TableInfo[]> | null = null;

  constructor(private db: () => Promise<SupabaseClient>) {}

  tables(): Promise<TableInfo[]> {
    this.cached ??= this.load().catch(error => {
      this.cached = null;
      throw error;
    });
    return this.cached;
  }

  /** Reload, so the next tables() sees current values and new tables. */
  refresh(): Promise<TableInfo[]> {
    this.cached = null;
    return this.tables();
  }

  async table(name: string): Promise<TableInfo | undefined> {
    return (await this.tables()).find(table => table.name === name);
  }

  /** A table from the cache, or after one reload if the cache does not have it. */
  async find(name: string): Promise<TableInfo | undefined> {
    return (await this.table(name)) ?? (await this.refresh()).find(table => table.name === name);
  }

  /** The values in use in the table's free-text columns, by column; read fresh every time. */
  async values(table: string): Promise<Record<string, { value: string; count: number }[]>> {
    const { data, error } = await (await this.db()).rpc('assistant_column_values', { p_table: table });
    if (error) throw new ToolError(`Could not read the values in use: ${error.message}`);
    return (data ?? {}) as Record<string, { value: string; count: number }[]>;
  }

  private async load(): Promise<TableInfo[]> {
    const { data, error } = await (await this.db()).rpc('assistant_schema');
    if (error) {
      throw new ToolError(`Could not read the database schema: ${error.message}`);
    }
    return ((data ?? []) as TableInfo[]).filter(table => !isHiddenIdentifier(table.name));
  }
}
