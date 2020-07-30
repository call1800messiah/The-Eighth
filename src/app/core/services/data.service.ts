import { Injectable } from '@angular/core';
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

import { Person } from '../interfaces/person.interface';
import { ApiService } from './api.service';
import { Achievement } from '../models/achievements.model';
import { StorageService } from './storage.service';
import { Info } from '../models/info.model';
import { InfoType } from '../enums/info-type.enum';
import { Values } from '../interfaces/values.interface';



@Injectable({
  providedIn: 'root'
})
export class DataService {
  private achievements$: Observable<Achievement[]>;
  private campaignInfo$: Observable<any[]>;
  private people$: BehaviorSubject<Person[]>;

  constructor(
    private api: ApiService,
    private storage: StorageService
  ) {}


  private static transformSnapshotChanges(changeList: any[]) {
    return changeList.reduce((all, entry) => {
      all.push(entry.payload.doc.data());
      return all;
    }, []);
  }


  private static transformValues(id: string, data: any): Values {
    return {
      person: id,
      attributes: data.reduce((all, entry) => {
        const attribute = entry.payload.doc.data();
        all.push({
          id: entry.payload.doc.id,
          current: attribute.current,
          max: attribute.max,
          type: attribute.type,
        });

        return all;
      }, []),
    };
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


  delete(itemId: string, collection: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.api.deleteDocumentFromCollection(itemId, collection).then(() => {
        resolve(true);
      }).catch((error) => {
        console.log(error);
        resolve(false);
      });
    });
  }


  getAchievements(): Observable<Achievement[]> {
    if (!this.achievements$) {
      this.achievements$ = combineLatest([
        this.api.getDataFromCollection('achievements'),
        this.getPeople(),
      ]).pipe(
        map(([achievements, people]) => this.transformAchievements(achievements, people)),
        map((achievements) => achievements.sort(DataService.orderByUnlocked)),
      );
    }
    return this.achievements$;
  }


  getCampaignInfo(): Observable<any[]> {
    if (!this.campaignInfo$) {
      this.campaignInfo$ = this.api.getDataFromCollection('campaign').pipe(
        map(DataService.transformSnapshotChanges),
      );
    }
    return this.campaignInfo$;
  }


  getPeople(): Observable<Person[]> {
    if (!this.people$) {
      this.people$ = new BehaviorSubject<Person[]>([]);
      this.api.getDataFromCollection('people').pipe(
        map(this.transformPeople.bind(this)),
        map((people: Person[]) => people.sort(DataService.orderByName)),
      ).subscribe((people) => {
        this.people$.next(people);
      });
    }
    return this.people$;
  }


  getPersonById(id: string): Observable<Person> {
    return this.getPeople().pipe(
      map((people) => people.find(person => person.id === id)),
    );
  }


  getPersonValues(id: string): Observable<Values> {
    return this.api.getDataFromCollection(
      `people/${id}/attributes`,
    ).pipe(
      map((values) => DataService.transformValues(id, values)),
    );
  }


  getInfosByParentId(id: string): Observable<Map<InfoType, Info[]>>{
    return this.api.getDataFromCollectionWhere(
      'info',
      (ref) => ref.where('parent', '==', id)
    ).pipe(
      map((infos) => this.transformInfos(infos)),
    );
  }


  store(item: any, collection: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (item.id) {
        this.api.updateDocumentInCollection(item.id, collection, item).then(() => {
          resolve(true);
        }).catch((error) => {
          console.log(error);
          resolve(false);
        });
      } else {
        this.api.addDocumentToCollection(item, collection).then((reference) => {
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


  private transformInfos(infos: any[]): Map<InfoType, Info[]> {
    return infos.reduce((all, entry) => {
      const infoData = entry.payload.doc.data();
      let typeArray = all.get(infoData.type);
      if (!typeArray) {
        typeArray = [];
        all.set(infoData.type, typeArray);
      }
      typeArray.push(new Info(
        entry.payload.doc.id,
        infoData.content,
        infoData.parent,
        infoData.type,
      ));
      return all;
    }, new Map<InfoType, Info[]>());
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
        this.storage.getDownloadURL(personData.image).subscribe((url) => {
          person.image = url;
        });
      }
      all.push(person);
      return all;
    }, []);
  }
}
