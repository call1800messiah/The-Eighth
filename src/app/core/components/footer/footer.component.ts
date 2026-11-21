import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { faBars, faCommentAlt, faDice, faMusic, faPerson } from '@fortawesome/free-solid-svg-icons';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { NavEntry } from '../../models/nav-entry';
import { NavigationService } from '../../services/navigation.service';
import { environment } from '../../../../environments/environment';
import { ConfigService } from '../../services/config.service';
import { AuthService } from '../../services/auth.service';



@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class FooterComponent implements OnInit {
  private auth = inject(AuthService);
  private config = inject(ConfigService);
  private nav = inject(NavigationService);

  audioVisible = false;
  diceVisible = false;
  faBars = faBars;
  faCommentAlt = faCommentAlt;
  faDice = faDice;
  faMusic = faMusic;
  faPerson = faPerson;
  hasAudio = environment.tenantData[environment.tenant].audioFiles?.length > 0 ;
  messagesVisible = false;
  navigation$: Observable<NavEntry[]>;
  navVisible$: Observable<boolean>;

  constructor() {
    this.navVisible$ = this.nav.navVisible$;
    const navigation = this.nav.getNavigation();
    this.navigation$ = this.auth.user$.pipe(
      map(user => navigation.filter(entry => !entry.gmOnly || user?.isGM)),
    );
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


  toggleSidebar(): void {
    this.config.toggleSidebar();
  }
}
