// Copies the calendar engine and the tenant's calendar definitions into src/calendar/,
// so the MCP image (built with mcp/ as its context) needs nothing from outside it.
// Node fs only: runs the same on Windows and Linux.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const mcpRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(mcpRoot, '..');

function tenant() {
  if (process.env.NG_APP_TENANT?.trim()) return process.env.NG_APP_TENANT.trim();
  const envFile = join(repoRoot, '.env');
  if (existsSync(envFile)) {
    const match = readFileSync(envFile, 'utf8').match(/^\s*NG_APP_TENANT\s*=\s*(.*?)\s*$/m);
    const value = match?.[1].replace(/^["']|["']$/g, '').trim();
    if (value) return value;
  }
  return 'the-eighth';
}

const source = join(repoRoot, 'libs', 'fantasy-calendar');
const target = join(mcpRoot, 'src', 'calendar', 'engine');
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const entry of readdirSync(source, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
    copyFileSync(join(source, entry.name), join(target, entry.name));
  }
}

const name = tenant();
const rulesFile = join(repoRoot, 'src', 'assets', name, 'rules.json');
if (!existsSync(rulesFile)) throw new Error(`sync-calendar: ${rulesFile} not found (tenant "${name}")`);
const { calendars } = JSON.parse(readFileSync(rulesFile, 'utf8'));
if (!calendars?.default || !Array.isArray(calendars.list)) {
  throw new Error(`sync-calendar: ${rulesFile} has no calendars { default, list }`);
}
writeFileSync(join(mcpRoot, 'src', 'calendar', 'calendars.json'), JSON.stringify(calendars, null, 2) + '\n');
console.log(`sync-calendar: engine + calendars of "${name}" copied to src/calendar`);
