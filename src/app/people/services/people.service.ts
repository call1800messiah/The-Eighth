import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Person } from '../models/person';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { StorageService } from '../../core/services/storage.service';
import { UtilService } from '../../core/services/util.service';
import { Values } from '../../shared/models/values';
import { DataService } from '../../core/services/data.service';
import { AuthUser } from '../../auth/models/auth-user';



@Injectable({
  providedIn: 'root'
})
export class PeopleService {
  static readonly collection = 'people';
  private people$: BehaviorSubject<Person[]>;
  private user: AuthUser;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private data: DataService,
    private storage: StorageService,
  ) {
    this.user = this.auth.user;
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



  getPeople(): Observable<Person[]> {
    if (!this.people$) {
      this.people$ = new BehaviorSubject<Person[]>([]);
      this.api.getDataFromCollection(
        PeopleService.collection,
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


  getPersonValues(id: string, altCollection?: string): Observable<Values> {
    const collection = `${altCollection ? altCollection : PeopleService.collection}/${id}/attributes`;
    return this.api.getDataFromCollection(
      collection,
    ).pipe(
      map((values) => PeopleService.transformValues(id, values)),
    );
  }


  store(person: Partial<Person>, personId?: string) {
    return this.data.store(person, PeopleService.collection, personId);
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
}
