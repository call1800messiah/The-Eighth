import { Injectable } from '@angular/core';
import slugify from 'slugify';

import { Person } from '../interfaces/person.interface';
import { Achievement } from '../models/achievements.model';
import { Attribute } from '../interfaces/attribute.interface';



@Injectable({
  providedIn: 'root'
})
export class UtilService {

  constructor() { }


  static orderByCreated(a: any, b: any) {
    return UtilService.orderByObjectProperty(a, b, 'created', false);
  }


  static orderByName(a: Person, b: Person) {
    return UtilService.orderByObjectProperty(a, b, 'name', true);
  }


  static orderByType(a: Attribute, b: Attribute) {
    return UtilService.orderByObjectProperty(a, b, 'type', false);
  }


  static orderByUnlocked(a: Achievement, b: Achievement) {
    return UtilService.orderByObjectProperty(a, b, 'unlocked', false);
  }


  private static orderByObjectProperty(a, b, property: string, asc: boolean) {
    if (a[property] < b[property]) {
      return asc ? -1 : 1;
    }
    if (a[property] > b[property]) {
      return asc ? 1 : -1;
    }
    return 0;
  }


  dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--){
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }


  slugify(text: string) {
    return slugify(text, {
      lower: true,
      strict: true,
      locale: 'de',
    });
  }
}
