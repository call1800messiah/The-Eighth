import { Component, OnInit } from '@angular/core';
import { faBars, faDice, faMusic } from '@fortawesome/free-solid-svg-icons';
import { Observable } from 'rxjs';

import { NavigationService } from '../../services/navigation.service';



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


  toggleAudio() {
    this.nav.setNavigationVisible(false);
    this.diceVisible = false;
    this.audioVisible = !this.audioVisible;
  }


  toggleNavigation() {
    this.audioVisible = false;
    this.diceVisible = false;
    this.nav.toggleNavigation();
  }


  toggleDice() {
    this.nav.setNavigationVisible(false);
    this.audioVisible = false;
    this.diceVisible = !this.diceVisible;
  }
}
