import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import type { FileUpdateRef } from '../models/file-update-ref';
import { ApiService } from './api.service';
import { ConfigService } from './config.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private api = inject(ApiService);

  private bucket = environment.tenant;



  async delete(bucket: string, fileName: string, updateRef?: FileUpdateRef): Promise<void> {
    // Uploads get unique names, so the stored path is the only reliable one
    const filePath = (updateRef && await this.getRefPath(updateRef)) || `${bucket}/${fileName}`;
    const { error } = await this.api.storage.from(this.bucket).remove([filePath]);
    if (error) {
      console.error('Storage delete error:', error);
      throw error;
    }

    if (updateRef) {
      const { error: updateError } = await this.api.from(updateRef.collection as any)
        .update({ [updateRef.attribute]: '' })
        .eq('id', updateRef.id);
      if (updateError) {
        console.error('Update ref error:', updateError);
      }
    }
  }


  getDownloadURL(fileName: string): Observable<string> {
    const { data } = this.api.storage.from(this.bucket).getPublicUrl(fileName);
    return of(data.publicUrl);
  }


  /**
   * Uploads under a unique name: replacing a file at the same path would keep
   * its URL, so neither the realtime watch nor the browser cache would pick up
   * the new content. The file the ref pointed at before is removed afterwards.
   */
  async uploadFile(name: string, file: File | Blob, bucket: string, updateRef?: FileUpdateRef): Promise<void> {
    const filePath = `${bucket}/${StorageService.uniqueName(name)}`;
    const previousPath = updateRef ? await this.getRefPath(updateRef) : null;
    const { error } = await this.api.storage.from(this.bucket).upload(filePath, file, {
      cacheControl: '259200',
    });

    if (error) {
      console.error('Storage upload error:', error);
      throw error;
    }

    console.log('Upload done', filePath);

    if (updateRef) {
      const { error: updateError } = await this.api.from(updateRef.collection as any)
        .update({ [updateRef.attribute]: filePath })
        .eq('id', updateRef.id);
      if (updateError) {
        console.error('Update ref error:', updateError);
        return;
      }

      if (previousPath && previousPath !== filePath) {
        const { error: removeError } = await this.api.storage.from(this.bucket).remove([previousPath]);
        if (removeError) {
          console.error('Storage delete error:', removeError);
        }
      }
    }
  }


  private async getRefPath(updateRef: FileUpdateRef): Promise<string | null> {
    const { data } = await this.api.from(updateRef.collection as any)
      .select(updateRef.attribute)
      .eq('id', updateRef.id)
      .single() as { data: any; error: any };
    return data?.[updateRef.attribute] || null;
  }


  private static uniqueName(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot > 0
      ? `${name.slice(0, dot)}-${ConfigService.nanoid()}${name.slice(dot)}`
      : `${name}-${ConfigService.nanoid()}`;
  }


  /**
   * List files in a storage folder. Used by audio-player-list to dynamically
   * discover audio files instead of reading from environment config.
   */
  async listFiles(folder: string): Promise<string[]> {
    const { data, error } = await this.api.storage.from(this.bucket).list(folder);
    if (error) {
      console.error('Storage list error:', error);
      return [];
    }
    return data
      .filter(f => f.name !== '.emptyFolderPlaceholder')
      .map(f => `${folder}/${f.name}`);
  }
}
