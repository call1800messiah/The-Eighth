import { Injectable } from '@angular/core';
import { ICropperSettings } from 'ngx-img-cropper';
import { customAlphabet } from 'nanoid';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  static eventTypes = {
    0: 'Standard',
  };

  static fileMetadata = {
    cacheControl: 'public,max-age=259200', // One month
  };

  static infoTypes = {
    0: 'Erscheinungsbild',
    1: 'Hintergrund',
    2: 'Notizen',
    3: 'Charakter',
    4: 'Ziele',
    5: 'Belohnung'
  };

  static nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_', 10);

  static imageSettings: Record<string, ICropperSettings> = {
    person: {
      croppedHeight: 500,
      croppedWidth: 500,
      height: 100,
      width: 100,
    },
    place: {
      keepAspect: false,
      preserveSize: true,
    }
  };

  constructor() { }
}
