import { Injectable } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { Person } from '../models/person.model';
import { ApiService } from './api.service';
import { Achievement } from '../models/achievements.model';



@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly achievements$: Observable<Achievement[]>;
  private readonly campaignInfo$: Observable<any[]>;
  private readonly people$: Observable<Person[]>;

  constructor(
    private api: ApiService
  ) {
    this.campaignInfo$ = this.api.getDataFromCollection('campaign').pipe(
      map(this.transformSnapshotChanges),
    );
    this.people$ = this.api.getDataFromCollection('people').pipe(
      map(this.transformPeople),
      map((people) => people.sort(this.orderByName)),
    );
    this.achievements$ = combineLatest([
      this.api.getDataFromCollection('achievements'),
      this.people$,
    ]).pipe(
      map(([achievements, people]) => this.transformAchievements(achievements, people)),
      map((achievements) => achievements.sort(this.orderByUnlocked)),
    );
  }


  addPerson(newPerson: Person) {
    this.api.addDocumentToCollection(newPerson, 'people').then((result) => {
      console.log('New person created', result);
    }).catch((error) => {
      console.error('Couldn\'t create new person', error);
    });
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
      const person = entry.payload.doc.data();
      all.push({
        id: entry.payload.doc.id,
        name: person.name || '',
        birthday: person.birthday || null,
        birthyear: person.birthyear || null,
        culture: person.culture || null,
        deathday: person.deathday || null,
        height: person.height || null,
        image: person.image || null,
        profession: person.profession || null,
        race: person.race || null,
        title: person.title || null,
        pc: person.pc || false,
      });
      return all;
    }, []);
  }


  private transformSnapshotChanges(changeList: any[]) {
    return changeList.reduce((all, entry) => {
      all.push(entry.payload.doc.data());
      return all;
    }, []);
  }


  private orderByName(a: Person, b: Person) {
    if (a.name > b.name) return 1;
    if (a.name < b.name) return -1;
    return 0;
  }


  private orderByUnlocked(a: Achievement, b: Achievement) {
    if (a.unlocked < b.unlocked) return 1;
    if (a.unlocked > b.unlocked) return -1;
    return 0;
  }
}
