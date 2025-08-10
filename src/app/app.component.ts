import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthService } from './core/services/auth.service';
import { environment } from '../environments/environment';
import { ConfigService } from './core/services/config.service';
import { PopoverService } from './core/services/popover.service';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  isLoggedIn$: Observable<boolean>;
  popoverOpen$: Observable<boolean>;
  sidebarOpen$: Observable<boolean>;

  constructor(
    private auth: AuthService,
    private config: ConfigService,
    private popover: PopoverService,
  ) {
    this.isLoggedIn$ = this.auth.isLoggedIn();
    this.sidebarOpen$ = this.config.sidebarOpen$;
    this.popoverOpen$ = this.popover.isPopoverVisible$;
    document.body.classList.add(environment.tenant);
  }
}
