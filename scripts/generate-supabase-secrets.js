#!/usr/bin/env node
/**
 * Generates a fresh set of production secrets for the self-hosted Supabase
 * stack in deploy/supabase/ and prints them as KEY=VALUE lines.
 *
 * Usage:
 *   node scripts/generate-supabase-secrets.js > deploy/supabase/.env.secrets
 *
 * The output is meant to be merged into deploy/supabase/.env (see
 * deploy/supabase/.env.example for the full variable set) and then stored
 * somewhere durable (password manager) — running this again produces a
 * completely different set of secrets, invalidating all existing sessions
 * and API keys.
 */

const crypto = require('crypto');

function randomBase64Url(bytes) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const data = `${encode(header)}.${encode(payload)}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

const now = Math.floor(Date.now() / 1000);
const tenYears = 10 * 365 * 24 * 60 * 60;

const jwtSecret = randomBase64Url(48); // >32 chars required
const iss = 'supabase';

const anonKey = signJwt({ role: 'anon', iss, iat: now, exp: now + tenYears }, jwtSecret);
const serviceRoleKey = signJwt({ role: 'service_role', iss, iat: now, exp: now + tenYears }, jwtSecret);

const dashboardPassword = randomBase64Url(18);

const out = {
  POSTGRES_PASSWORD: randomBase64Url(24),
  JWT_SECRET: jwtSecret,
  ANON_KEY: anonKey,
  SERVICE_ROLE_KEY: serviceRoleKey,
  DASHBOARD_USERNAME: 'gm',
  DASHBOARD_PASSWORD: dashboardPassword,
  SECRET_KEY_BASE: randomHex(64),
  VAULT_ENC_KEY: randomBase64Url(24).slice(0, 32), // must be exactly 32 chars
  PG_META_CRYPTO_KEY: randomBase64Url(24).slice(0, 32),
  LOGFLARE_PUBLIC_ACCESS_TOKEN: randomHex(24),
  LOGFLARE_PRIVATE_ACCESS_TOKEN: randomHex(24),
  S3_PROTOCOL_ACCESS_KEY_ID: randomHex(16),
  S3_PROTOCOL_ACCESS_KEY_SECRET: randomHex(32),
  MINIO_ROOT_USER: 'supa-storage',
  MINIO_ROOT_PASSWORD: randomBase64Url(18),
  POOLER_TENANT_ID: randomHex(8),
};

for (const [key, value] of Object.entries(out)) {
  console.log(`${key}=${value}`);
}

console.error('\n--- Studio dashboard login (save this now) ---');
console.error(`  Username: ${out.DASHBOARD_USERNAME}`);
console.error(`  Password: ${out.DASHBOARD_PASSWORD}`);
