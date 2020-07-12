import { Injectable } from '@angular/core';
import { AngularFirestore, DocumentReference } from '@angular/fire/firestore';
import { AngularFireAuth } from '@angular/fire/auth';
import { Observable } from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
  ) {}


  addDocumentToCollection(document: any, collection: string): Promise<DocumentReference> {
    return this.afs.collection(collection).add(document);
  }

  getAuthState() {
    return this.afAuth.authState;
  }

  getDataFromCollection(collection: string): Observable<any> {
    return this.afs.collection(collection).snapshotChanges();
  }

  login(email: string, password: string) {
    return this.afAuth.signInWithEmailAndPassword(email, password);
  }

  logout() {
    return this.afAuth.signOut();
  }

  updateDocumentInCollection(documentID: string, collection: string, data: any) {
    return this.afs.collection(collection).doc(documentID).set(data, { merge: true });
  }
}