import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  static collections = {
    personal: '00-privateData',
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
