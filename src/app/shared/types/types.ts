import { ICropperSettings } from 'ngx-img-cropper';
import { Info } from '../../core/models/info.model';

export interface EditImageProps {
  bucket: string;
  cropperSettings?: ICropperSettings;
  imageName?: string;
  imageUrl?: string;
  updateRef?: {
    id: string,
    image: string
  };
}

export interface EditInfoComponentProps {
  collection: string;
  info?: Info;
  parentId: string;
}