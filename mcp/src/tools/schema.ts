import type { SupabaseClient } from '@supabase/supabase-js';

import { ToolError } from './entities.js';

/**
 * What Claude can read, from assistant_schema() (migration 015): the tables
 * the assistant has a read policy on, their columns, and the comments that
 * explain them. Fetched once per process; the schema only changes with a
 * deploy, which restarts the server anyway.
 */

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  /** "table.column" for a foreign key. */
  references: string | null;
  /** Labels of an enum column. */
  values: string[] | null;
  /** Values in use, most frequent first, for a few free-text columns (tags, note categories, ...). */
  occurring: { value: string; count: number }[] | null;
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

export function isHiddenIdentifier(text: string): boolean {
  return HIDDEN.test(text.replace(/\s+/g, ''));
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

  async table(name: string): Promise<TableInfo | undefined> {
    return (await this.tables()).find(table => table.name === name);
  }

  private async load(): Promise<TableInfo[]> {
    const { data, error } = await (await this.db()).rpc('assistant_schema');
    if (error) {
      throw new ToolError(`Could not read the database schema: ${error.message}`);
    }
    return ((data ?? []) as TableInfo[]).filter(table => !isHiddenIdentifier(table.name));
  }
}
