import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Person } from '../models/person.model';
import { ApiService } from './api.service';
import { Achievement } from '../models/achievements.model';



@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(
    private api: ApiService
  ) {}
  
  
  getAchievements(): Observable<Achievement[]> {
    return this.api.getAchievements().pipe(
      map(this.transformAchievements),
    );
  }  


  getPeople(): Observable<Person[]> {
    return this.api.getPeople().pipe(
      map(this.transformPeople),
    );
  }
  
  
  private transformAchievements(achievements: any[]): Achievement[] {
    return achievements.reduce((all, achieve) => {
      all.push(new Achievement(
        achieve.id,
        achieve.name,
        achieve.description,
        new Date(achieve.unlocked),
        achieve.icon,
        achieve.people
      ));
      return all;
    }, []);
  }


  private transformPeople(people: any[]): Person[] {
    return people.reduce((all, person) => {
      all.push(new Person(
        person.id,
        person.name,
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
