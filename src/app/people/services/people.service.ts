import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, withLatestFrom } from 'rxjs';
import { map, take } from 'rxjs/operators';

import type { Advantage, Cantrip, Disadvantage, Feat, Liturgy, Person, Relative, Skill } from '../models';
import type { Attribute } from '../../shared';
import type { AddableRule } from '../../rules';
import type { Place } from '../../places/models/place';
import { ApiService } from '../../core/services/api.service';
import { StorageService } from '../../core/services/storage.service';
import { UtilService } from '../../core/services/util.service';
import { DataService } from '../../core/services/data.service';
import { PlaceService } from '../../places/services/place.service';
import { RulesService } from '../../rules/services/rules.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';



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

  constructor(
    private api: ApiService,
    private data: DataService,
    private place: PlaceService,
    private realtime: RealtimeService,
    private rules: RulesService,
    private storage: StorageService,
  ) {}



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


  private static resolveRules(person: Person, row: any, rules: AddableRule[]): Person {
    const resolvedPerson = { ...person };

    if (row.person_advantages) {
      resolvedPerson.advantages = row.person_advantages.reduce((acc: Advantage[], pa: any) => {
        const rule = rules.find(r => r.id === pa.rule_id);
        if (rule && rule.type === 'advantage') {
          const advantage: Advantage = { id: pa.rule_id, name: rule.name };
          if (pa.level) advantage.level = pa.level;
          if (pa.details) advantage.details = pa.details;
          acc.push(advantage);
        }
        return acc;
      }, []).sort(UtilService.orderByName);
    }

    if (row.person_cantrips) {
      resolvedPerson.cantrips = row.person_cantrips.reduce((acc: Cantrip[], pc: any) => {
        const rule = rules.find(r => r.id === pc.rule_id);
        if (rule && rule.type === 'cantrip') {
          acc.push({ id: pc.rule_id, name: rule.name });
        }
        return acc;
      }, []).sort(UtilService.orderByName);
    }

    if (row.person_disadvantages) {
      resolvedPerson.disadvantages = row.person_disadvantages.reduce((acc: Disadvantage[], pd: any) => {
        const rule = rules.find(r => r.id === pd.rule_id);
        if (rule && rule.type === 'disadvantage') {
          const disadvantage: Disadvantage = { id: pd.rule_id, name: rule.name };
          if (pd.level) disadvantage.level = pd.level;
          if (pd.details) disadvantage.details = pd.details;
          acc.push(disadvantage);
        }
        return acc;
      }, []).sort(UtilService.orderByName);
    }

    if (row.person_feats) {
      resolvedPerson.feats = row.person_feats.reduce((acc: Feat[], pf: any) => {
        const rule = rules.find(r => r.id === pf.rule_id);
        if (rule && rule.type === 'feat') {
          const feat: Feat = { id: pf.rule_id, name: rule.name };
          if (pf.level) feat.level = pf.level;
          if (pf.details) feat.details = pf.details;
          acc.push(feat);
        }
        return acc;
      }, []).sort(UtilService.orderByName);
    }

    if (row.person_liturgies) {
      resolvedPerson.liturgys = row.person_liturgies.reduce((acc: Liturgy[], pl: any) => {
        const rule = rules.find(r => r.id === pl.rule_id);
        if (rule && rule.type === 'liturgy') {
          const liturgy: Liturgy = { id: pl.rule_id, name: rule.name, value: pl.value };
          if (rule.attributeOne) liturgy.attributeOne = rule.attributeOne;
          if (rule.attributeTwo) liturgy.attributeTwo = rule.attributeTwo;
          if (rule.attributeThree) liturgy.attributeThree = rule.attributeThree;
          acc.push(liturgy);
        }
        return acc;
      }, []).sort(UtilService.orderByName);
    }

    if (row.person_skills) {
      resolvedPerson.skills = row.person_skills.reduce((acc: Skill[], ps: any) => {
        const rule = rules.find(r => r.id === ps.rule_id);
        if (rule && rule.type === 'skill') {
          acc.push({
            attributeOne: rule.attributeOne,
            attributeThree: rule.attributeThree,
            attributeTwo: rule.attributeTwo,
            id: ps.rule_id,
            name: rule.name,
            value: ps.value,
          });
        }
        return acc;
      }, []).sort(UtilService.orderByName);
    }

    if (row.person_spells) {
      resolvedPerson.spells = row.person_spells.reduce((acc: Skill[], ps: any) => {
        const rule = rules.find(r => r.id === ps.rule_id);
        if (rule && rule.type === 'spell') {
          acc.push({
            attributeOne: rule.attributeOne,
            attributeThree: rule.attributeThree,
            attributeTwo: rule.attributeTwo,
            id: ps.rule_id,
            name: rule.name,
            value: ps.value,
          });
        }
        return acc;
      }, []).sort(UtilService.orderByName);
    }

    return resolvedPerson;
  }



  async deleteAttribute(personId: string, type: string): Promise<boolean> {
    const { error } = await this.api.from('person_attributes' as any)
      .delete()
      .eq('person_id', personId)
      .eq('type', type);
    return !error;
  }


  getPeople(): Observable<Person[]> {
    if (!this.people$) {
      this.people$ = new BehaviorSubject<Person[]>([]);
      this.realtime.watch<any>(
        'people',
        query => query.select(`
          *,
          person_advantages(rule_id, level, details),
          person_cantrips(rule_id, value),
          person_disadvantages(rule_id, level, details),
          person_feats(rule_id, level, details),
          person_liturgies(rule_id, value),
          person_skills(rule_id, value),
          person_spells(rule_id, value),
          person_attributes(type, current, max),
          person_tags(tag),
          person_relationships(related_person_id, relationship_type)
        `),
        'people',
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


  store(person: Partial<Person>, personId?: string) {
    return this.data.store(person, PeopleService.collection, personId);
  }


  async updateAttribute(personId: string, attribute: Attribute): Promise<boolean> {
    const { error } = await this.api.from('person_attributes' as any)
      .upsert({
        person_id: personId,
        type: attribute.type,
        current: attribute.current,
        max: attribute.max,
      }, { onConflict: 'person_id,type' });
    return !error;
  }



  private deserializePeople([[rows, placeMap], rules]): Person[] {
    return rows.map(row => {
      let person: Person = {
        access: [],
        banner: null,
        birthday: row.birthday || null,
        birthyear: row.birthyear !== undefined ? row.birthyear : null,
        collection: PeopleService.collection,
        culture: row.culture || null,
        deathday: row.deathday || null,
        height: row.height !== undefined ? row.height : null,
        image: null,
        id: row.id,
        name: row.name || '',
        owner: row.owner_id,
        pc: row.pc || false,
        profession: row.profession || null,
        race: row.race || null,
        relatives: {},
        states: [],
        tags: (row.person_tags || []).map((pt: any) => pt.tag),
        title: row.title || null,
        xp: row.xp || 0
      };

      person = PeopleService.resolveRules(person, row, rules);

      if (row.image && row.image !== '') {
        this.storage.getDownloadURL(row.image).subscribe((url) => {
          person.image = url;
        });
      }
      if (row.banner && row.banner !== '') {
        this.storage.getDownloadURL(row.banner).subscribe((url) => {
          person.banner = url;
        });
      }
      if (row.location_id) {
        person.location = {
          name: placeMap[row.location_id]?.name ?? row.location_id,
        };
        if (placeMap[row.location_id]) {
          person.location.id = row.location_id;
        }
      }
      if (row.person_relationships) {
        const relMap: Record<string, Relative[]> = {};
        row.person_relationships.forEach((pr: any) => {
          if (!relMap[pr.relationship_type]) {
            relMap[pr.relationship_type] = [];
          }
          relMap[pr.relationship_type].push({ id: pr.related_person_id, name: pr.related_person_id });
        });
        person.relatives = relMap;
      }
      if (row.person_attributes) {
        person.attributes = row.person_attributes.map((pa: any) => ({
          type: pa.type,
          current: pa.current,
          max: pa.max,
        }));
      }

      return person;
    });
  }
}
