import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Observable } from 'rxjs';

import { NavigationService } from '../../services/navigation.service';



@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class HeaderComponent implements OnInit {
  private nav = inject(NavigationService);

  faArrowLeft = faArrowLeft;
  pageLabel$: Observable<string>;
  showBackButton$: Observable<boolean>;

  constructor() {
    this.pageLabel$ = this.nav.pageLabel$;
    this.showBackButton$ = this.nav.showBackButton$;
  }

  ngOnInit(): void {}


  navigateBack() {
    this.nav.navigateBack();
  }
}
