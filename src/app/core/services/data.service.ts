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
  private people$: Observable<Person[]>;
  private achievements$: Observable<Achievement[]>;

  constructor(
    private api: ApiService
  ) {
    this.people$ = this.api.getPeople().pipe(
      map(this.transformPeople),
    );
    this.achievements$ = combineLatest(
      this.api.getAchievements(),
      this.people$,
    ).pipe(
      map(([achievements, people]) => this.transformAchievements(achievements, people)),
    );
  }
  
  
  getAchievements(): Observable<Achievement[]> {
    return this.achievements$;
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
        new Date(achieve.unlocked),
        achieve.icon,
        people.filter((person) => achieve.people.indexOf(person.id) !== -1),
      ));
      return all;
    }, []);
  }


  private transformPeople(people: any[]): Person[] {
    return people.reduce((all, entry) => {
      const person = entry.payload.doc.data();
      all.push(new Person(
        entry.payload.doc.id,
        person.name || '',
        person.affiliation || null,
        person.birthday || null,
        person.birthyear || null,
        person.culture || null,
        person.deathday || null,
        person.height || null,
        person.image || null,
        person.profession || null,
        person.race || null,
        person.title || null,
      ));
      return all;
    }, []);
  }
}
