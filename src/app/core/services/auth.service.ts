import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from './api.service';
import { User } from '../interfaces/user.interface';



@Injectable({
  providedIn: 'root'
})
export class AuthService {
  redirectUrl = '/';
  user$: BehaviorSubject<User>;
  private firebaseUser$: Observable<any>;

  constructor(
    private api: ApiService,
    private router: Router,
  ) {
    this.user$ = new BehaviorSubject<User>(null);
    this.firebaseUser$ = this.api.getAuthState();
    this.firebaseUser$.subscribe(user => {
      this.user$.next(AuthService.transformUser(user));
      if (user){
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.setItem('user', null);
      }
    });
  }



  private static transformUser(firebaseUser): User {
    if (!firebaseUser) {
      return null;
    }

    return {
      id: firebaseUser.uid,
      email: firebaseUser.email,
    };
  }


  isLoggedIn(): Observable<boolean> {
    return this.firebaseUser$.pipe(
      map((user) => user !== null),
    );
  }


  login(email, password) {
    this.api.login(email, password).then(() => {
      this.router.navigate([this.redirectUrl]);
      this.redirectUrl = '/';
    }).catch((error) => {
      console.error(error);
    });
  }


  logout() {
    this.api.logout().then(() => {
      this.router.navigate(['auth']);
    });
  }
}
