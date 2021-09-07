import { Component, OnInit } from '@angular/core';
import { faBars, faDice, faMusic } from '@fortawesome/free-solid-svg-icons';
import { Observable } from 'rxjs';

import { NavigationService } from '../../services/navigation.service';
import { NavEntry } from '../../models/nav-entry';



@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {
  audioVisible = false;
  diceVisible = false;
  faBars = faBars;
  faDice = faDice;
  faMusic = faMusic;
  navigation: NavEntry[];
  navVisible$: Observable<boolean>;

  constructor(
    public nav: NavigationService,
  ) {
    this.navVisible$ = this.nav.navVisible$;
    this.navigation = this.nav.getNavigation();
  }

  ngOnInit(): void {
  }


  navigateTo(target: string): void {
    this.nav.navigateTo(target);
  }


  toggleAudio(): void {
    this.nav.setNavigationVisible(false);
    this.diceVisible = false;
    this.audioVisible = !this.audioVisible;
  }


  toggleNavigation(): void {
    this.audioVisible = false;
    this.diceVisible = false;
    this.nav.toggleNavigation();
  }


  toggleDice(): void {
    this.nav.setNavigationVisible(false);
    this.audioVisible = false;
    this.diceVisible = !this.diceVisible;
  }
}
