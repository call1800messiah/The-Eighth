/**
 * Migrate per-info-box access from Firebase to Supabase document_access.
 *
 * In Firebase, each info subcollection document had its own access[] array.
 * The main migration (transform-and-migrate.ts) migrated info_boxes rows
 * but skipped their per-doc access arrays. This script backfills those
 * as document_access entries with entity_type = 'info_box'.
 *
 * Matching strategy:
 *   Firebase info docs are matched to Supabase info_boxes rows by
 *   (entity_type, type, content) which is unique across the dataset.
 *
 * Usage:
 *   npx tsx scripts/migrate-info-access.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const EXPORT_DIR = path.join(process.cwd(), 'data', 'export');

const INFO_TYPE_MAP: Record<number, string> = {
  0: 'appearance',
  1: 'background',
  2: 'note',
  3: 'character',
  4: 'goals',
  5: 'reward',
};

interface SubcollectionDoc {
  parentId: string;
  id: string;
  data: Record<string, any>;
}

interface ExportDoc {
  id: string;
  data: Record<string, any>;
}

function loadJson<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, filename), 'utf8'));
}

function getSupabaseCredentials(): { url: string; serviceRoleKey: string } {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      url: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
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
    // Fall through
  }

  throw new Error(
    'Cannot determine Supabase credentials. Either:\n' +
    '  - Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars, or\n' +
    '  - Ensure local Supabase is running (npx supabase start)'
  );
}

async function main() {
  const { url, serviceRoleKey } = getSupabaseCredentials();
  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Load Firebase export data
  console.log('Loading Firebase export data...');
  const users: ExportDoc[] = loadJson('users.json');
  const peopleInfo: SubcollectionDoc[] = loadJson('people_info.json');
  const placesInfo: SubcollectionDoc[] = loadJson('places_info.json');
  const questsInfo: SubcollectionDoc[] = loadJson('quests_info.json');

  const gmFirebaseIds = new Set(
    users.filter(u => u.data.isGM).map(u => u.id)
  );

  console.log(`  ${peopleInfo.length} people_info, ${placesInfo.length} places_info, ${questsInfo.length} quests_info`);

  // 2. Build Firebase user ID → Supabase user UUID mapping
  console.log('Building user ID mapping...');
  const { data: supabaseUsers, error: usersError } = await supabase
    .from('users')
    .select('id, name');
  if (usersError) throw new Error(`Failed to query users: ${usersError.message}`);

  const firebaseToSupabaseUser = new Map<string, string>();
  for (const fbUser of users) {
    const sbUser = supabaseUsers.find(u => u.name === fbUser.data.name);
    if (sbUser) {
      firebaseToSupabaseUser.set(fbUser.id, sbUser.id);
    } else {
      console.warn(`  Warning: No Supabase user found for Firebase user "${fbUser.data.name}" (${fbUser.id})`);
    }
  }
  console.log(`  Mapped ${firebaseToSupabaseUser.size}/${users.length} users`);

  // 3. Load all Supabase info_boxes
  console.log('Loading Supabase info_boxes...');
  const { data: infoBoxes, error: infoError } = await supabase
    .from('info_boxes')
    .select('id, entity_type, type, content, owner_id');
  if (infoError) throw new Error(`Failed to query info_boxes: ${infoError.message}`);
  console.log(`  ${infoBoxes.length} info_boxes in Supabase`);

  // Build lookup: "entity_type|type|content" → info_box row
  // For duplicate keys, store as array and warn
  const infoLookup = new Map<string, any[]>();
  for (const box of infoBoxes) {
    const key = `${box.entity_type}|${box.type}|${box.content}`;
    if (!infoLookup.has(key)) infoLookup.set(key, []);
    infoLookup.get(key)!.push(box);
  }

  // 4. Match Firebase info docs to Supabase info_boxes and build document_access rows
  console.log('Matching Firebase info docs to Supabase info_boxes...');
  const rows: Record<string, any>[] = [];
  const seen = new Set<string>();
  let matched = 0;
  let unmatched = 0;
  let skippedNoAccess = 0;

  const processInfoDocs = (docs: SubcollectionDoc[], entityType: string) => {
    for (const doc of docs) {
      const access: string[] = doc.data.access || [];
      const ownerFirebaseId: string = doc.data.owner || '';

      // Filter to non-owner, non-GM users
      const grantees = access.filter(
        uid => uid !== ownerFirebaseId && !gmFirebaseIds.has(uid)
      );

      if (grantees.length === 0) {
        skippedNoAccess++;
        continue;
      }

      // Match to Supabase info_box
      const dbType = INFO_TYPE_MAP[doc.data.type as number] || 'note';
      const key = `${entityType}|${dbType}|${doc.data.content || ''}`;
      const matches = infoLookup.get(key);

      if (!matches || matches.length === 0) {
        unmatched++;
        console.warn(`  No match for ${entityType} info: "${(doc.data.content || '').substring(0, 40)}..."`);
        continue;
      }

      // If multiple matches, try to narrow by owner_id
      let infoBox = matches[0];
      if (matches.length > 1) {
        const ownerSupabaseId = firebaseToSupabaseUser.get(ownerFirebaseId);
        const ownerMatch = matches.find(m => m.owner_id === ownerSupabaseId);
        if (ownerMatch) {
          infoBox = ownerMatch;
        } else {
          console.warn(`  Ambiguous match (${matches.length} candidates) for: "${(doc.data.content || '').substring(0, 40)}..." - using first`);
        }
      }

      matched++;

      for (const userFirebaseId of grantees) {
        const userId = firebaseToSupabaseUser.get(userFirebaseId);
        if (!userId) continue;

        const dedupeKey = `info_box:${infoBox.id}:${userId}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        rows.push({
          id: crypto.randomUUID(),
          entity_type: 'info_box',
          entity_id: infoBox.id,
          user_id: userId,
        });
      }
    }
  };

  processInfoDocs(peopleInfo, 'person');
  processInfoDocs(placesInfo, 'place');
  processInfoDocs(questsInfo, 'quest');

  console.log(`  Matched: ${matched}, Unmatched: ${unmatched}, Skipped (no grantees): ${skippedNoAccess}`);
  console.log(`  document_access rows to insert: ${rows.length}`);

  if (rows.length === 0) {
    console.log('No rows to insert. Done.');
    return;
  }

  // 5. Insert document_access rows in batches
  console.log('Inserting document_access rows...');
  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('document_access').insert(batch);
    if (error) {
      console.error(`  Batch ${i}-${i + batch.length} failed: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`Done. Inserted ${inserted}/${rows.length} document_access entries for info_boxes.`);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
