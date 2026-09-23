import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import type { FileUpdateRef } from '../models/file-update-ref';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private bucket = environment.tenant;

  constructor(
    private api: ApiService,
  ) {}



  async delete(bucket: string, fileName: string, updateRef?: FileUpdateRef): Promise<void> {
    const filePath = `${bucket}/${fileName}`;
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


  async uploadFile(name: string, file: File | Blob, bucket: string, updateRef?: FileUpdateRef): Promise<void> {
    const filePath = `${bucket}/${name}`;
    const { error } = await this.api.storage.from(this.bucket).upload(filePath, file, {
      cacheControl: '259200',
      upsert: true,
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
      }
    }
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
