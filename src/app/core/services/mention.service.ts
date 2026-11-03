import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, from, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';

import { ApiService } from './api.service';
import { RealtimeService } from './supabase-realtime.service';
import type { MentionResolution, MentionResolver } from '../../shared/markdown/markdown-renderer';
import {
  MentionEntityType,
  MentionRef,
  markdownToPlainText,
  mentionKey,
  MentionRoute,
  mentionRoute,
} from '../../shared/markdown/mentions';
import { filterBySearch } from '../../shared/utils/search';

/** Something a text can mention, as far as the current viewer can see it. */
export interface MentionTarget {
  entityType: MentionEntityType;
  entityId: string;
  name: string;
  /** Extra text the picker searches (note content and category). */
  searchText?: string;
}

/** A text that mentions an entity. */
export interface Backlink {
  sourceType: string;
  sourceId: string;
  label: string;
  /** Kind of text, for display ("Quest", "Info", …). */
  kind: string;
  route: MentionRoute;
}

export const MENTION_TYPE_LABELS: Record<MentionEntityType, string> = {
  person: 'Person',
  place: 'Ort',
  quest: 'Quest',
  note: 'Notiz',
};

interface MentionRow {
  source_type: string;
  source_id: string;
}

/**
 * Lookups for the rich-text editor: which entities can be mentioned, how a
 * mention should look to the current viewer, and which texts mention an
 * entity (backlinks).
 *
 * Target lists are fetched with only the columns needed for a name, rather
 * than reusing the feature services, which load and deserialize far more. RLS
 * scopes them, so "in the list" means "the viewer may see it".
 */
@Injectable({
  providedIn: 'root'
})
export class MentionService {
  private api = inject(ApiService);
  private realtime = inject(RealtimeService);

  private targets$: Observable<MentionTarget[]>;


  /** Everything the viewer can mention, sorted by name. */
  getTargets(): Observable<MentionTarget[]> {
    if (!this.targets$) {
      const watchNames = (table: 'people' | 'places' | 'quests', entityType: MentionEntityType) =>
        this.realtime.watch<{ id: string; name: string }>(
          table,
          query => query.select('id, name'),
          `mentions:targets:${table}`,
        ).pipe(
          catchError(() => of([])),
          map(rows => rows.map((row): MentionTarget => ({ entityType, entityId: row.id, name: row.name ?? '' }))),
        );

      const notes$ = this.realtime.watch<{ id: string; title: string | null; content: string | null; category: string | null }>(
        'notes',
        query => query.select('id, title, content, category'),
        'mentions:targets:notes',
      ).pipe(
        catchError(() => of([])),
        map(rows => rows.map((row): MentionTarget => ({
          entityType: 'note',
          entityId: row.id,
          name: row.title || markdownToPlainText(row.content).slice(0, 40) || 'Notiz',
          searchText: `${row.content ?? ''} ${row.category ?? ''}`,
        }))),
      );

      this.targets$ = combineLatest([
        watchNames('people', 'person'),
        watchNames('places', 'place'),
        watchNames('quests', 'quest'),
        notes$,
      ]).pipe(
        map(lists => lists.flat().sort((a, b) => a.name.localeCompare(b.name))),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    }
    return this.targets$;
  }


  /**
   * Picker suggestions: names that start with the query first, then other
   * matches. Uses the same search as the flow view's "add item" picker.
   */
  search(targets: MentionTarget[], query: string, limit = 8): MentionTarget[] {
    const needle = query.trim().toLowerCase();
    const matches = filterBySearch(targets, needle, ['name', 'searchText']);
    const startsWith = (target: MentionTarget) => target.name.toLowerCase().startsWith(needle) ? 0 : 1;
    return [...matches]
      .sort((a, b) => startsWith(a) - startsWith(b))
      .slice(0, limit);
  }


  /**
   * A resolver for the given mentions, re-emitted when names or visibility
   * change. Mentions the viewer cannot load are checked against the database
   * to tell hidden targets from deleted ones.
   */
  resolve(refs: Pick<MentionRef, 'entityType' | 'entityId'>[]): Observable<MentionResolver> {
    if (refs.length === 0) {
      return of(() => ({ state: 'pending' } as MentionResolution));
    }

    return this.getTargets().pipe(
      map(targets => {
        const names = new Map<string, string>();
        for (const target of targets) {
          names.set(mentionKey(target.entityType, target.entityId), target.name);
        }
        return names;
      }),
      switchMap(names => {
        const missing = uniqueRefs(refs).filter(ref => !names.has(mentionKey(ref.entityType, ref.entityId)));
        const existing$ = missing.length === 0
          ? of(new Set<string>())
          : from(this.findExisting(missing));
        return existing$.pipe(map(existing => ({ names, existing })));
      }),
      map(({ names, existing }): MentionResolver => (entityType, entityId) => {
        const key = mentionKey(entityType, entityId);
        if (names.has(key)) {
          return { state: 'visible', name: names.get(key) };
        }
        return existing.has(key) ? { state: 'hidden' } : { state: 'deleted' };
      }),
    );
  }


  /** Texts the viewer can see that mention the given entity. */
  getBacklinks(entityType: MentionEntityType, entityId: string): Observable<Backlink[]> {
    const rows$ = this.realtime.watch<MentionRow>(
      'mentions',
      query => query.select('source_type, source_id').eq('entity_type', entityType).eq('entity_id', entityId),
      `mentions:backlinks:${entityType}:${entityId}`,
    ).pipe(
      catchError(() => of([] as MentionRow[])),
      map(rows => {
        const seen = new Set<string>();
        return rows.filter(row => {
          const key = `${row.source_type}/${row.source_id}`;
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
      }),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    );

    return combineLatest([rows$, this.getTargets()]).pipe(
      switchMap(([rows, targets]) => from(this.describeSources(rows, targets))),
    );
  }


  private async findExisting(refs: Pick<MentionRef, 'entityType' | 'entityId'>[]): Promise<Set<string>> {
    const { data, error } = await this.api.rpc('mention_targets_exist', {
      p_refs: refs.map(ref => ({ entity_type: ref.entityType, entity_id: ref.entityId })),
    });
    if (error) {
      console.error(error);
      // Unknown: treat as hidden rather than claim they were deleted.
      return new Set(refs.map(ref => mentionKey(ref.entityType, ref.entityId)));
    }
    return new Set(((data ?? []) as { entity_type: string; entity_id: string }[])
      .map(row => mentionKey(row.entity_type, row.entity_id)));
  }


  private async describeSources(rows: MentionRow[], targets: MentionTarget[]): Promise<Backlink[]> {
    const names = new Map(targets.map(target => [mentionKey(target.entityType, target.entityId), target.name]));
    const idsOf = (type: string) => rows.filter(row => row.source_type === type).map(row => row.source_id);

    const fetchRows = async <T>(table: 'achievements' | 'historic_events' | 'info_boxes' | 'rules', columns: string, ids: string[]) => {
      if (ids.length === 0) {
        return new Map<string, T>();
      }
      const { data, error } = await this.api.from(table).select(columns).in('id', ids);
      if (error) {
        console.error(error);
      }
      return new Map(((data ?? []) as any[]).map(row => [row.id as string, row as T]));
    };

    const [achievements, events, infos, rules] = await Promise.all([
      fetchRows<{ name: string }>('achievements', 'id, name', idsOf('achievement')),
      fetchRows<{ content: string; date: string | null }>('historic_events', 'id, content, date', idsOf('historic_event')),
      fetchRows<{ entity_type: string; entity_id: string }>('info_boxes', 'id, entity_type, entity_id', idsOf('info_box')),
      fetchRows<{ name: string }>('rules', 'id, name', idsOf('rule')),
    ]);

    const backlinks: Backlink[] = [];
    for (const { source_type: sourceType, source_id: sourceId } of rows) {
      const base = { sourceType, sourceId };
      switch (sourceType) {
        case 'quest':
        case 'note': {
          const name = names.get(mentionKey(sourceType, sourceId));
          if (name !== undefined) {
            backlinks.push({ ...base, kind: MENTION_TYPE_LABELS[sourceType], label: name, route: mentionRoute(sourceType, sourceId) });
          }
          break;
        }
        case 'info_box': {
          const info = infos.get(sourceId);
          const parentType = info?.entity_type as MentionEntityType;
          const parentName = info && names.get(mentionKey(parentType, info.entity_id));
          if (parentName !== undefined && parentName !== null && parentName !== '') {
            backlinks.push({ ...base, kind: 'Info', label: parentName, route: mentionRoute(parentType, info.entity_id) });
          }
          break;
        }
        case 'achievement': {
          const achievement = achievements.get(sourceId);
          if (achievement) {
            backlinks.push({ ...base, kind: 'Errungenschaft', label: achievement.name, route: { path: '/achievements' } });
          }
          break;
        }
        case 'historic_event': {
          const event = events.get(sourceId);
          if (event) {
            const text = markdownToPlainText(event.content).slice(0, 40);
            backlinks.push({ ...base, kind: 'Ereignis', label: event.date ? `${event.date}: ${text}` : text, route: { path: '/overview' } });
          }
          break;
        }
        case 'rule': {
          const rule = rules.get(sourceId);
          if (rule) {
            backlinks.push({ ...base, kind: 'Regel', label: rule.name, route: { path: '/rules' } });
          }
          break;
        }
      }
    }
    return backlinks.sort((a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label));
  }
}


function uniqueRefs<T extends Pick<MentionRef, 'entityType' | 'entityId'>>(refs: T[]): T[] {
  const seen = new Set<string>();
  return refs.filter(ref => {
    const key = mentionKey(ref.entityType, ref.entityId);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
