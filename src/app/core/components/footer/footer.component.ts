import { Component, OnInit } from '@angular/core';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { Observable } from 'rxjs';
import { NavigationService } from '../../services/navigation.service';



@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {
  faBars = faBars;
  navigation: any[];
  navVisible$: Observable<boolean>;

  constructor(
    public nav: NavigationService,
  ) {
    this.navVisible$ = this.nav.navVisible$;
    this.navigation = this.nav.getNavigation();
  }

  ngOnInit(): void {
  }


  navigateTo(target: string) {
    this.nav.navigateTo(target);
  }


  toggleNavigation() {
    this.nav.toggleNavigation();
  }
}
