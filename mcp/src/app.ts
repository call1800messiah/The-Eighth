import express, { type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { authorizationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/authorize.js';
import { tokenHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/token.js';
import { clientRegistrationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/register.js';
import { revocationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/revoke.js';
import { metadataHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/metadata.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import type { OAuthMetadata, OAuthProtectedResourceMetadata } from '@modelcontextprotocol/sdk/shared/auth.js';

import type { TheEighthOAuthProvider } from './oauth/provider.js';
import { createMcpServer } from './tools/register.js';
import type { EntityRepository } from './tools/entities.js';

export interface AppOptions {
  /** Public origin, e.g. https://campaign.example.com */
  publicUrl: URL;
  provider: TheEighthOAuthProvider;
  repo: EntityRepository;
  /** Off in tests that make many requests. */
  rateLimits?: boolean;
  /** Resolves once the assistant user is signed in; rejects with the reason it is not. */
  ready?: () => Promise<unknown>;
}

/**
 * Everything is served under the app's own origin, behind its nginx:
 *
 *   /mcp                                         MCP endpoint (Streamable HTTP, bearer token)
 *   /mcp/oauth/{authorize,login,token,register,revoke}
 *   /.well-known/oauth-protected-resource[/mcp]  RFC 9728
 *   /.well-known/oauth-authorization-server      RFC 8414 (issuer is the origin)
 */
export function createApp({ publicUrl, provider, repo, rateLimits = true, ready }: AppOptions): express.Express {
  const app = express();
  app.disable('x-powered-by');
  // Requests arrive through the app's nginx on the Docker network, which
  // passes the client address on; trust private-range hops only.
  app.set('trust proxy', 'loopback, uniquelocal');

  const origin = publicUrl.origin;
  const resource = new URL('/mcp', origin);
  const endpoint = (path: string) => new URL(`/mcp/oauth/${path}`, origin).href;
  const limit = rateLimits ? undefined : false as const;

  const authServerMetadata: OAuthMetadata = {
    issuer: new URL('/', origin).href,
    authorization_endpoint: endpoint('authorize'),
    token_endpoint: endpoint('token'),
    registration_endpoint: endpoint('register'),
    revocation_endpoint: endpoint('revoke'),
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
    revocation_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
  };
  const resourceMetadata: OAuthProtectedResourceMetadata = {
    resource: resource.href,
    authorization_servers: [authServerMetadata.issuer],
    resource_name: 'TheEighth',
  };
  const resourceMetadataUrl = new URL('/.well-known/oauth-protected-resource/mcp', origin).href;

  app.use('/.well-known/oauth-authorization-server', metadataHandler(authServerMetadata));
  app.use('/.well-known/oauth-protected-resource/mcp', metadataHandler(resourceMetadata));
  app.use('/.well-known/oauth-protected-resource', metadataHandler(resourceMetadata));

  // The assistant session is needed by every tool and token check; say so
  // plainly instead of failing deep inside the OAuth handlers.
  app.use('/mcp', async (req, res, next) => {
    if (!ready || req.path === '/health') {
      next();
      return;
    }
    try {
      await ready();
      next();
    } catch (error) {
      console.error(`Not ready: ${(error as Error).message}`);
      res.status(503).json({ error: 'temporarily_unavailable', error_description: 'The server is not set up yet; see mcp/README.md' });
    }
  });

  app.use('/mcp/oauth/authorize', authorizationHandler({ provider, rateLimit: limit }));
  app.use('/mcp/oauth/token', tokenHandler({ provider, rateLimit: limit }));
  // Registered clients keep their secret: claude.ai does not re-register
  // when a secret expires, it just stops working.
  app.use('/mcp/oauth/register', clientRegistrationHandler({
    clientsStore: provider.clientsStore, clientSecretExpirySeconds: 0, rateLimit: limit,
  }));
  app.use('/mcp/oauth/revoke', revocationHandler({ provider, rateLimit: limit }));

  // Password guessing against GM accounts: per client IP, across login pages.
  const loginLimit = rateLimits
    ? rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false })
    : (_req: Request, _res: Response, next: () => void) => next();
  app.post('/mcp/oauth/login', loginLimit, express.urlencoded({ extended: false, limit: '10kb' }),
    (req, res) => provider.handleLogin(req, res).catch(error => {
      console.error('login failed', error);
      if (!res.headersSent) res.status(500).send('Internal error');
    }));

  app.get('/mcp/health', (_req, res) => { res.json({ ok: true }); });


  const bearer = requireBearerAuth({ verifier: provider, resourceMetadataUrl, expectedResource: resource });

  // Stateless: a fresh server and transport per request. The tools keep no
  // per-conversation state, so there is nothing to lose between requests.
  app.post('/mcp', bearer, express.json({ limit: '1mb' }), async (req, res) => {
    const server = createMcpServer(repo);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP request failed', error);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null });
      }
    }
  });

  // No server-initiated streams or sessions in stateless mode.
  app.all('/mcp', bearer, (_req, res) => {
    res.status(405).set('Allow', 'POST').json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null });
  });

  return app;
}
