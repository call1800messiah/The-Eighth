import { Injectable } from '@angular/core';
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { AngularFireStorage } from '@angular/fire/storage';

import { Person } from '../models/person.model';
import { ApiService } from './api.service';
import { Achievement } from '../models/achievements.model';



@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly achievements$: Observable<Achievement[]>;
  private readonly campaignInfo$: Observable<any[]>;
  private readonly people$: BehaviorSubject<Person[]>;

  constructor(
    private api: ApiService,
    private storage: AngularFireStorage
  ) {
    this.people$ = new BehaviorSubject<Person[]>([]);
    this.campaignInfo$ = this.api.getDataFromCollection('campaign').pipe(
      map(DataService.transformSnapshotChanges),
    );
    this.api.getDataFromCollection('people').pipe(
      map(this.transformPeople.bind(this)),
      map((people: Person[]) => people.sort(DataService.orderByName)),
    ).subscribe((people) => {
      this.people$.next(people);
    });
    this.achievements$ = combineLatest([
      this.api.getDataFromCollection('achievements'),
      this.people$,
    ]).pipe(
      map(([achievements, people]) => this.transformAchievements(achievements, people)),
      map((achievements) => achievements.sort(DataService.orderByUnlocked)),
    );
  }


  private static transformSnapshotChanges(changeList: any[]) {
    return changeList.reduce((all, entry) => {
      all.push(entry.payload.doc.data());
      return all;
    }, []);
  }


  private static orderByName(a: Person, b: Person) {
    if (a.name > b.name) {
      return 1;
    }
    if (a.name < b.name) {
      return -1;
    }
    return 0;
  }


  private static orderByUnlocked(a: Achievement, b: Achievement) {
    if (a.unlocked < b.unlocked) {
      return 1;
    }
    if (a.unlocked > b.unlocked) {
      return -1;
    }
    return 0;
  }


  getAudioUrlForFile(fileName: string): Observable<string> {
    return this.storage.ref(`audio/${fileName}`).getDownloadURL();
  }


  getAchievements(): Observable<Achievement[]> {
    return this.achievements$;
  }


  getCampaignInfo(): Observable<any[]> {
    return this.campaignInfo$;
  }


  getPeople(): Observable<Person[]> {
    return this.people$;
  }


  getPersonById(id: string): Observable<Person> {
    return this.people$.pipe(
      map((people) => people.find(person => person.id === id)),
    );
  }


  storePerson(person): Promise<boolean> {
    return new Promise((resolve) => {
      if (person.id) {
        this.api.updateDocumentInCollection(person.id, 'people', person).then(() => {
          resolve(true);
        }).catch((error) => {
          console.log(error);
          resolve(false);
        });
      } else {
        this.api.addDocumentToCollection(person, 'people').then((reference) => {
          if (reference) {
            resolve(true);
          } else {
            resolve(false);
          }
        }).catch((error) => {
          console.log(error);
          resolve(false);
        });
      }
    });
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


  private transformAchievements(achievements: any[], people: Person[]): Achievement[] {
    return achievements.reduce((all, entry) => {
      const achieve = entry.payload.doc.data();
      all.push(new Achievement(
        entry.payload.doc.id,
        achieve.name,
        achieve.description,
        new Date(achieve.unlocked.seconds * 1000),
        achieve.icon,
        people.filter((person) => achieve.people.indexOf(person.id) !== -1),
      ));
      return all;
    }, []);
  }


  private transformPeople(people: any[]): Person[] {
    return people.reduce((all, entry) => {
      const personData = entry.payload.doc.data();
      const person = {
        id: entry.payload.doc.id,
        name: personData.name || '',
        birthday: personData.birthday || null,
        birthyear: personData.birthyear !== undefined ? personData.birthyear : null,
        culture: personData.culture || null,
        deathday: personData.deathday || null,
        height: personData.height !== undefined ? personData.height : null,
        image: null,
        profession: personData.profession || null,
        race: personData.race || null,
        title: personData.title || null,
        pc: personData.pc || false,
      };
      if (personData.image && personData.image !== '') {
        this.storage.ref(personData.image).getDownloadURL().subscribe((url) => {
          person.image = url;
        });
      }
      all.push(person);
      return all;
    }, []);
  }
}