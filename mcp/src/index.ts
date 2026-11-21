import { loadConfig } from './config.js';
import { AssistantSession, SupabaseGmApprover } from './supabase.js';
import { SupabaseOAuthStore } from './oauth/store.js';
import { TheEighthOAuthProvider } from './oauth/provider.js';
import { EntityRepository } from './tools/entities.js';
import { QueryReader } from './tools/query.js';
import { SchemaCatalog } from './tools/schema.js';
import { createApp } from './app.js';

const config = loadConfig();
const session = new AssistantSession(config.supabase);

// Say at startup if the assistant user is missing or misconfigured, but keep
// running: every request signs in again, so finishing the setup (mcp/README.md)
// fixes it without a restart, and the container does not crash-loop meanwhile.
session.ready().then(
  () => console.log('Signed in as the assistant user'),
  error => console.error(`Not ready: ${error.message}`),
);

const provider = new TheEighthOAuthProvider(
  new SupabaseOAuthStore(session),
  new SupabaseGmApprover(config.supabase),
  new URL('/mcp', config.publicUrl),
);
const repo = new EntityRepository(() => session.ready(), config.publicUrl);
const reader = new QueryReader(() => session.ready(), new SchemaCatalog(() => session.ready()));
const app = createApp({ publicUrl: config.publicUrl, provider, repo, reader, ready: () => session.ready() });

const cleanup = setInterval(() => {
  provider.cleanup().catch(error => console.error('cleanup failed', error));
}, 60 * 60 * 1000);

const server = app.listen(config.port, () => {
  console.log(`MCP server listening on :${config.port}, public endpoint ${new URL('/mcp', config.publicUrl).href}`);
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    clearInterval(cleanup);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
