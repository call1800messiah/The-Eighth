import { Injectable } from '@angular/core';
import type { ICropperSettings } from 'ngx-img-cropper';
import { customAlphabet } from 'nanoid';
import { BehaviorSubject } from 'rxjs';

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
    banner: {
      croppedHeight: 150,
      croppedWidth: 142.5,
      fileType: 'image/png',
      height: 100,
      width: 95,
    },
    person: {
      compressRatio: 0.9,
      croppedHeight: 500,
      croppedWidth: 500,
      fileType: 'image/jpg',
      height: 100,
      width: 100,
    },
    place: {
      compressRatio: 0.7,
      fileType: 'image/jpg',
      keepAspect: false,
      preserveSize: true,
    }
  };
  sidebarOpen$: BehaviorSubject<boolean>;
  private sidebarOpen = false;

  constructor() {
    const sidebarSetting = localStorage.getItem('sidebar-open');
    if (sidebarSetting !== null) {
      this.sidebarOpen = JSON.parse(sidebarSetting);
    }
    this.sidebarOpen$ = new BehaviorSubject<boolean>(this.sidebarOpen);
  }



  toggleSidebar(open?: boolean): void {
    if (open !== undefined) {
      this.sidebarOpen = open;
    } else {
      this.sidebarOpen = !this.sidebarOpen;
    }
    console.log(this.sidebarOpen);
    this.sidebarOpen$.next(this.sidebarOpen);
    localStorage.setItem('sidebar-open', JSON.stringify(this.sidebarOpen));
  }
}
