import { Inject, Injectable, OnDestroy } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

import { SUPABASE_CLIENT } from '../providers/supabase.provider';
import type { Database } from '../../../types/supabase';

type TableName = keyof Database['public']['Tables'];

@Injectable({
  providedIn: 'root'
})
export class RealtimeService implements OnDestroy {
  private channels: RealtimeChannel[] = [];
  private cache = new Map<string, Observable<any>>();

  constructor(
    @Inject(SUPABASE_CLIENT) private supabase: SupabaseClient<Database>,
  ) {}


  /**
   * Watch a table for changes. Returns a shared Observable that emits the full
   * result set on initial load and after every INSERT/UPDATE/DELETE.
   *
   * @param table - The table name to watch
   * @param queryFn - Optional function to customize the select query (e.g. add filters, joins)
   * @param cacheKey - Optional cache key. If provided, the same Observable is returned for
   *                   identical keys, preventing duplicate subscriptions.
   */
  watch<T>(
    table: TableName,
    queryFn?: (query: ReturnType<SupabaseClient<Database>['from']>) => any,
    cacheKey?: string,
  ): Observable<T[]> {
    if (cacheKey && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as Observable<T[]>;
    }

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

      // Subscribe to realtime changes
      const channel = this.supabase
        .channel(`realtime:${table}:${cacheKey ?? Math.random()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
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


  ngOnDestroy(): void {
    this.channels.forEach(ch => this.supabase.removeChannel(ch));
    this.channels = [];
    this.cache.clear();
  }
}
