import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { NavigationService } from '../../services/navigation.service';



@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  pageLabel$: Observable<string>;

  constructor(
    public nav: NavigationService,
  ) {
    this.pageLabel$ = this.nav.pageLabel$;
  }

  ngOnInit(): void {}
}
