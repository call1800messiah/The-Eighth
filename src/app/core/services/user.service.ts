import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { User } from '../interfaces/user.interface';
import { ApiService } from './api.service';



@Injectable({
  providedIn: 'root'
})
export class UserService {
  private users$: Observable<User[]>;

  constructor(
    private api: ApiService
  ) {}


  private static transformUser(users: any[]): User[] {
    return users.reduce((all, entry) => {
      const user = entry.payload.doc.data();
      all.push({
        id: entry.payload.doc.id,
        ...user
      });
      return all;
    }, []);
  }



  getUsers(): Observable<User[]> {
    if (!this.users$) {
      this.users$ = this.api.getDataFromCollection('users').pipe(
        map(UserService.transformUser)
      );
    }

    return this.users$;
  }
}
