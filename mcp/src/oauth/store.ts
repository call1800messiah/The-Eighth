import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';

import type { AssistantSession } from '../supabase.js';

export interface TokenRecord {
  grantId: string;
  clientId: string;
  kind: 'access' | 'refresh';
  expiresAt: Date;
  usedAt: Date | null;
  grantRevoked: boolean;
}

/** Where the OAuth server keeps clients, grants and (hashed) tokens. */
export interface OAuthStore {
  getClient(clientId: string): Promise<OAuthClientInformationFull | undefined>;
  saveClient(client: OAuthClientInformationFull): Promise<void>;
  saveToken(hash: string, grantId: string, kind: 'access' | 'refresh', expiresAt: Date): Promise<void>;
  findToken(hash: string): Promise<TokenRecord | undefined>;
  /** Marks a refresh token used. False if it already was (a replay or a race). */
  markTokenUsed(hash: string): Promise<boolean>;
  revokeGrant(grantId: string): Promise<void>;
  touchGrant(grantId: string): Promise<void>;
  deleteExpiredTokens(): Promise<void>;
}


/** The mcp_* tables (migration 013), written as the assistant user. */
export class SupabaseOAuthStore implements OAuthStore {
  constructor(private session: AssistantSession) {}

  private async db() {
    return this.session.ready();
  }

  async getClient(clientId: string) {
    const { data, error } = await (await this.db()).from('mcp_clients').select('metadata').eq('client_id', clientId).maybeSingle();
    if (error) throw new Error(error.message);
    return (data?.metadata as OAuthClientInformationFull | undefined) ?? undefined;
  }

  async saveClient(client: OAuthClientInformationFull) {
    const { error } = await (await this.db()).from('mcp_clients').insert({ client_id: client.client_id, metadata: client });
    if (error) throw new Error(error.message);
  }

  async saveToken(hash: string, grantId: string, kind: 'access' | 'refresh', expiresAt: Date) {
    const { error } = await (await this.db()).from('mcp_tokens').insert({
      token_hash: hash, grant_id: grantId, kind, expires_at: expiresAt.toISOString(),
    });
    if (error) throw new Error(error.message);
  }

  async findToken(hash: string): Promise<TokenRecord | undefined> {
    const { data, error } = await (await this.db())
      .from('mcp_tokens')
      .select('grant_id, kind, expires_at, used_at, mcp_grants(client_id, revoked_at)')
      .eq('token_hash', hash)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return undefined;
    const grant = data.mcp_grants as unknown as { client_id: string; revoked_at: string | null } | null;
    return {
      grantId: data.grant_id,
      clientId: grant?.client_id ?? '',
      kind: data.kind,
      expiresAt: new Date(data.expires_at),
      usedAt: data.used_at ? new Date(data.used_at) : null,
      grantRevoked: !grant || grant.revoked_at !== null,
    };
  }

  async markTokenUsed(hash: string) {
    const { data, error } = await (await this.db())
      .from('mcp_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token_hash', hash)
      .is('used_at', null)
      .select('token_hash');
    if (error) throw new Error(error.message);
    return (data ?? []).length === 1;
  }

  async revokeGrant(grantId: string) {
    const { error } = await (await this.db())
      .from('mcp_grants').update({ revoked_at: new Date().toISOString() }).eq('id', grantId).is('revoked_at', null);
    if (error) throw new Error(error.message);
  }

  async touchGrant(grantId: string) {
    const { error } = await (await this.db())
      .from('mcp_grants').update({ last_used_at: new Date().toISOString() }).eq('id', grantId);
    if (error) throw new Error(error.message);
  }

  async deleteExpiredTokens() {
    const { error } = await (await this.db())
      .from('mcp_tokens').delete().lt('expires_at', new Date().toISOString());
    if (error) throw new Error(error.message);
  }
}


/** For tests. */
export class MemoryOAuthStore implements OAuthStore {
  clients = new Map<string, OAuthClientInformationFull>();
  grants = new Map<string, { clientId: string; revoked: boolean; lastUsed?: Date }>();
  tokens = new Map<string, { grantId: string; kind: 'access' | 'refresh'; expiresAt: Date; usedAt: Date | null }>();

  async getClient(clientId: string) { return this.clients.get(clientId); }
  async saveClient(client: OAuthClientInformationFull) { this.clients.set(client.client_id, client); }
  async saveToken(hash: string, grantId: string, kind: 'access' | 'refresh', expiresAt: Date) {
    this.tokens.set(hash, { grantId, kind, expiresAt, usedAt: null });
  }
  async findToken(hash: string) {
    const token = this.tokens.get(hash);
    if (!token) return undefined;
    const grant = this.grants.get(token.grantId);
    return { ...token, clientId: grant?.clientId ?? '', grantRevoked: !grant || grant.revoked };
  }
  async markTokenUsed(hash: string) {
    const token = this.tokens.get(hash);
    if (!token || token.usedAt) return false;
    token.usedAt = new Date();
    return true;
  }
  async revokeGrant(grantId: string) {
    const grant = this.grants.get(grantId);
    if (grant) grant.revoked = true;
  }
  async touchGrant(grantId: string) {
    const grant = this.grants.get(grantId);
    if (grant) grant.lastUsed = new Date();
  }
  async deleteExpiredTokens() {
    for (const [hash, token] of this.tokens) {
      if (token.expiresAt < new Date()) this.tokens.delete(hash);
    }
  }
}
