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
import { AuthService } from './auth.service';
import { AuthUser } from '../interfaces/auth-user.interface';
import { CampaignData } from '../interfaces/campaign-data.interface';
import { UtilService } from './util.service';
import { Timeline } from '../interfaces/timeline.interface';
import { HistoricEvent } from '../interfaces/historic-event.interface';
import { UserService } from './user.service';
import { User } from '../interfaces/user.interface';



@Injectable({
  providedIn: 'root'
})
export class DataService {
  private achievements$: Observable<Achievement[]>;
  private campaignInfo$: Observable<CampaignData>;
  private people$: BehaviorSubject<Person[]>;
  private user: AuthUser;
  private users: User[];

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private storage: StorageService,
    private userService: UserService,
  ) {
    this.user = this.auth.user;
    this.userService.getUsers().subscribe(users => {
      this.users = users;
    });
  }



  private static transformCampaign(campaignData: any[]): CampaignData {
    return campaignData[0].payload.doc.data() as CampaignData;
  }


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
      }, []).sort(UtilService.orderByType),
    };
  }


  delete(itemId: string, collection: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.api.deleteDocumentFromCollection(itemId, collection).then(() => {
        resolve(true);
      }).catch((error) => {
        console.error(error);
        resolve(false);
      });
    });
  }


  getAchievements(): Observable<Achievement[]> {
    if (!this.achievements$) {
      this.achievements$ = combineLatest([
        this.api.getDataFromCollectionWhere(
          'achievements',
          (ref) => ref
            .where('access', 'array-contains', this.user.id)
        ),
        this.getPeople(),
      ]).pipe(
        map(([achievements, people]) => this.transformAchievements(achievements, people)),
        map((achievements) => achievements.sort(UtilService.orderByUnlocked)),
      );
    }
    return this.achievements$;
  }


  getCampaignInfo(): Observable<CampaignData> {
    if (!this.campaignInfo$) {
      this.campaignInfo$ = this.api.getDataFromCollection('campaign').pipe(
        map(DataService.transformCampaign),
      );
    }
    return this.campaignInfo$;
  }


  getEvents(timelineId: string): Observable<HistoricEvent[]> {
    return this.api.getDataFromCollectionWhere(
      `timelines/${timelineId}/events`,
      (ref) => ref
        .where('access', 'array-contains', this.user.id)
    ).pipe(
      map((events) => this.transformEvents(events)),
    );
  }


  getPeople(): Observable<Person[]> {
    if (!this.people$) {
      this.people$ = new BehaviorSubject<Person[]>([]);
      this.api.getDataFromCollectionWhere(
        'people',
        (ref) => ref
          .where('access', 'array-contains', this.user.id)
      ).pipe(
        map(this.transformPeople.bind(this)),
        map((people: Person[]) => people.sort(UtilService.orderByName)),
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


  getPersonInfos(id: string): Observable<Map<InfoType, Info[]>> {
    return this.api.getDataFromCollectionWhere(
      `people/${id}/info`,
      (ref) => ref
        .where('access', 'array-contains', this.user.id)
    ).pipe(
      map((infos) => this.transformInfos(infos)),
    );
  }


  getPersonValues(id: string, altCollection?: string): Observable<Values> {
    const collection = `${altCollection ? altCollection : 'people'}/${id}/attributes`;
    return this.api.getDataFromCollection(
      collection,
    ).pipe(
      map((values) => DataService.transformValues(id, values)),
    );
  }


  getTimeline(id: string): Observable<Timeline> {
    return this.api.getItemFromCollection(`timelines/${id}`).pipe(
      map((timeline) => this.transformTimeline(timeline)),
    );
  }


  store(item: any, collection: string, id?: string): Promise<boolean> {
    const storeItem = { ...item };
    if (item.owner) {
      storeItem.access = this.getDocumentPermissionIds(item.owner, item.isPrivate);
    }

    return new Promise((resolve) => {
      if (id) {
        this.api.updateDocumentInCollection(id, collection, storeItem).then(() => {
          resolve(true);
        }).catch((error) => {
          console.error(error);
          resolve(false);
        });
      } else {
        this.api.addDocumentToCollection(storeItem, collection).then((reference) => {
          if (reference) {
            resolve(true);
          } else {
            resolve(false);
          }
        }).catch((error) => {
          console.error(error);
          resolve(false);
        });
      }
    });
  }


  private getDocumentPermissionIds(creatorID: string, isPrivate: boolean = true): string[] {
    return this.users.reduce((all, user) => {
      if (!isPrivate || user.id === creatorID || user.isGM) {
        all.push(user.id);
      }
      return all;
    }, []);
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
        achieve.isPrivate,
        achieve.owner
      ));
      return all;
    }, []);
  }


  private transformEvents(events: any[]): HistoricEvent[] {
    return events.reduce((all, event) => {
      const eventData = event.payload.doc.data();
      all.push({
        id: event.payload.doc.id,
        content: eventData.content,
        date: eventData.date,
        created: eventData.created ? new Date(eventData.created.seconds * 1000) : null,
        isPrivate: eventData.isPrivate ? eventData.isPrivate : false,
        modified: eventData.modified ? new Date(eventData.modified.seconds * 1000) : null,
        owner: eventData.owner ? eventData.owner : null,
        type: eventData.type,
      });
      return all;
    }, []).sort(UtilService.orderByCreated);
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
        infoData.type,
        infoData.created ? new Date(infoData.created.seconds * 1000) : null,
        infoData.modified ? new Date(infoData.modified.seconds * 1000) : null,
        infoData.isPrivate ? infoData.isPrivate : false,
        infoData.owner ? infoData.owner : null,
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
        owner: personData.owner,
        isPrivate: personData.isPrivate
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


  private transformTimeline(data: any): Timeline {
    return {
      id: data.payload.id,
      name: data.payload.data().name,
      events: this.getEvents(data.payload.id),
    };
  }
}
