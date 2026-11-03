import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import { StorageService } from '../../core/services/storage.service';
import { CombatService } from './combat.service';
import type { Database } from '../../../types/supabase';
import { BLANK_MAP, DEFAULT_GRID, GRID_SIZE_LIMITS, type Grid, type Point, type Size } from '../map/geometry';

/** The battle map of the running combat session (migration 014). */
export interface CombatMap {
  id: string;
  /** Public URL of the map image, if one was uploaded. */
  imageUrl: string | null;
  imagePath: string | null;
  /** Map size in map pixels: the image's, or the blank area's. */
  size: Size;
  grid: Grid;
}

/** Raster formats only: an SVG could carry scripts (same rule as scene images). */
export const MAP_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

/**
 * Map, grid and token positions for the combat view. Everyone reads them
 * live; only GMs write (RLS). Positions are in map pixels.
 */
@Injectable({
  providedIn: 'root'
})
export class CombatMapService {
  private api = inject(ApiService);
  private combat = inject(CombatService);
  private realtime = inject(RealtimeService);
  private storage = inject(StorageService);

  private map$: Observable<CombatMap | null>;
  private tokens$: Observable<Map<string, Point>>;


  /** null while no map was set up for the running session. */
  getMap(): Observable<CombatMap | null> {
    if (!this.map$) {
      this.map$ = this.realtime.watch<any>(
        'combat_maps',
        query => query.select('*, combat_sessions!inner(is_active)').eq('combat_sessions.is_active', true),
        'combat-map',
        ['combat_sessions'],
      ).pipe(
        catchError(() => of([])),
        map(rows => rows[0] ? this.transform(rows[0]) : null),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    }
    return this.map$;
  }


  /** Placed tokens by combatant id. Combatants without one stand in the staging row. */
  getTokenPositions(): Observable<Map<string, Point>> {
    if (!this.tokens$) {
      this.tokens$ = this.realtime.watch<{ combatant_id: string; x: number; y: number }>(
        'combat_tokens',
        query => query.select('combatant_id, x, y'),
        'combat-tokens',
      ).pipe(
        catchError(() => of([])),
        map(rows => new Map<string, Point>(rows.map(row => [row.combatant_id, { x: row.x, y: row.y }] as [string, Point]))),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    }
    return this.tokens$;
  }


  async moveToken(combatantId: string, position: Point): Promise<boolean> {
    const { error } = await this.api.from('combat_tokens').upsert({
      combatant_id: combatantId,
      x: Math.round(position.x * 10) / 10,
      y: Math.round(position.y * 10) / 10,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'combatant_id' });
    return this.ok(error);
  }


  async updateGrid(changes: Partial<Grid>): Promise<boolean> {
    const mapId = await this.ensureMap();
    if (!mapId) {
      return false;
    }
    const update: Database['public']['Tables']['combat_maps']['Update'] = { updated_at: new Date().toISOString() };
    if (changes.enabled !== undefined) update.grid_enabled = changes.enabled;
    if (changes.size !== undefined) {
      update.grid_size = Math.min(Math.max(changes.size, GRID_SIZE_LIMITS.min), GRID_SIZE_LIMITS.max);
    }
    if (changes.offsetX !== undefined) update.grid_offset_x = changes.offsetX;
    if (changes.offsetY !== undefined) update.grid_offset_y = changes.offsetY;
    const { error } = await this.api.from('combat_maps').update(update).eq('id', mapId);
    return this.ok(error);
  }


  /**
   * Uploads a new map image to maps/<map id>/ and removes the previous one.
   * The image's pixel size becomes the map's coordinate space.
   */
  async uploadImage(file: File): Promise<boolean> {
    if (!MAP_IMAGE_TYPES.includes(file.type)) {
      return false;
    }
    const mapId = await this.ensureMap();
    if (!mapId) {
      return false;
    }
    const size = await this.readImageSize(file);
    const previous = await this.currentImagePath(mapId);

    let path: string;
    try {
      path = await this.storage.uploadFile(file.name, file, `maps/${mapId}`);
    } catch {
      return false;
    }

    const { error } = await this.api.from('combat_maps').update({
      image: path,
      image_width: size.width,
      image_height: size.height,
      updated_at: new Date().toISOString(),
    }).eq('id', mapId);
    if (!this.ok(error)) {
      // The row still points at the old image; do not leave an orphan file.
      await this.removeFile(path);
      return false;
    }
    if (previous && previous !== path) {
      await this.removeFile(previous);
    }
    return true;
  }


  /** Back to the blank area. Tokens keep their positions. */
  async removeImage(): Promise<boolean> {
    const mapId = await this.ensureMap();
    if (!mapId) {
      return false;
    }
    const previous = await this.currentImagePath(mapId);
    const { error } = await this.api.from('combat_maps')
      .update({ image: null, image_width: null, image_height: null, updated_at: new Date().toISOString() })
      .eq('id', mapId);
    if (!this.ok(error)) {
      return false;
    }
    if (previous) {
      await this.removeFile(previous);
    }
    return true;
  }


  /** Natural size of an image file. Separate so specs can replace it. */
  async readImageSize(file: Blob): Promise<Size> {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  }


  /** The running session's map row, created on first use (GM only). */
  private async ensureMap(): Promise<string | null> {
    const sessionId = await this.combat.ensureActiveSession();
    if (!sessionId) {
      return null;
    }
    const { error: insertError } = await this.api.from('combat_maps')
      .upsert({ combat_session_id: sessionId }, { onConflict: 'combat_session_id', ignoreDuplicates: true });
    if (!this.ok(insertError)) {
      return null;
    }
    const { data, error } = await this.api.from('combat_maps')
      .select('id').eq('combat_session_id', sessionId).single() as { data: any; error: any };
    return this.ok(error) ? data.id : null;
  }


  private async currentImagePath(mapId: string): Promise<string | null> {
    const { data } = await this.api.from('combat_maps').select('image').eq('id', mapId).single() as { data: any; error: any };
    return data?.image ?? null;
  }


  private async removeFile(path: string) {
    // StorageService.delete() takes the top folder and the rest separately.
    const [folder, ...rest] = path.split('/');
    try {
      await this.storage.delete(folder, rest.join('/'));
    } catch {
      // Logged by StorageService; an orphaned file is harmless.
    }
  }


  private ok(error: { message: string } | null): boolean {
    if (error) {
      console.error(error);
      return false;
    }
    return true;
  }


  private transform(row: any): CombatMap {
    const hasImage = !!row.image && row.image_width > 0 && row.image_height > 0;
    let imageUrl: string | null = null;
    if (hasImage) {
      this.storage.getDownloadURL(row.image).subscribe(url => imageUrl = url).unsubscribe();
    }
    return {
      id: row.id,
      imageUrl,
      imagePath: hasImage ? row.image : null,
      size: hasImage ? { width: row.image_width, height: row.image_height } : BLANK_MAP,
      grid: {
        enabled: row.grid_enabled ?? DEFAULT_GRID.enabled,
        size: row.grid_size ?? DEFAULT_GRID.size,
        offsetX: row.grid_offset_x ?? DEFAULT_GRID.offsetX,
        offsetY: row.grid_offset_y ?? DEFAULT_GRID.offsetY,
      },
    };
  }
}
