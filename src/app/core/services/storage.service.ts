import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import type { FileUpdateRef } from '../models/file-update-ref';
import { ApiService } from './api.service';
import { ConfigService } from './config.service';
import { environment } from '../../../environments/environment';

/**
 * Widths, in image pixels, that images are requested at: twice the largest
 * CSS size they are shown at, for high-DPI screens. `thumb` covers avatars,
 * banners and the scene grid; `large` the portrait on the person page, place
 * images and "open image" links.
 */
export const IMAGE_WIDTH = { thumb: 400, large: 1600 } as const;

/**
 * Largest source, in pixels, that the image renderer accepts, with some
 * headroom: imgproxy refuses anything over IMGPROXY_MAX_SRC_RESOLUTION
 * (16.8 MP, deploy/supabase/docker-compose.yml).
 */
export const MAX_RENDER_PIXELS = 16_000_000;

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

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
    return of(this.getPublicURL(fileName));
  }


  /** URL of the stored file itself, not rendered. */
  getPublicURL(path: string): string {
    const { data } = this.api.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }


  /**
   * URL of an image through Supabase's image transformation (imgproxy):
   * scaled down to `width` (never up), aspect ratio kept, and served as WebP
   * to browsers that accept it (IMGPROXY_AUTO_WEBP). The app's nginx caches
   * the result. If rendering fails, `originalURL()` gives the stored file.
   */
  getImageURL(path: string, width: number): string {
    const { data } = this.api.storage.from(this.bucket).getPublicUrl(path, {
      transform: { width, resize: 'contain', quality: 80 },
    });
    return data.publicUrl;
  }


  /**
   * The image scaled down to at most `MAX_RENDER_PIXELS`, so it can be
   * rendered; anything smaller comes back unchanged, bytes and all. A phone
   * photo is often 48 MP or more. GIFs are left alone (the canvas would drop
   * their animation), and so is anything the browser cannot decode.
   */
  async fitForRendering(file: File): Promise<File> {
    if (file.type === 'image/gif') {
      return file;
    }
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      return file;
    }

    try {
      const scale = StorageService.renderScale(bitmap.width, bitmap.height);
      if (scale >= 1) {
        return file;
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(bitmap.width * scale));
      canvas.height = Math.max(1, Math.floor(bitmap.height * scale));
      const context = canvas.getContext('2d');
      context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      // JPEG stays JPEG; anything else may have transparency, so WebP, which
      // a browser that cannot encode it replaces with PNG.
      const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, 0.9));
      if (!blob) {
        return file;
      }
      const extension = IMAGE_EXTENSIONS[blob.type] ?? 'png';
      const base = file.name.includes('.') ? file.name.slice(0, file.name.lastIndexOf('.')) : file.name;
      return new File([blob], `${base}.${extension}`, { type: blob.type });
    } finally {
      bitmap.close();
    }
  }


  /** Factor that brings a `width` × `height` image within `MAX_RENDER_PIXELS`; 1 if it already is. */
  static renderScale(width: number, height: number): number {
    const pixels = width * height;
    return pixels > MAX_RENDER_PIXELS ? Math.sqrt(MAX_RENDER_PIXELS / pixels) : 1;
  }


  /** The stored file behind a render URL from `getImageURL()`; any other URL unchanged. */
  static originalURL(url: string): string {
    const match = url.match(/^(.*\/storage\/v1\/)render\/image\/(public\/[^?#]+)/);
    return match ? `${match[1]}object/${match[2]}` : url;
  }


  /**
   * Uploads under a unique name: replacing a file at the same path would keep
   * its URL, so neither the realtime watch nor the browser cache would pick up
   * the new content. The file the ref pointed at before is removed afterwards.
   *
   * Files for a ref go into a folder named after the entity id: the storage
   * policies let the entity's owner write there (see migration 006).
   *
   * Resolves with the stored path. A failed ref update is only logged.
   */
  async uploadFile(name: string, file: File | Blob, bucket: string, updateRef?: FileUpdateRef): Promise<string> {
    const folder = updateRef ? `${bucket}/${updateRef.id}` : bucket;
    const filePath = `${folder}/${StorageService.uniqueName(name)}`;
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
        return filePath;
      }

      if (previousPath && previousPath !== filePath) {
        const { error: removeError } = await this.api.storage.from(this.bucket).remove([previousPath]);
        if (removeError) {
          console.error('Storage delete error:', removeError);
        }
      }
    }

    return filePath;
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
