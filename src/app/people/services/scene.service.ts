import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Scene } from '../models';
import type { FileUpdateRef } from '../../core/models/file-update-ref';
import { ApiService } from '../../core/services/api.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import { StorageService } from '../../core/services/storage.service';



@Injectable({
  providedIn: 'root'
})
export class SceneService {
  private api = inject(ApiService);
  private realtime = inject(RealtimeService);
  private storage = inject(StorageService);

  static readonly collection = 'scenes';
  private static readonly bucket = 'scenes';



  /**
   * Scenes the given person is tagged in, limited by RLS to those the current
   * user may see. The `match` alias is inner-joined to filter by person; the
   * plain `scene_people` embed still returns everyone in each scene.
   */
  getScenesForPerson(personId: string): Observable<Scene[]> {
    return this.realtime.watch<any>(
      'scenes',
      // `any`: the typed select parser does not follow the aliased embed filter
      (query: any) => query
        .select('*, match:scene_people!inner(person_id), scene_people(person_id)')
        .eq('match.person_id', personId)
        .order('created_at'),
      `scenes-${personId}`,
      ['scene_people'],
    ).pipe(
      // A row without an image is still uploading, or its upload failed
      map(rows => rows.filter(row => row.image).map(row => this.transform(row))),
    );
  }


  async create(file: File, caption: string, personIds: string[]): Promise<void> {
    const { data, error } = await this.api.from('scenes' as any)
      .insert({ caption: caption.trim() || null })
      .select()
      .single() as { data: any; error: any };
    if (error) {
      throw error;
    }

    // The storage policy only lets the owner write into scenes/<id>/, so the
    // row has to exist before the upload. The path is stored here rather than
    // through an updateRef, whose failure uploadFile would only log.
    const folder = `${SceneService.bucket}/${data.id}`;
    let storedPath: string | null = null;
    try {
      await this.insertPeople(data.id, personIds);
      storedPath = await this.storage.uploadFile(SceneService.fileName(file), file, folder);
      const { error: imageError } = await this.api.from('scenes' as any)
        .update({ image: storedPath })
        .eq('id', data.id);
      if (imageError) {
        throw imageError;
      }
    } catch (createError) {
      // The file goes before the row: the storage delete policy needs the row
      if (storedPath) {
        await this.storage.delete(folder, storedPath.slice(folder.length + 1))
          .catch(removeError => console.error('Removing scene file failed', removeError));
      }
      await this.api.from('scenes' as any).delete().eq('id', data.id);
      throw createError;
    }
  }


  /**
   * Writes only the tags that changed, so a tag on a person the editor cannot
   * see is never touched.
   */
  async update(scene: Scene, caption: string, personIds: string[]): Promise<void> {
    const { error } = await this.api.from('scenes' as any)
      .update({ caption: caption.trim() || null })
      .eq('id', scene.id);
    if (error) {
      throw error;
    }

    const removed = scene.people.filter(id => !personIds.includes(id));
    const added = personIds.filter(id => !scene.people.includes(id));

    if (removed.length > 0) {
      const { error: deleteError } = await this.api.from('scene_people' as any)
        .delete()
        .eq('scene_id', scene.id)
        .in('person_id', removed);
      if (deleteError) {
        throw deleteError;
      }
    }
    await this.insertPeople(scene.id, added);
  }


  /**
   * The file goes first: the storage delete policy needs the row to exist.
   * The tags are removed by ON DELETE CASCADE.
   */
  async delete(scene: Scene): Promise<void> {
    await this.storage.delete(SceneService.bucket, '', this.imageRef(scene.id));
    const { error } = await this.api.from('scenes' as any)
      .delete()
      .eq('id', scene.id);
    if (error) {
      throw error;
    }
  }


  /**
   * The user's file name never reaches storage: it may contain characters
   * storage keys reject, and it is nobody else's business.
   */
  static fileName(file: File): string {
    const dot = file.name.lastIndexOf('.');
    const extension = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : '';
    return `scene.${/^[a-z0-9]{1,5}$/.test(extension) ? extension : 'jpg'}`;
  }


  private imageRef(sceneId: string): FileUpdateRef {
    return { collection: SceneService.collection, attribute: 'image', id: sceneId };
  }


  private async insertPeople(sceneId: string, personIds: string[]): Promise<void> {
    if (personIds.length === 0) {
      return;
    }
    const { error } = await this.api.from('scene_people' as any)
      .insert(personIds.map(personId => ({ scene_id: sceneId, person_id: personId })));
    if (error) {
      throw error;
    }
  }


  private transform(row: any): Scene {
    let image = '';
    // getDownloadURL emits synchronously (public URL), see StorageService
    this.storage.getDownloadURL(row.image).subscribe(url => image = url);
    return {
      id: row.id,
      image,
      caption: row.caption ?? '',
      owner: row.owner_id,
      people: (row.scene_people ?? []).map((tag: any) => tag.person_id),
    };
  }
}
