import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Config } from './config.js';

/**
 * The Supabase client every tool and the OAuth store use: signed in as the
 * dedicated assistant user, so the database's RLS decides what Claude may do.
 * The session is refreshed by supabase-js; if it is ever lost, the next call
 * to `ready()` signs in again.
 */
export class AssistantSession {
  private _client: SupabaseClient | null = null;
  private signingIn: Promise<void> | null = null;

  constructor(private config: Config['supabase']) {}

  private get client(): SupabaseClient {
    if (!this.config.anonKey || !this.config.email || !this.config.password) {
      throw new Error('SUPABASE_ANON_KEY, MCP_SUPABASE_EMAIL and MCP_SUPABASE_PASSWORD must be set');
    }
    this._client ??= createClient(this.config.url, this.config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
    });
    return this._client;
  }

  async ready(): Promise<SupabaseClient> {
    const { data } = await this.client.auth.getSession();
    if (!data.session) {
      this.signingIn ??= this.signIn().finally(() => { this.signingIn = null; });
      await this.signingIn;
    }
    return this.client;
  }

  private async signIn() {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: this.config.email,
      password: this.config.password,
    });
    if (error || !data.session) {
      throw new Error(`Signing in as the assistant user failed: ${error?.message ?? 'no session'}`);
    }
    const { data: isAssistant, error: roleError } = await this.client.rpc('is_assistant');
    if (roleError || isAssistant !== true) {
      throw new Error('The MCP user does not have the assistant role (see mcp/README.md)');
    }
    const { data: isGm } = await this.client.rpc('is_gm');
    if (isGm === true) {
      // A GM account would make every draft restriction moot.
      throw new Error('The MCP user must not be a GM; give it only the assistant role');
    }
  }
}


export type GmApproval =
  | { ok: true; grantId: string }
  | { ok: false; reason: 'invalid_credentials' | 'not_gm' | 'error' };

/** Checks a GM's login and records their approval of a connection. */
export interface GmApprover {
  approve(email: string, password: string, clientId: string, clientName: string): Promise<GmApproval>;
}

/**
 * Signs the GM in with a throwaway client and lets the database record the
 * approval under their own session: approve_mcp_grant() checks is_gm() itself.
 * Then signs that session out again, locally only, so the GM's other
 * sessions stay signed in.
 */
export class SupabaseGmApprover implements GmApprover {
  constructor(private config: Config['supabase']) {}

  async approve(email: string, password: string, clientId: string, clientName: string): Promise<GmApproval> {
    const client = createClient(this.config.url, this.config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error: loginError } = await client.auth.signInWithPassword({ email, password });
    if (loginError) {
      return { ok: false, reason: loginError.status === 400 ? 'invalid_credentials' : 'error' };
    }
    try {
      const { data, error } = await client.rpc('approve_mcp_grant', { p_client_id: clientId, p_client_name: clientName });
      if (error) {
        return { ok: false, reason: error.code === '42501' ? 'not_gm' : 'error' };
      }
      return { ok: true, grantId: data as string };
    } finally {
      await client.auth.signOut({ scope: 'local' });
    }
  }
}
