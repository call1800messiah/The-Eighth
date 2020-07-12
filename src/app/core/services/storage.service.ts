import { Injectable } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { AngularFireStorage } from '@angular/fire/storage';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';


@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor(
    private api: ApiService,
    private storage: AngularFireStorage
  ) { }



  getDownloadURL(fileName: string): Observable<string> {
    return this.storage.ref(fileName).getDownloadURL();
  }


  uploadFile(name: string, file: File | Blob, bucket: string, updateRef?: { id: string, image: string }) {
    const fileName = `${bucket}/${name}`;
    const fileRef = this.storage.ref(fileName);
    const task = fileRef.put(file);
    task.percentageChanges().pipe(
      finalize(() => {
        if (updateRef) {
          fileRef.getDownloadURL().subscribe(() => {
            const update = Object.assign({}, updateRef, { image: fileName });
            this.api.updateDocumentInCollection(update.id, bucket, update).then(() => {}).catch((error) => {
              console.log(error);
            });
          });
        }
        console.log('Upload done', fileName);
      })
    ).subscribe((change) => {
      console.log('Upload progress: ', fileName, change);
    });
    return task;
  }
}
