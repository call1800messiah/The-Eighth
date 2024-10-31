import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Route, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, take, tap } from 'rxjs/operators';

import { AuthService } from './auth.service';



@Injectable({
  providedIn: 'root'
})
export class AuthGuardService  {

  constructor(private authService: AuthService, private router: Router) { }


  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    const url: string = state.url;
    return this.checkLogin(url);
  }


  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.canActivate(route, state);
  }


  canLoad(route: Route): Observable<boolean> {
    const url = `/${route.path}`;
    return this.checkLogin(url);
  }


  private checkLogin(url: string): Observable<boolean> {
    return this.authService.isLoggedIn().pipe(
      take(1),
      tap((loggedIn) => {
        if (!loggedIn) {
          this.authService.redirectUrl = url;
          this.router.navigate(['auth']);
        }
      }),
      catchError(() => {
        this.authService.redirectUrl = url;
        this.router.navigate(['auth']);
        return of(false);
      })
    );
  }
}
