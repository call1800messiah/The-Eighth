/**
 * Firebase to Supabase Storage Migration Script
 *
 * Downloads all files from Firebase Storage and uploads them to
 * Supabase Storage, keeping the same path structure.
 *
 * Usage:
 *   npx tsx scripts/migrate-storage.ts
 *   npm run migrate:storage
 *
 * Requirements:
 *   - Firebase service account key file at ./firebase-service-account.json
 *   - Local Supabase running (npx supabase start)
 *   - Or set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 *   - Or set FIREBASE_STORAGE_BUCKET env var to override bucket name
 */

import * as admin from 'firebase-admin';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_BUCKET = 'the-eighth';

interface MigrationResult {
  path: string;
  size: number;
  status: 'uploaded' | 'skipped' | 'failed';
  error?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getFirebaseBucket(): string {
  if (process.env.FIREBASE_STORAGE_BUCKET) {
    return process.env.FIREBASE_STORAGE_BUCKET;
  }
  // Read project ID from service account
  const saPath = path.join(process.cwd(), 'firebase-service-account.json');
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  return `${sa.project_id}.appspot.com`;
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

function initializeFirebase(storageBucket: string): admin.storage.Storage {
  const saPath = path.join(process.cwd(), 'firebase-service-account.json');

  if (fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket,
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket,
    });
  } else {
    throw new Error(
      'Firebase credentials not found. Please provide:\n' +
      '  - firebase-service-account.json file in project root, OR\n' +
      '  - GOOGLE_APPLICATION_CREDENTIALS environment variable'
    );
  }

  return admin.storage();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================================
// MIGRATION
// ============================================================================

async function listAllFiles(bucket: any): Promise<{ name: string; size: number }[]> {
  const [files] = await bucket.getFiles();
  return files.map((file: any) => ({
    name: file.name as string,
    size: parseInt(file.metadata.size as string, 10) || 0,
  }));
}

async function downloadFile(bucket: any, filePath: string): Promise<Buffer> {
  const [contents] = await bucket.file(filePath).download();
  return contents;
}

async function uploadToSupabase(
  supabase: SupabaseClient,
  filePath: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(filePath, data, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed for ${filePath}: ${error.message}`);
  }
}

function guessContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.pdf': 'application/pdf',
    '.json': 'application/json',
  };
  return types[ext] || 'application/octet-stream';
}

async function main() {
  console.log('='.repeat(80));
  console.log('Firebase to Supabase Storage Migration');
  console.log('='.repeat(80));
  console.log('');

  // Initialize services
  const firebaseBucket = getFirebaseBucket();
  console.log(`Firebase Storage bucket: ${firebaseBucket}`);

  const storage = initializeFirebase(firebaseBucket);
  const bucket = storage.bucket();

  const { url, serviceRoleKey } = getSupabaseCredentials();
  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  console.log(`Supabase URL: ${url}`);
  console.log(`Supabase bucket: ${SUPABASE_BUCKET}`);
  console.log('');

  // List all files in Firebase Storage
  console.log('Listing files in Firebase Storage...');
  const files = await listAllFiles(bucket);
  console.log(`  Found ${files.length} files\n`);

  if (files.length === 0) {
    console.log('No files to migrate.');
    return;
  }

  // Group files by folder for display
  const byFolder = new Map<string, number>();
  let totalSize = 0;
  for (const file of files) {
    const folder = file.name.split('/')[0] || 'root';
    byFolder.set(folder, (byFolder.get(folder) || 0) + 1);
    totalSize += file.size;
  }
  console.log('Files by folder:');
  for (const [folder, count] of byFolder) {
    console.log(`  ${folder}/: ${count} files`);
  }
  console.log(`  Total size: ${formatSize(totalSize)}\n`);

  // Migrate files
  console.log('Migrating files...');
  const results: MigrationResult[] = [];
  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const progress = `[${i + 1}/${files.length}]`;

    try {
      // Download from Firebase
      const data = await downloadFile(bucket, file.name);
      const contentType = guessContentType(file.name);

      // Upload to Supabase
      await uploadToSupabase(supabase, file.name, data, contentType);

      results.push({ path: file.name, size: file.size, status: 'uploaded' });
      uploaded++;
      console.log(`  ${progress} ${file.name} (${formatSize(file.size)})`);
    } catch (error: any) {
      results.push({
        path: file.name,
        size: file.size,
        status: 'failed',
        error: error.message,
      });
      failed++;
      console.error(`  ${progress} FAILED: ${file.name} - ${error.message}`);
    }
  }

  // Verify file counts
  console.log('\nVerifying Supabase Storage...');
  const { data: supabaseFiles, error: listError } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .list('', { limit: 1000 });

  // List all folders and count files recursively
  let supabaseCount = 0;
  const folders = supabaseFiles?.filter(f => f.id === null).map(f => f.name) || [];
  const topLevelFiles = supabaseFiles?.filter(f => f.id !== null).length || 0;
  supabaseCount += topLevelFiles;

  for (const folder of folders) {
    const { data: folderFiles } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .list(folder, { limit: 1000 });
    supabaseCount += folderFiles?.filter(f => f.id !== null).length || 0;
  }

  // Summary
  console.log('');
  console.log('='.repeat(80));
  console.log('STORAGE MIGRATION SUMMARY');
  console.log('='.repeat(80));
  console.log('');
  console.log(`  Firebase files:  ${files.length}`);
  console.log(`  Uploaded:        ${uploaded}`);
  console.log(`  Failed:          ${failed}`);
  console.log(`  Supabase files:  ${supabaseCount}`);
  console.log(`  Total size:      ${formatSize(totalSize)}`);
  console.log('');

  if (failed > 0) {
    console.log('FAILED FILES:');
    for (const r of results.filter(r => r.status === 'failed')) {
      console.log(`  ${r.path}: ${r.error}`);
    }
    console.log('');
  }

  const match = uploaded === files.length;
  if (match) {
    console.log('All files migrated successfully.');
  } else {
    console.log(`WARNING: ${failed} file(s) failed to migrate.`);
  }

  // Write results
  const resultsPath = path.join(process.cwd(), 'data', 'export', '_storage_migration.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    migratedAt: new Date().toISOString(),
    firebaseFiles: files.length,
    uploaded,
    failed,
    supabaseFiles: supabaseCount,
    totalBytes: totalSize,
    results,
  }, null, 2), 'utf8');
  console.log(`\nResults written to ${resultsPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Storage migration failed:', error.message || error);
    process.exit(1);
  });
