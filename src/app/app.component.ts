import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthService } from './core/services/auth.service';
import { environment } from '../environments/environment';
import { ConfigService } from './core/services/config.service';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  isLoggedIn$: Observable<boolean>;
  sidebarOpen$: Observable<boolean>;

  constructor(
    private auth: AuthService,
    private config: ConfigService,
  ) {
    this.isLoggedIn$ = this.auth.isLoggedIn();
    this.sidebarOpen$ = this.config.sidebarOpen$;
    document.body.classList.add(environment.tenant);
  }
}
