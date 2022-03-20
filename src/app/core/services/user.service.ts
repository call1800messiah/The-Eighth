import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { User } from '../models/user';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';



@Injectable({
  providedIn: 'root'
})
export class UserService {
  private users$: Observable<User[]>;

  constructor(
    private api: ApiService,
    private auth: AuthService,
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



  getCurrentUser(): Observable<User> {
    return this.users$.pipe(
      map((users) => users.find((user) => user.id === this.auth.user.id))
    );
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
