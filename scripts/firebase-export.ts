/**
 * Firebase Data Export Script
 *
 * Exports all Firestore collections and subcollections to JSON files.
 * This is Phase 4 of the Supabase migration.
 *
 * Usage:
 *   npx tsx scripts/firebase-export.ts
 *   npm run migrate:export
 *
 * Requirements:
 *   - Firebase service account key file at ./firebase-service-account.json
 *   - Or set GOOGLE_APPLICATION_CREDENTIALS environment variable
 *
 * Output:
 *   data/export/{collection}.json for each collection
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

const EXPORT_DIR = path.join(process.cwd(), 'data', 'export');
const COMBAT_PATH = 'combat/tKthlBKLy0JuVaPnXWzY/fighters';

// Fields to exclude from export
const EXCLUDED_FIELDS = ['isPrivate'];

interface ExportStats {
  collection: string;
  count: number;
  subcollections?: { name: string; count: number }[];
}

function initializeFirebase(): admin.firestore.Firestore {
  const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } else {
    throw new Error(
      'Firebase credentials not found. Please provide:\n' +
      '  - firebase-service-account.json file in project root, OR\n' +
      '  - GOOGLE_APPLICATION_CREDENTIALS environment variable'
    );
  }

  return admin.firestore();
}

function cleanDocument(data: admin.firestore.DocumentData): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (EXCLUDED_FIELDS.includes(key)) continue;

    if (value instanceof admin.firestore.Timestamp) {
      cleaned[key] = { seconds: value.seconds, nanoseconds: value.nanoseconds };
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

async function exportCollection(
  db: admin.firestore.Firestore,
  collectionName: string
): Promise<{ id: string; data: Record<string, unknown> }[]> {
  const snapshot = await db.collection(collectionName).get();
  const docs: { id: string; data: Record<string, unknown> }[] = [];

  snapshot.forEach((doc) => {
    docs.push({
      id: doc.id,
      data: cleanDocument(doc.data()),
    });
  });

  return docs;
}

async function exportSubcollections(
  db: admin.firestore.Firestore,
  parentCollection: string,
  subCollectionName: string,
  parentIds: string[]
): Promise<{ parentId: string; id: string; data: Record<string, unknown> }[]> {
  const allDocs: { parentId: string; id: string; data: Record<string, unknown> }[] = [];

  for (const parentId of parentIds) {
    const subPath = `${parentCollection}/${parentId}/${subCollectionName}`;
    const snapshot = await db.collection(subPath).get();

    snapshot.forEach((doc) => {
      allDocs.push({
        parentId,
        id: doc.id,
        data: cleanDocument(doc.data()),
      });
    });
  }

  return allDocs;
}

function writeExport(filename: string, data: unknown): void {
  const filepath = path.join(EXPORT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
}

async function main() {
  console.log('='.repeat(80));
  console.log('Firebase Data Export');
  console.log('='.repeat(80));
  console.log('');

  const db = initializeFirebase();
  const stats: ExportStats[] = [];

  // Create export directory
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  // ========================================================================
  // Top-level collections
  // ========================================================================

  const topLevelCollections = [
    'users',
    'people',
    'places',
    'quests',
    'projects',
    'achievements',
    'inventory',
    'notes',
    'rolls',
    'flows',
    'rules',
    'campaign',
    'timelines',
  ];

  const collectionData: Record<string, { id: string; data: Record<string, unknown> }[]> = {};

  for (const name of topLevelCollections) {
    console.log(`Exporting ${name}...`);
    const docs = await exportCollection(db, name);
    collectionData[name] = docs;
    writeExport(`${name}.json`, docs);
    stats.push({ collection: name, count: docs.length });
    console.log(`  ${docs.length} documents`);
  }

  // ========================================================================
  // Subcollections: people/{id}/info, places/{id}/info, quests/{id}/info
  // ========================================================================

  const collectionsWithInfo = ['people', 'places', 'quests'];

  for (const parentCol of collectionsWithInfo) {
    const parentIds = collectionData[parentCol].map((d) => d.id);
    console.log(`Exporting ${parentCol}/*/info subcollections...`);
    const infoDocs = await exportSubcollections(db, parentCol, 'info', parentIds);
    writeExport(`${parentCol}_info.json`, infoDocs);

    const parentStat = stats.find((s) => s.collection === parentCol);
    if (parentStat) {
      parentStat.subcollections = parentStat.subcollections || [];
      parentStat.subcollections.push({ name: 'info', count: infoDocs.length });
    }
    console.log(`  ${infoDocs.length} info documents`);
  }

  // ========================================================================
  // Subcollections: timelines/{id}/events
  // ========================================================================

  const timelineIds = collectionData['timelines'].map((d) => d.id);
  console.log('Exporting timelines/*/events subcollections...');
  const eventDocs = await exportSubcollections(db, 'timelines', 'events', timelineIds);
  writeExport('timelines_events.json', eventDocs);

  const timelineStat = stats.find((s) => s.collection === 'timelines');
  if (timelineStat) {
    timelineStat.subcollections = [{ name: 'events', count: eventDocs.length }];
  }
  console.log(`  ${eventDocs.length} event documents`);

  // ========================================================================
  // Combat fighters (hardcoded path)
  // ========================================================================

  console.log(`Exporting combat fighters from ${COMBAT_PATH}...`);
  try {
    const fighterSnapshot = await db.collection(COMBAT_PATH).get();
    const fighters: { id: string; data: Record<string, unknown> }[] = [];

    fighterSnapshot.forEach((doc) => {
      fighters.push({
        id: doc.id,
        data: cleanDocument(doc.data()),
      });
    });

    writeExport('combat_fighters.json', fighters);
    stats.push({ collection: 'combat_fighters', count: fighters.length });
    console.log(`  ${fighters.length} fighters`);
  } catch (error) {
    console.log('  No combat data found (skipping)');
    writeExport('combat_fighters.json', []);
    stats.push({ collection: 'combat_fighters', count: 0 });
  }

  // ========================================================================
  // Summary
  // ========================================================================

  console.log('');
  console.log('='.repeat(80));
  console.log('EXPORT SUMMARY');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Output directory: ${EXPORT_DIR}`);
  console.log('');

  let totalDocs = 0;
  for (const stat of stats) {
    const subInfo = stat.subcollections
      ? ` (+ ${stat.subcollections.map((s) => `${s.count} ${s.name}`).join(', ')})`
      : '';
    console.log(`  ${stat.collection}: ${stat.count} documents${subInfo}`);
    totalDocs += stat.count;
    if (stat.subcollections) {
      totalDocs += stat.subcollections.reduce((sum, s) => sum + s.count, 0);
    }
  }

  console.log('');
  console.log(`Total: ${totalDocs} documents exported`);
  console.log('');

  // Write stats file for verification in later phases
  writeExport('_export_stats.json', {
    exportedAt: new Date().toISOString(),
    stats,
    totalDocuments: totalDocs,
  });

  console.log('Export complete. Run npm run migrate:transform next.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Export failed:', error);
    process.exit(1);
  });
