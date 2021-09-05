import { Injectable } from '@angular/core';
import { ICropperSettings } from 'ngx-img-cropper';

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
  };

  static placeTypes = {
    city: 'Stadt',
    island: 'Insel',
    landmass: 'Landmasse',
    ocean: 'Gewässer',
    place: 'Ort',
    state: 'Staat'
  };

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
