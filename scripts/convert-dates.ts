/**
 * One-off conversion of legacy in-game date text (migration 018) to day number + precision.
 *
 * Usage:
 *   npm run dates:convert             # dry run, writes nothing
 *   npm run dates:convert -- --apply  # update rows
 *
 * On the server: bash scripts/run-migrations.sh --dates [--apply], which passes
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (and NG_APP_TENANT, if set).
 *
 * Rows that do not parse or cannot be written are left untouched and listed
 * at the end. Exit code 1 only if a write failed: unparseable text is expected.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import type { CalendarDefinition } from '../libs/fantasy-calendar/index.ts';
import { convertAll, fetchAll } from './convert-dates.lib.ts';
import type { ConversionStore } from './convert-dates.lib.ts';

const apply = process.argv.includes('--apply');

function readTenant(): string {
  if (process.env.NG_APP_TENANT) return process.env.NG_APP_TENANT.trim();
  try {
    const m = fs.readFileSync('.env', 'utf8').match(/NG_APP_TENANT\s*=\s*(\S+)/);
    return m?.[1]?.trim() || 'the-eighth';
  } catch {
    return 'the-eighth';
  }
}

function getSupabaseCredentials(): { url: string; serviceRoleKey: string } {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { url: process.env.SUPABASE_URL, serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY };
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
    // fall through
  }
  throw new Error(
    'Cannot determine Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or start local Supabase.',
  );
}

const tenant = readTenant();
const rules = JSON.parse(fs.readFileSync(`src/assets/${tenant}/rules.json`, 'utf8'));
const calendars = rules.calendars as { default: string; list: CalendarDefinition[] };
const def = calendars.list.find((c) => c.id === calendars.default) ?? calendars.list[0];

const { url, serviceRoleKey } = getSupabaseCredentials();
const db: SupabaseClient = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

const store: ConversionStore = {
  rows: (table, columns, legacy) =>
    fetchAll((from, to) =>
      db
        .from(table)
        .select(`id, ${columns}`)
        .or(legacy.map((c) => `${c}.not.is.null`).join(','))
        .order('id')
        .range(from, to),
    ).catch((e) => {
      throw new Error(`${table}: ${e.message}`);
    }),
  update: async (table, id, patch) => {
    const { error } = await db.from(table).update(patch).eq('id', id);
    return error ? error.message : null;
  },
};

async function main(): Promise<void> {
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} (tenant ${tenant}, calendar ${def.id})`);
  const { converted, unparsed, writeErrors } = await convertAll(def, store, apply);
  converted.forEach((line) => console.log(line));
  console.log(`
${converted.length} row value(s) ${apply ? 'converted' : 'would be converted'}.`);
  if (unparsed.length) {
    console.log(`${unparsed.length} could not be parsed and were left untouched:`);
    unparsed.forEach((f) => console.log(`  ${f}`));
  }
  if (writeErrors.length) {
    console.error(`${writeErrors.length} could not be written and were left untouched:`);
    writeErrors.forEach((f) => console.error(`  ${f}`));
    // Unparseable text is expected (it stays as legacy text); a failed write is not.
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
