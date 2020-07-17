import { Component } from '@angular/core';

import { AuthService } from './core/services/auth.service';
import { Observable } from 'rxjs';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  isLoggedIn$: Observable<boolean>;

  constructor(
    private auth: AuthService
  ) {
    this.isLoggedIn$ = this.auth.isLoggedIn();
  }
}
