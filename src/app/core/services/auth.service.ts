import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from './api.service';



@Injectable({
  providedIn: 'root'
})
export class AuthService {
  redirectUrl = '/';
  user$: Observable<any>;

  constructor(
    private api: ApiService,
    private router: Router,
  ) {
    this.user$ = this.api.getAuthState();
    this.user$.subscribe(user => {
      if (user){
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.setItem('user', null);
      }
    });
  }


  isLoggedIn(): Observable<boolean> {
    return this.user$.pipe(
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
