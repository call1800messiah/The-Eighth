import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, withLatestFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Person } from '../models/person';
import type { Attribute } from '../../shared';
import type { AuthUser } from '../../auth/models/auth-user';
import type { Relative } from '../models/relative';
import type { PersonDB } from '../models/person.db';
import type { Place } from '../../places/models/place';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { StorageService } from '../../core/services/storage.service';
import { UtilService } from '../../core/services/util.service';
import { DataService } from '../../core/services/data.service';
import { PlaceService } from '../../places/services/place.service';



@Injectable({
  providedIn: 'root'
})
export class PeopleService {
  static readonly collection = 'people';
  static readonly relativeTypes = {
    children: 'Kinder',
    parents: 'Eltern',
    partners: 'Partner',
    siblings: 'Geschwister',
  };
  private people$: BehaviorSubject<Person[]>;
  private user: AuthUser;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private data: DataService,
    private place: PlaceService,
    private storage: StorageService,
  ) {
    this.user = this.auth.user;
  }



  private static resolveAllRelatives(people: Person[]): Person[] {
    people.forEach(person => {
      Object.values(person.relatives).forEach((relatives: Relative[]) => {
        relatives.map((relative) => {
          const p = people.find(r => r.id === relative.id);
          if (p) {
            relative.name = p.name;
          } else {
            delete relative.id;
          }
          return relative;
        });
      });
    });
    return people;
  }


  private static transformAttributes(data: any): Attribute[] {
    return data.reduce((all, entry) => {
      const attribute = entry.payload.doc.data();
      all.push({
        id: entry.payload.doc.id,
        current: attribute.current,
        max: attribute.max,
        type: attribute.type,
      });

      return all;
    }, []).sort(UtilService.orderByType);
  }



  getPeople(): Observable<Person[]> {
    if (!this.people$) {
      this.people$ = new BehaviorSubject<Person[]>([]);
      this.api.getDataFromCollection(
        PeopleService.collection,
        (ref) => ref
          .where('access', 'array-contains', this.user.id)
      ).pipe(
        withLatestFrom(this.place.getPlaces().pipe(
          map((places) => places.reduce((all, p) => {
            all[p.id] = p;
            return all;
          }, {}) as Record<string, Place>),
        )),
        map(this.transformPeople.bind(this)),
        map(PeopleService.resolveAllRelatives),
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


  getPersonAttributes(id: string, altCollection?: string): Observable<Attribute[]> {
    const collection = `${altCollection ? altCollection : PeopleService.collection}/${id}/attributes`;
    return this.api.getDataFromCollection(
      collection,
    ).pipe(
      map((attributes) => PeopleService.transformAttributes(attributes)),
    );
  }


  store(person: Partial<Person>, personId?: string) {
    return this.data.store(person, PeopleService.collection, personId);
  }



  private transformPeople([people, placeMap]): Person[] {
    return people.reduce((all, entry) => {
      const personData = entry.payload.doc.data() as PersonDB;
      const person: Person = {
        access: personData.access,
        banner: null,
        birthday: personData.birthday || null,
        birthyear: personData.birthyear !== undefined ? personData.birthyear : null,
        collection: PeopleService.collection,
        culture: personData.culture || null,
        deathday: personData.deathday || null,
        height: personData.height !== undefined ? personData.height : null,
        image: null,
        id: entry.payload.doc.id,
        name: personData.name || '',
        owner: personData.owner,
        pc: personData.pc || false,
        profession: personData.profession || null,
        race: personData.race || null,
        relatives: {},
        states: [],
        tags: personData.tags || [],
        title: personData.title || null,
        xp: personData.xp || 0
      };
      if (personData.image && personData.image !== '') {
        this.storage.getDownloadURL(personData.image).subscribe((url) => {
          person.image = url;
        });
      }
      if (personData.banner && personData.banner !== '') {
        this.storage.getDownloadURL(personData.banner).subscribe((url) => {
          person.banner = url;
        });
      }
      if (personData.location) {
        person.location = {
          name: placeMap[personData.location]?.name ?? personData.location,
        };
        if (placeMap[personData.location]) {
          person.location.id = personData.location;
        }
      }
      if (personData.relatives) {
        Object.entries(personData.relatives).forEach(([type, relativeList]) => {
          person.relatives[type] = relativeList.map((id) => ({ id, name: id }));
        });
      }

      all.push(person);
      return all;
    }, []);
  }
}
