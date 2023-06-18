import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthService } from './core/services/auth.service';
import { environment } from '../environments/environment';



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
    document.body.classList.add('tde5');
  }
}
