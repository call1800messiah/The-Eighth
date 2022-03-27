import { ICropperSettings } from 'ngx-img-cropper';

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
