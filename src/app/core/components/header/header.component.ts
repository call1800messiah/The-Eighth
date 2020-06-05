import { Component, OnInit } from '@angular/core';
import { faBars } from '@fortawesome/free-solid-svg-icons';

import { NavigationService } from '../../services/navigation.service';
import {Observable} from 'rxjs';



@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  faBars = faBars;
  navigation: any[];
  navVisible$: Observable<boolean>;
  pageLabel$: Observable<string>;

  constructor(
    public nav: NavigationService,
  ) {
    this.navVisible$ = this.nav.navVisible$;
    this.pageLabel$ = this.nav.pageLabel$;
    this.navigation = this.nav.getNavigation();
  }

  ngOnInit(): void {}


  navigateTo(target: string) {
    this.nav.navigateTo(target);
  }


  toggleNavigation() {
    this.nav.toggleNavigation();
  }
}
