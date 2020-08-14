import { Injectable } from '@angular/core';
import { Event, NavigationEnd, Router } from '@angular/router';
import { faDharmachakra, faFistRaised, faTrophy, faUsers } from '@fortawesome/free-solid-svg-icons';
import { BehaviorSubject } from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  public navVisible$: BehaviorSubject<boolean>;
  public pageLabel$: BehaviorSubject<string>;
  private showNav = false;
  private activeNavigation: any;
  private navigation = [
    {
      label: 'Isidas Hoffnung',
      icon: faDharmachakra,
      link: '/overview'
    },
    {
      label: 'Kampf',
      icon: faFistRaised,
      link: '/combat'
    },
    {
      label: 'Personen',
      icon: faUsers,
      link: '/people'
    },
    {
      label: 'Achievements',
      icon: faTrophy,
      link: '/achievements'
    },
  ];

  constructor(
    private router: Router,
  ) {
    this.navVisible$ = new BehaviorSubject(this.showNav);
    this.activeNavigation = this.navigation[0];
    this.pageLabel$ = new BehaviorSubject(this.activeNavigation.label);
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        const active = this.navigation.find((page) => page.link === event.url);
        if (active) {
          this.activeNavigation = active;
          this.pageLabel$.next(this.activeNavigation.label);
        }
      }
    });
  }



  getNavigation() {
    return this.navigation;
  }


  navigateTo(target: string) {
    this.router.navigate([target]);
    this.toggleNavigation();
  }


  setNavigationVisible(visible: boolean) {
    this.showNav = visible;
    this.navVisible$.next(this.showNav);
  }


  setPageLabel(title: string) {
    this.pageLabel$.next(title);
  }


  toggleNavigation() {
    this.showNav = !this.showNav;
    this.navVisible$.next(this.showNav);
  }
}
