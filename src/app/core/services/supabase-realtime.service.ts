import { Inject, Injectable, OnDestroy } from '@angular/core';
import { Observable, shareReplay, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

import { SUPABASE_CLIENT } from '../providers/supabase.provider';
import type { Database } from '../../../types/supabase';

type TableName = keyof Database['public']['Tables'];

/**
 * Maps entity table names to the entity_type string used in document_access.
 * Only tables whose RLS SELECT policy checks document_access are listed here.
 * Watches for unlisted tables (rules, timelines, etc.) are unaffected by
 * access changes and will not re-fetch when document_access changes.
 */
const ACCESS_CONTROLLED_TABLES: Partial<Record<TableName, string>> = {
  people:          'person',
  places:          'place',
  quests:          'quest',
  projects:        'project',
  achievements:    'achievement',
  inventory:       'inventory',
  notes:           'note',
  rolls:           'roll',
  flows:           'flow',
  historic_events: 'historic_event',
  info_boxes:      'info_box',
};

@Injectable({
  providedIn: 'root'
})
export class RealtimeService implements OnDestroy {
  private channels: RealtimeChannel[] = [];
  private cache = new Map<string, Observable<any>>();

  /**
   * Emits the entity_type whenever document_access changes.
   * Fed by both postgres_changes (for grants) and broadcast (for revocations).
   */
  private documentAccessChanges$ = new Subject<string>();
  private documentAccessChannelReady = false;

  constructor(
    @Inject(SUPABASE_CLIENT) private supabase: SupabaseClient<Database>,
  ) {}


  /**
   * Watch a table for changes. Returns a shared Observable that emits the full
   * result set on initial load and after every INSERT/UPDATE/DELETE.
   *
   * For access-controlled tables, also re-fetches when document_access changes
   * for the current user — so granted or revoked access takes effect immediately
   * without a page reload.
   *
   * @param table    The table name to watch.
   * @param queryFn  Optional function to customise the select query.
   * @param cacheKey Optional key. Identical keys share a single subscription.
   */
  watch<T>(
    table: TableName,
    queryFn?: (query: ReturnType<SupabaseClient<Database>['from']>) => any,
    cacheKey?: string,
    triggerTables?: TableName[],
  ): Observable<T[]> {
    if (cacheKey && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as Observable<T[]>;
    }

    this.ensureDocumentAccessChannel();

    const entityType = ACCESS_CONTROLLED_TABLES[table];

    const observable = new Observable<T[]>(subscriber => {
      const fetch = async () => {
        const baseQuery = this.supabase.from(table).select();
        const query = queryFn ? queryFn(baseQuery) : baseQuery;
        const { data, error } = await query;
        if (error) {
          subscriber.error(error);
        } else {
          subscriber.next((data ?? []) as T[]);
        }
      };

      // Initial fetch
      fetch();

      // Re-fetch when the watched table itself changes
      const channel = this.supabase
        .channel(`realtime:${table}:${cacheKey ?? Math.random()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => fetch())
        .subscribe();

      this.channels.push(channel);

      // Re-fetch when related tables change (e.g. combatant_attributes for combatants)
      const triggerChannels: RealtimeChannel[] = [];
      if (triggerTables) {
        for (const triggerTable of triggerTables) {
          const triggerChannel = this.supabase
            .channel(`realtime:${triggerTable}:trigger-for-${table}:${cacheKey ?? Math.random()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: triggerTable }, () => fetch())
            .subscribe();
          triggerChannels.push(triggerChannel);
          this.channels.push(triggerChannel);
        }
      }

      // Re-fetch when access rights change for this specific entity type.
      // Only tables in ACCESS_CONTROLLED_TABLES are subscribed; other tables
      // (rules, timelines, etc.) are unaffected and are not re-fetched.
      const docAccessSub = entityType
        ? this.documentAccessChanges$.pipe(
            filter(type => type === entityType),
          ).subscribe(() => fetch())
        : null;

      return () => {
        this.supabase.removeChannel(channel);
        const idx = this.channels.indexOf(channel);
        if (idx >= 0) this.channels.splice(idx, 1);
        for (const tc of triggerChannels) {
          this.supabase.removeChannel(tc);
          const tcIdx = this.channels.indexOf(tc);
          if (tcIdx >= 0) this.channels.splice(tcIdx, 1);
        }
        docAccessSub?.unsubscribe();
      };
    }).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    if (cacheKey) {
      this.cache.set(cacheKey, observable);
    }

    return observable;
  }


  /**
   * Watch a single row by ID. Emits the row or null.
   */
  watchOne<T>(
    table: TableName,
    id: string,
    selectQuery?: string,
  ): Observable<T | null> {
    return new Observable<T | null>(subscriber => {
      const fetch = async () => {
        const { data, error } = await this.supabase
          .from(table)
          .select(selectQuery ?? '*')
          .eq('id', id)
          .single();
        if (error) {
          subscriber.error(error);
        } else {
          subscriber.next(data as T | null);
        }
      };

      fetch();

      const channel = this.supabase
        .channel(`realtime:${table}:${id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter: `id=eq.${id}` },
          () => fetch(),
        )
        .subscribe();

      this.channels.push(channel);

      return () => {
        this.supabase.removeChannel(channel);
        const idx = this.channels.indexOf(channel);
        if (idx >= 0) this.channels.splice(idx, 1);
      };
    }).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }


  /**
   * Broadcast an access change to all connected clients.
   * Called from EditAccessComponent after saving so that users who lost
   * access see the entity disappear without a page reload.
   *
   * Uses Supabase broadcast (client-to-client) which is NOT subject to RLS,
   * unlike postgres_changes which can silently drop DELETE events when the
   * affected user's SELECT policy no longer matches the deleted row.
   */
  broadcastAccessChange(entityType: string): void {
    this.supabase
      .channel('access-changes')
      .send({
        type: 'broadcast',
        event: 'access-changed',
        payload: { entity_type: entityType },
      });
  }


  ngOnDestroy(): void {
    this.channels.forEach(ch => this.supabase.removeChannel(ch));
    this.channels = [];
    this.cache.clear();
    this.documentAccessChanges$.complete();
    this.documentAccessChannelReady = false;
  }


  /**
   * Sets up two listeners for document_access changes:
   *
   * 1. postgres_changes filtered by user_id — reliably catches INSERT events
   *    (grants) because the new row matches the user's SELECT policy.
   *
   * 2. Broadcast channel — catches all access changes including revocations.
   *    Broadcast is not subject to RLS, so DELETE events always arrive.
   *    The re-fetch then goes through RLS which naturally excludes entities
   *    the user no longer has access to.
   */
  private ensureDocumentAccessChannel(): void {
    if (this.documentAccessChannelReady) return;
    this.documentAccessChannelReady = true;

    // postgres_changes for INSERT (grants) — filtered to current user
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      const userId = session?.user?.id;
      if (!userId) return;

      const pgChannel = this.supabase
        .channel('realtime:document_access:pg')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'document_access',
            filter: `user_id=eq.${userId}`,
          },
          (payload: any) => {
            const entityType: string | undefined = payload.new?.entity_type;
            if (entityType) {
              this.documentAccessChanges$.next(entityType);
            }
          },
        )
        .subscribe();

      this.channels.push(pgChannel);
    });

    // Broadcast channel for revocations — not subject to RLS
    const broadcastChannel = this.supabase
      .channel('access-changes')
      .on('broadcast', { event: 'access-changed' }, (payload: any) => {
        const entityType: string | undefined = payload.payload?.entity_type;
        if (entityType) {
          this.documentAccessChanges$.next(entityType);
        }
      })
      .subscribe();

    this.channels.push(broadcastChannel);
  }
}
