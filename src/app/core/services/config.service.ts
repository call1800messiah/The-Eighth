import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  static infoTypes = {
    0: 'Erscheinungsbild',
    1: 'Hintergrund',
    2: 'Notizen',
  };

  constructor() { }
}
