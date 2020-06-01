import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
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

  getAchievements(): Observable<any[]> {
    return this.afs.collection('achievements').snapshotChanges();
  }

  getAuthState() {
    return this.afAuth.authState;
  }

  getCampaignInfo(): Observable<any[]> {
    return this.afs.collection('campaign').valueChanges();
  }

  getPeople(): Observable<any[]> {
    return this.afs.collection('people').snapshotChanges();
  }

  login(email: string, password: string) {
    return this.afAuth.signInWithEmailAndPassword(email, password);
  }

  logout() {
    return this.afAuth.signOut();
  }
}
