/**
 * Fix User Credentials
 *
 * Repairs auth users whose email/password were generated instead of taken from
 * data/user-credentials.json — the case where transform-and-migrate.ts matched
 * credentials by a derived `slugify(name)@{tenant}.local` address that never
 * appears in the credentials file.
 *
 * Only auth.users is touched: the public.users table stores no email, it just
 * references auth.users(id), so nothing else needs to change and no data
 * re-migration is required.
 *
 * Usage:
 *   npx tsx scripts/fix-user-credentials.ts            # apply
 *   npx tsx scripts/fix-user-credentials.ts --dry-run  # report only
 *
 * Requirements:
 *   - data/user-credentials.json with [{ name, email, password }]
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

interface ManualCredential {
  name: string;
  email: string;
  password: string;
}

const DRY_RUN = process.argv.includes('--dry-run');

/** Read a key from .env, so the script works without env plumbing. */
function fromEnvFile(key: string): string | undefined {
  try {
    const content = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    const match = content.match(new RegExp(`^${key}\\s*=\\s*(.*)$`, 'm'));
    return match?.[1]?.trim().replace(/^["']|["']$/g, '') || undefined;
  } catch {
    return undefined;
  }
}

function getSupabaseCredentials(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL || fromEnvFile('SUPABASE_URL');
  // run-migrations.sh accepts either name; match that.
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    fromEnvFile('SUPABASE_SERVICE_ROLE_KEY') ||
    fromEnvFile('SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Could not resolve Supabase credentials. Set SUPABASE_URL and ' +
      'SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY) as env vars or in .env'
    );
  }
  return { url, serviceRoleKey };
}

async function main(): Promise<void> {
  const credPath = path.join(process.cwd(), 'data', 'user-credentials.json');
  if (!fs.existsSync(credPath)) {
    throw new Error(`Not found: ${credPath}`);
  }
  const creds: ManualCredential[] = JSON.parse(fs.readFileSync(credPath, 'utf8'));

  const { url, serviceRoleKey } = getSupabaseCredentials();
  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Auth users carry the display name in user_metadata (set at creation);
  // fall back to the public.users row keyed by the same id.
  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw new Error(`listUsers failed: ${listError.message}`);

  const { data: profiles } = await supabase.from('users').select('id, name');
  const nameById = new Map((profiles || []).map((p: any) => [p.id, p.name]));

  const byName = new Map<string, string>();
  for (const u of list?.users || []) {
    const name = (u.user_metadata as any)?.name ?? nameById.get(u.id);
    if (name) byName.set(name, u.id);
  }

  console.log(`${DRY_RUN ? '[dry-run] ' : ''}Auth users: ${list?.users?.length ?? 0}, credentials: ${creds.length}\n`);

  let updated = 0;
  let missing = 0;

  for (const c of creds) {
    const id = byName.get(c.name);
    if (!id) {
      console.warn(`  MISS  ${c.name}: no auth user with this name`);
      missing++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  would update ${c.name} -> email from credentials file, password reset`);
      updated++;
      continue;
    }

    const { error } = await supabase.auth.admin.updateUserById(id, {
      email: c.email,
      password: c.password,
      email_confirm: true,
    });
    if (error) {
      throw new Error(`Failed to update ${c.name}: ${error.message}`);
    }
    console.log(`  OK    ${c.name}`);
    updated++;
  }

  console.log(`\n${DRY_RUN ? 'Would update' : 'Updated'}: ${updated}   Missing: ${missing}`);
  if (missing > 0) {
    console.warn('Users listed above kept their generated email and password.');
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
