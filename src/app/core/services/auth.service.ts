import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from './api.service';
import { AuthUser } from '../../auth/models/auth-user';



@Injectable({
  providedIn: 'root'
})
export class AuthService {
  redirectUrl = '/';
  user$: BehaviorSubject<AuthUser>;
  user: AuthUser;
  private firebaseUser$: Observable<any>;

  constructor(
    private api: ApiService,
    private router: Router,
  ) {
    this.user$ = new BehaviorSubject<AuthUser>(null);
    this.firebaseUser$ = this.api.getAuthState();
    this.firebaseUser$.subscribe(user => {
      this.user = AuthService.transformUser(user);
      this.user$.next(this.user);
      if (user){
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.setItem('user', null);
      }
    });
  }



  private static transformUser(firebaseUser): AuthUser {
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
