import { Injectable } from '@angular/core';
import { AngularFirestore, DocumentReference, QueryFn } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable } from 'rxjs';
import firebase from 'firebase/compat';



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

  deleteDocumentFromCollection(documentId: string, collection: string): Promise<void> {
    return this.afs.collection(collection).doc(documentId).delete();
  }

  getAuthState(): Observable<firebase.User> {
    return this.afAuth.authState;
  }

  getDataFromCollection(collection: string, queryFunction?: QueryFn<firebase.firestore.DocumentData>): Observable<any> {
    return this.afs.collection(collection, queryFunction).snapshotChanges();
  }

  getItemFromCollection(path: string): Observable<any> {
    return this.afs.doc(path).snapshotChanges();
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
