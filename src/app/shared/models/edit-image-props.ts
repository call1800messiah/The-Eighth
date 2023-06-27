import type { ICropperSettings } from 'ngx-img-cropper';
import type { FileUpdateRef } from '../../core/models/file-update-ref';

export interface EditImageProps {
  bucket: string;
  cropperSettings?: ICropperSettings;
  imageName?: string;
  imageUrl?: string;
  updateRef?: FileUpdateRef;
}
