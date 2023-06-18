import { Component, OnInit } from '@angular/core';
import { faBars, faCommentAlt, faDice, faMusic } from '@fortawesome/free-solid-svg-icons';
import { Observable } from 'rxjs';

import { NavigationService } from '../../services/navigation.service';
import { NavEntry } from '../../models/nav-entry';
import { environment } from '../../../../environments/environment';



@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {
  audioVisible = false;
  diceVisible = false;
  faBars = faBars;
  faCommentAlt = faCommentAlt;
  faDice = faDice;
  faMusic = faMusic;
  hasAudio = environment.tenantData[environment.tenant].audioFiles?.length > 0 ;
  messagesVisible = false;
  navigation: NavEntry[];
  navVisible$: Observable<boolean>;

  constructor(
    private nav: NavigationService,
  ) {
    this.navVisible$ = this.nav.navVisible$;
    this.navigation = this.nav.getNavigation();
  }

  ngOnInit(): void {
  }


  navigateTo(target: string): void {
    this.nav.navigateTo(target);
    this.nav.toggleNavigation();
  }


  toggleAudio(): void {
    this.nav.setNavigationVisible(false);
    this.diceVisible = false;
    this.audioVisible = !this.audioVisible;
    this.messagesVisible = false;
  }


  toggleDice(): void {
    this.nav.setNavigationVisible(false);
    this.audioVisible = false;
    this.diceVisible = !this.diceVisible;
    this.messagesVisible = false;
  }


  toggleMessages(): void {
    this.nav.setNavigationVisible(false);
    this.audioVisible = false;
    this.diceVisible = false;
    this.messagesVisible = !this.messagesVisible;
  }


  toggleNavigation(): void {
    this.audioVisible = false;
    this.diceVisible = false;
    this.messagesVisible = false;
    this.nav.toggleNavigation();
  }

}
