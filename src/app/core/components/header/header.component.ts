import { Component, OnInit } from '@angular/core';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Observable } from 'rxjs';

import { NavigationService } from '../../services/navigation.service';



@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  faArrowLeft = faArrowLeft;
  pageLabel$: Observable<string>;
  showBackButton$: Observable<boolean>;

  constructor(
    private nav: NavigationService,
  ) {
    this.pageLabel$ = this.nav.pageLabel$;
    this.showBackButton$ = this.nav.showBackButton$;
  }

  ngOnInit(): void {}


  navigateBack() {
    this.nav.navigateBack();
  }
}
