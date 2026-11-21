import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ApiService } from './api.service';
import { RealtimeService } from './supabase-realtime.service';
import { MentionRoute, mentionRoute } from '../../shared/markdown/mentions';

export type DraftType = 'person' | 'place' | 'quest';

/** Something Claude created through the MCP server, waiting for a GM. */
export interface Draft {
  type: DraftType;
  id: string;
  name: string;
  createdAt: Date;
  route: MentionRoute;
}

/** A connection a GM approved for an MCP client (claude.ai, Claude Code). */
export interface McpConnection {
  id: string;
  clientName: string;
  approvedBy: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export const DRAFT_TYPE_LABELS: Record<DraftType, string> = {
  person: 'Person',
  place: 'Ort',
  quest: 'Quest',
};

const TABLES: Record<DraftType, 'people' | 'places' | 'quests'> = {
  person: 'people',
  place: 'places',
  quest: 'quests',
};

/**
 * The GM's side of the MCP server (migration 013): the review queue of
 * drafts, and the list of connections with a way to end them. Everything
 * here is GM-only by RLS; other users get empty lists.
 */
@Injectable({
  providedIn: 'root'
})
export class DraftsService {
  private api = inject(ApiService);
  private realtime = inject(RealtimeService);

  private drafts$: Observable<Draft[]>;
  private connections$: Observable<McpConnection[]>;


  getDrafts(): Observable<Draft[]> {
    if (!this.drafts$) {
      const watch = (type: DraftType) => this.realtime.watch<{ id: string; name: string; created_at: string }>(
        TABLES[type],
        query => query.select('id, name, created_at').eq('status', 'draft'),
        `drafts:${type}`,
      ).pipe(
        catchError(() => of([])),
        map(rows => rows.map((row): Draft => ({
          type,
          id: row.id,
          name: row.name,
          createdAt: new Date(row.created_at),
          route: mentionRoute(type, row.id),
        }))),
      );
      this.drafts$ = combineLatest([watch('person'), watch('place'), watch('quest')]).pipe(
        map(lists => lists.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())),
      );
    }
    return this.drafts$;
  }


  getConnections(): Observable<McpConnection[]> {
    if (!this.connections$) {
      this.connections$ = this.realtime.watch<any>(
        'mcp_grants',
        query => query
          .select('id, client_name, created_at, last_used_at, revoked_at, approver:users!mcp_grants_approved_by_fkey(name)')
          .order('created_at', { ascending: false }),
        'mcp-grants',
      ).pipe(
        catchError(() => of([])),
        map(rows => rows.map((row): McpConnection => ({
          id: row.id,
          clientName: row.client_name || 'MCP-Client',
          approvedBy: row.approver?.name ?? null,
          createdAt: new Date(row.created_at),
          lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
          revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
        }))),
      );
    }
    return this.connections$;
  }


  /** The draft becomes an ordinary entity owned by the publishing GM. */
  async publish(type: DraftType, id: string): Promise<boolean> {
    const { error } = await this.api.rpc('publish_draft', { p_entity_type: type, p_entity_id: id });
    if (error) {
      console.error(error);
      return false;
    }
    return true;
  }


  /** Deletes the draft with its info boxes. */
  async discard(type: DraftType, id: string): Promise<boolean> {
    const { error } = await this.api.rpc('discard_draft', { p_entity_type: type, p_entity_id: id });
    if (error) {
      console.error(error);
      return false;
    }
    return true;
  }


  /** Ends a connection: every token issued under it stops working. */
  async revoke(connectionId: string): Promise<boolean> {
    const { error } = await this.api.from('mcp_grants')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', connectionId);
    if (error) {
      console.error(error);
      return false;
    }
    return true;
  }
}
