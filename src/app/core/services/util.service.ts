import { Injectable } from '@angular/core';
import slugify from 'slugify';



@Injectable({
  providedIn: 'root'
})
export class UtilService {

  constructor() { }


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
