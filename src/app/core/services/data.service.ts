import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Person } from '../models/person.model';
import { ApiService } from './api.service';



@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(
    private api: ApiService
  ) {}


  getPeople(): Observable<Person[]> {
    return this.api.getPeople().pipe(
      map(this.transformPeople)
    );
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
