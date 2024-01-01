import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import firebase from 'firebase/compat';

import type { AuthUser } from '../../auth/models/auth-user';
import { ApiService } from './api.service';
import { UserService } from './user.service';



@Injectable({
  providedIn: 'root'
})
export class AuthService {
  redirectUrl = '/';
  user$: BehaviorSubject<AuthUser>;
  user: AuthUser;
  private firebaseUser$: Observable<firebase.User>;

  constructor(
    private api: ApiService,
    private router: Router,
    private userService: UserService,
  ) {
    this.user$ = new BehaviorSubject<AuthUser>(null);
    this.firebaseUser$ = this.api.getAuthState();
    combineLatest([
      this.firebaseUser$,
      this.userService.getUsers().pipe(
        startWith([]),
      )
    ]).pipe(
      map(AuthService.transformUser),
    ).subscribe(user => {
      this.user = user;
      this.user$.next(this.user);
      if (user){
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.setItem('user', null);
      }
    });
  }



  private static transformUser([firebaseUser, users]): AuthUser | null {
    if (!firebaseUser) {
      return null;
    }

    const user = users.find((u) => u.id === firebaseUser.uid);

    return {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      ...user,
    };
  }


  isLoggedIn(): Observable<boolean> {
    return this.firebaseUser$.pipe(
      map((user) => user !== null),
    );
  }


  login(email, password): void {
    this.api.login(email, password).then(() => {
      this.router.navigate([this.redirectUrl]);
      this.redirectUrl = '/';
    }).catch((error) => {
      console.error(error);
    });
  }


  logout(): void {
    this.api.logout().then(() => {
      this.router.navigate(['auth']);
    });
  }
}
