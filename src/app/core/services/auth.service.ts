import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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

  constructor(
    private api: ApiService,
    private router: Router,
    private userService: UserService,
  ) {
    this.user$ = new BehaviorSubject<AuthUser>(null);

    combineLatest([
      this.api.getAuthState(),
      this.userService.getUsers().pipe(startWith([])),
    ]).pipe(
      map(([supabaseUser, users]) => AuthService.transformUser(supabaseUser, users)),
    ).subscribe(user => {
      this.user = user;
      this.user$.next(this.user);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.setItem('user', null);
      }
    });
  }


  private static transformUser(supabaseUser: SupabaseUser | null, users: any[]): AuthUser | null {
    if (!supabaseUser) {
      return null;
    }

    const user = users.find(u => u.id === supabaseUser.id);

    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      ...user,
    };
  }


  isLoggedIn(): Observable<boolean> {
    return this.api.getAuthState().pipe(
      map(user => user !== null),
    );
  }


  login(email: string, password: string): void {
    this.api.login(email, password).then(({ error }) => {
      if (error) {
        console.error(error);
        return;
      }
      this.router.navigate([this.redirectUrl]);
      this.redirectUrl = '/';
    });
  }


  logout(): void {
    this.api.logout().then(() => {
      this.router.navigate(['auth']);
    });
  }
}
