import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(
    private afs: AngularFirestore
  ) {}
  
  getAchievements(): Observable<any[]> {
    return this.afs.collection('achievements').snapshotChanges();
  }
  
  getPeople(): Observable<any[]> {
    return this.afs.collection('people').snapshotChanges();
  }
}
