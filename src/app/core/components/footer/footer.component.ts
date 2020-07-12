import { Component, OnInit } from '@angular/core';
import { faBars, faMusic } from '@fortawesome/free-solid-svg-icons';
import { Observable } from 'rxjs';
import { NavigationService } from '../../services/navigation.service';
import { PopoverService } from '../../../popover/services/popover.service';
import { AudioPlayerListComponent } from '../../../shared/components/audio-player-list/audio-player-list.component';



@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {
  faBars = faBars;
  faMusic = faMusic;
  navigation: any[];
  navVisible$: Observable<boolean>;

  constructor(
    public nav: NavigationService,
    private popover: PopoverService,
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


  toggleAudio() {
    this.popover.showPopover('Soundboard', AudioPlayerListComponent);
  }
}
