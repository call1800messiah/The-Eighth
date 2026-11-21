/**
 * One-off conversion of legacy in-game date text (migration 018) to day number + precision.
 *
 * Usage:
 *   npm run dates:convert             # dry run, writes nothing
 *   npm run dates:convert -- --apply  # update rows
 *
 * Rows that do not convert are left untouched and listed at the end.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { format } from '../libs/fantasy-calendar/index.ts';
import type { CalendarDefinition } from '../libs/fantasy-calendar/index.ts';
import { convertBirth, convertDate, Converted } from './convert-dates.lib.ts';

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

let changed = 0;
const failed: string[] = [];

async function update(table: string, id: string, patch: Record<string, unknown>): Promise<void> {
  if (!apply) return;
  const { error } = await db.from(table).update(patch).eq('id', id);
  if (error) throw new Error(`${table} ${id}: ${error.message}`);
}

function report(table: string, id: string, legacy: string, c: Converted): void {
  changed++;
  console.log(`${table} ${id}: "${legacy}" → ${format(def, c)}`);
}

async function rows(table: string, columns: string): Promise<any[]> {
  const { data, error } = await db.from(table).select(`id, ${columns}`);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

async function convertSimple(table: string): Promise<void> {
  for (const r of await rows(table, 'date_legacy')) {
    if (r.date_legacy == null) continue;
    const c = convertDate(def, r.date_legacy);
    if (!c) {
      failed.push(`${table} ${r.id}: "${r.date_legacy}"`);
      continue;
    }
    report(table, r.id, r.date_legacy, c);
    await update(table, r.id, { date_day: c.day, date_precision: c.precision, date_legacy: null });
  }
}

async function convertPeople(): Promise<void> {
  for (const r of await rows('people', 'birthday_legacy, birthyear_legacy, deathday_legacy')) {
    if (r.birthday_legacy != null || r.birthyear_legacy != null) {
      const label = [r.birthday_legacy, r.birthyear_legacy].filter((x) => x != null).join(' ');
      const c = convertBirth(def, r.birthday_legacy, r.birthyear_legacy);
      if (!c) {
        failed.push(`people ${r.id} birth: "${label}"`);
      } else {
        report('people birth', r.id, label, c);
        await update('people', r.id, {
          birth_day: c.day,
          birth_precision: c.precision,
          birthday_legacy: null,
          birthyear_legacy: null,
        });
      }
    }
    if (r.deathday_legacy != null) {
      const c = convertDate(def, r.deathday_legacy);
      if (!c) {
        failed.push(`people ${r.id} death: "${r.deathday_legacy}"`);
      } else {
        report('people death', r.id, r.deathday_legacy, c);
        await update('people', r.id, {
          death_day: c.day,
          death_precision: c.precision,
          deathday_legacy: null,
        });
      }
    }
  }
}

async function main(): Promise<void> {
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} (tenant ${tenant}, calendar ${def.id})`);
  await convertSimple('campaign');
  await convertSimple('historic_events');
  await convertPeople();
  console.log(`\n${changed} row value(s) ${apply ? 'converted' : 'would be converted'}.`);
  if (failed.length) {
    console.log(`${failed.length} could not be converted and were left untouched:`);
    failed.forEach((f) => console.log(`  ${f}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
