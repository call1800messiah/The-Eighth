import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthService } from './core/services/auth.service';
import { environment } from '../environments/environment';
import { PopoverService } from './core/services/popover.service';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  isLoggedIn$: Observable<boolean>;

  constructor(
    private auth: AuthService,
    private popover: PopoverService,
  ) {
    this.isLoggedIn$ = this.auth.isLoggedIn();
    document.body.classList.add(environment.tenant);
    this.popover.isPopoverVisible$.subscribe((isVisible) => {
      document.body.classList.toggle('no-scroll', isVisible);
    });
  }
}
