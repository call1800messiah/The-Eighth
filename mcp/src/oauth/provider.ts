import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import type { AuthorizationParams, OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import { InvalidClientMetadataError, InvalidGrantError, InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';

import type { GmApprover } from '../supabase.js';
import type { OAuthStore } from './store.js';
import { errorPage, loginPage } from './login-page.js';

export const ACCESS_TOKEN_SECONDS = 60 * 60;
export const REFRESH_TOKEN_SECONDS = 30 * 24 * 60 * 60;
const CODE_SECONDS = 5 * 60;
const LOGIN_SECONDS = 10 * 60;
/** How long a verified access token is trusted without asking the database. */
const VERIFY_CACHE_MS = 30 * 1000;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Redirect URIs a client may register: claude.ai's connector callback, and
 * loopback on any port for Claude Code and other local clients (RFC 8252).
 */
export function isAllowedRedirectUri(uri: string): boolean {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  if (url.href === 'https://claude.ai/api/mcp/auth_callback') {
    return true;
  }
  return url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname) && !url.username && !url.password;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newToken(): string {
  return randomBytes(32).toString('base64url');
}

interface PendingLogin {
  client: OAuthClientInformationFull;
  params: AuthorizationParams;
  expiresAt: number;
  attempts: number;
}

interface IssuedCode {
  clientId: string;
  grantId: string;
  codeChallenge: string;
  redirectUri: string;
  expiresAt: number;
}

/**
 * The MCP server's own small OAuth 2.1 authorization server, plugged into the
 * SDK's endpoint handlers (which do request validation, PKCE checks and rate
 * limiting).
 *
 * Authorizing means a GM logs in with their app account. That approval is
 * recorded in the database by the GM's own session (approve_mcp_grant), and
 * every token issued afterwards belongs to that grant. Tokens only ever let a
 * client act as the assistant user; the GM's credentials are used once and
 * not kept.
 *
 * Login requests and authorization codes live in memory: they last minutes,
 * and a restart just means connecting again.
 */
export class TheEighthOAuthProvider implements OAuthServerProvider {
  private pendingLogins = new Map<string, PendingLogin>();
  private codes = new Map<string, IssuedCode>();
  private verified = new Map<string, { info: AuthInfo; until: number }>();
  private touched = new Map<string, number>();

  constructor(
    private store: OAuthStore,
    private approver: GmApprover,
    /** The MCP endpoint, `<origin>/mcp`: every token is for this resource. */
    private resource: URL,
  ) {}

  get clientsStore(): OAuthRegisteredClientsStore {
    return {
      getClient: (clientId: string) => this.store.getClient(clientId),
      registerClient: async (client) => {
        const full = client as OAuthClientInformationFull;
        const uris = (full.redirect_uris ?? []).map(String);
        if (uris.length === 0 || !uris.every(isAllowedRedirectUri)) {
          throw new InvalidClientMetadataError(
            'Only https://claude.ai/api/mcp/auth_callback and http loopback redirect URIs are accepted');
        }
        await this.store.saveClient(full);
        return full;
      },
    };
  }

  /** Shows the GM login page; the form posts to handleLogin(). */
  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void> {
    this.sweep();
    // Opening the login page needs no credentials, so bound what it can pile up.
    if (this.pendingLogins.size >= 1000) {
      this.pendingLogins.delete(this.pendingLogins.keys().next().value!);
    }
    const requestId = newToken();
    this.pendingLogins.set(requestId, { client, params, expiresAt: Date.now() + LOGIN_SECONDS * 1000, attempts: 0 });
    res.status(200).type('html').send(loginPage({
      requestId,
      clientName: client.client_name || 'Ein MCP-Client',
      redirectHost: new URL(params.redirectUri).host,
    }));
  }

  /** POST /mcp/oauth/login */
  async handleLogin(req: Request, res: Response): Promise<void> {
    res.setHeader('Cache-Control', 'no-store');
    const { request_id: requestId, email, password } = (req.body ?? {}) as Record<string, string | undefined>;
    const pending = requestId ? this.pendingLogins.get(requestId) : undefined;
    if (!pending || pending.expiresAt < Date.now()) {
      if (requestId) this.pendingLogins.delete(requestId);
      res.status(400).type('html').send(errorPage('Diese Anmeldung ist abgelaufen. Bitte starte die Verbindung in Claude neu.'));
      return;
    }

    const retry = (error: string, status = 401) => {
      res.status(status).type('html').send(loginPage({
        requestId: requestId!,
        clientName: pending.client.client_name || 'Ein MCP-Client',
        redirectHost: new URL(pending.params.redirectUri).host,
        error,
      }));
    };

    if (!email || !password) {
      retry('Bitte E-Mail und Passwort eingeben.', 400);
      return;
    }

    // Five tries per login page, on top of the per-IP limit in front of this.
    pending.attempts += 1;
    if (pending.attempts > 5) {
      this.pendingLogins.delete(requestId!);
      res.status(429).type('html').send(errorPage('Zu viele Versuche. Bitte starte die Verbindung in Claude neu.'));
      return;
    }

    const approval = await this.approver.approve(email, password, pending.client.client_id, pending.client.client_name || 'MCP-Client');
    if (!approval.ok) {
      const message = {
        invalid_credentials: 'E-Mail oder Passwort stimmt nicht.',
        not_gm: 'Nur ein Spielleitungs-Konto kann Claude verbinden.',
        error: 'Die Anmeldung hat nicht geklappt. Bitte versuche es noch einmal.',
      }[approval.reason];
      retry(message, approval.reason === 'error' ? 502 : 401);
      return;
    }

    this.pendingLogins.delete(requestId!);
    const code = newToken();
    this.codes.set(hashToken(code), {
      clientId: pending.client.client_id,
      grantId: approval.grantId,
      codeChallenge: pending.params.codeChallenge,
      redirectUri: pending.params.redirectUri,
      expiresAt: Date.now() + CODE_SECONDS * 1000,
    });

    const target = new URL(pending.params.redirectUri);
    target.searchParams.set('code', code);
    if (pending.params.state !== undefined) {
      target.searchParams.set('state', pending.params.state);
    }
    res.redirect(302, target.href);
  }

  async challengeForAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string): Promise<string> {
    return this.findCode(client, authorizationCode).codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string,
  ): Promise<OAuthTokens> {
    const code = this.findCode(client, authorizationCode);
    // Single use: gone before anything else can go wrong.
    this.codes.delete(hashToken(authorizationCode));
    if (redirectUri !== undefined && redirectUri !== code.redirectUri) {
      throw new InvalidGrantError('redirect_uri does not match the authorization request');
    }
    return this.issueTokens(code.grantId);
  }

  async exchangeRefreshToken(client: OAuthClientInformationFull, refreshToken: string): Promise<OAuthTokens> {
    const hash = hashToken(refreshToken);
    const record = await this.store.findToken(hash);
    if (!record || record.kind !== 'refresh' || record.clientId !== client.client_id) {
      throw new InvalidGrantError('Unknown refresh token');
    }
    if (record.grantRevoked) {
      throw new InvalidGrantError('This connection was revoked');
    }
    if (record.expiresAt < new Date()) {
      throw new InvalidGrantError('Refresh token expired');
    }
    // Rotation: each refresh token works once. Seeing one again means it was
    // copied, so the whole connection is ended (OAuth 2.1, section 4.3.1).
    if (record.usedAt || !(await this.store.markTokenUsed(hash))) {
      await this.store.revokeGrant(record.grantId);
      this.forgetGrant(record.grantId);
      throw new InvalidGrantError('Refresh token was already used; the connection has been revoked');
    }
    return this.issueTokens(record.grantId);
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const hash = hashToken(token);
    const cached = this.verified.get(hash);
    if (cached && cached.until > Date.now()) {
      return cached.info;
    }
    this.verified.delete(hash);

    const record = await this.store.findToken(hash);
    if (!record || record.kind !== 'access' || record.grantRevoked || record.expiresAt < new Date()) {
      throw new InvalidTokenError('Invalid or expired access token');
    }
    const info: AuthInfo = {
      token,
      clientId: record.clientId,
      scopes: [],
      expiresAt: Math.floor(record.expiresAt.getTime() / 1000),
      resource: this.resource,
      extra: { grantId: record.grantId },
    };
    this.verified.set(hash, { info, until: Math.min(Date.now() + VERIFY_CACHE_MS, record.expiresAt.getTime()) });

    const lastTouch = this.touched.get(record.grantId) ?? 0;
    if (Date.now() - lastTouch > TOUCH_INTERVAL_MS) {
      this.touched.set(record.grantId, Date.now());
      this.store.touchGrant(record.grantId).catch(error => console.error('touchGrant failed', error));
    }
    return info;
  }

  /** Revoking either token ends the whole connection. */
  async revokeToken(client: OAuthClientInformationFull, request: OAuthTokenRevocationRequest): Promise<void> {
    const record = await this.store.findToken(hashToken(request.token));
    // RFC 7009: unknown tokens are not an error.
    if (record && record.clientId === client.client_id) {
      await this.store.revokeGrant(record.grantId);
      this.forgetGrant(record.grantId);
    }
  }

  /** Housekeeping, run periodically. */
  async cleanup(): Promise<void> {
    this.sweep();
    await this.store.deleteExpiredTokens();
  }

  private async issueTokens(grantId: string): Promise<OAuthTokens> {
    const accessToken = newToken();
    const refreshToken = newToken();
    const now = Date.now();
    await this.store.saveToken(hashToken(accessToken), grantId, 'access', new Date(now + ACCESS_TOKEN_SECONDS * 1000));
    await this.store.saveToken(hashToken(refreshToken), grantId, 'refresh', new Date(now + REFRESH_TOKEN_SECONDS * 1000));
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_SECONDS,
      refresh_token: refreshToken,
    };
  }

  private findCode(client: OAuthClientInformationFull, authorizationCode: string): IssuedCode {
    const code = this.codes.get(hashToken(authorizationCode));
    if (!code || code.expiresAt < Date.now() || !safeEqual(code.clientId, client.client_id)) {
      throw new InvalidGrantError('Invalid or expired authorization code');
    }
    return code;
  }

  private forgetGrant(grantId: string) {
    for (const [hash, entry] of this.verified) {
      if (entry.info.extra?.['grantId'] === grantId) this.verified.delete(hash);
    }
  }

  private sweep() {
    const now = Date.now();
    for (const [id, login] of this.pendingLogins) if (login.expiresAt < now) this.pendingLogins.delete(id);
    for (const [hash, code] of this.codes) if (code.expiresAt < now) this.codes.delete(hash);
    for (const [hash, entry] of this.verified) if (entry.until < now) this.verified.delete(hash);
  }
}


function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
