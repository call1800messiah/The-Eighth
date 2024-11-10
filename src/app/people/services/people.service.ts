import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, withLatestFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Advantage, Disadvantage, Feat, Person, PersonDB, Relative, Skill } from '../models';
import type { Attribute } from '../../shared';
import type { AddableRule } from '../../rules';
import type { AuthUser } from '../../auth/models/auth-user';
import type { Place } from '../../places/models/place';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { StorageService } from '../../core/services/storage.service';
import { UtilService } from '../../core/services/util.service';
import { DataService } from '../../core/services/data.service';
import { PlaceService } from '../../places/services/place.service';
import { RulesService } from '../../rules/services/rules.service';



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
    private rules: RulesService,
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


  private static resolveRules(person: Person, personData: PersonDB, rules: AddableRule[]): Person {
    const resolvedPerson = { ...person };

    if (personData.advantages) {
      resolvedPerson.advantages = Object.entries(personData.advantages).reduce((acc, [id, data]) => {
        const advantage = rules.find(r => r.id === id);
        if (advantage && advantage.type === 'advantage') {
          acc.push({
            details: data.details,
            id,
            level: data.level,
            name: advantage.name,
          });
        }
        return acc;
      }, [] as Advantage[]).sort(UtilService.orderByName);
    }

    if (personData.disadvantages) {
      resolvedPerson.disadvantages = Object.entries(personData.disadvantages).reduce((acc, [id, data]) => {
        const disadvantage = rules.find(r => r.id === id);
        if (disadvantage && disadvantage.type === 'disadvantage') {
          acc.push({
            details: data.details,
            id,
            level: data.level,
            name: disadvantage.name,
          });
        }
        return acc;
      }, [] as Disadvantage[]).sort(UtilService.orderByName);
    }

    if (personData.feats) {
      resolvedPerson.feats = Object.entries(personData.feats).reduce((acc, [id, data]) => {
        const feat = rules.find(r => r.id === id);
        if (feat && feat.type === 'feat') {
          acc.push({
            details: data.details,
            id,
            level: data.level,
            name: feat.name,
          });
        }
        return acc;
      }, [] as Feat[]).sort(UtilService.orderByName);
    }

    if (personData.skills) {
      resolvedPerson.skills = Object.entries(personData.skills).reduce((acc, [id, value]) => {
        const skill = rules.find(r => r.id === id);
        if (skill && skill.type === 'skill') {
          acc.push({
            attributeOne: skill.attributeOne,
            attributeThree: skill.attributeThree,
            attributeTwo: skill.attributeTwo,
            id,
            name: skill.name,
            value,
          });
        }
        return acc;
      }, [] as Skill[]).sort(UtilService.orderByName);
    }

    if (personData.spells) {
      resolvedPerson.spells = Object.entries(personData.spells).reduce((acc, [id, value]) => {
        const spell = rules.find(r => r.id === id);
        if (spell && spell.type === 'spell') {
          acc.push({
            attributeOne: spell.attributeOne,
            attributeThree: spell.attributeThree,
            attributeTwo: spell.attributeTwo,
            id,
            name: spell.name,
            value,
          });
        }
        return acc;
      }, [] as Skill[]).sort(UtilService.orderByName);
    }

    return resolvedPerson;
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
    }, []).sort(UtilService.orderByOrder);
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
        withLatestFrom(this.rules.getDynamicRules()),
        map(this.deserializePeople.bind(this)),
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



  private deserializePeople([[people, placeMap], rules]): Person[] {
    return people.reduce((all, entry) => {
      const personData = entry.payload.doc.data() as PersonDB;
      let person: Person = {
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

      person = PeopleService.resolveRules(person, personData, rules);

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
