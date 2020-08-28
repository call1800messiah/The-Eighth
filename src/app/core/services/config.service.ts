import { Injectable } from '@angular/core';

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

  constructor() { }
}
