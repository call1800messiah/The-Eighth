import { Injectable } from '@angular/core';
import { Event, NavigationEnd, Router } from '@angular/router';
import {
  faChartBar,
  faCompass,
  faDharmachakra,
  faFistRaised,
  faMeteor,
  faNoteSticky,
  faScaleBalanced,
  faShoppingBag,
  faStream,
  faTrophy,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { BehaviorSubject } from 'rxjs';

import { NavEntry } from '../models/nav-entry';



@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  public navVisible$: BehaviorSubject<boolean>;
  public pageLabel$: BehaviorSubject<string>;
  public showBackButton$: BehaviorSubject<boolean>;
  private showNav = false;
  private activeNavigation: NavEntry;
  private currentBackLink: string;
  private navigation: NavEntry[] = [
    {
      label: 'Übersicht',
      icon: faDharmachakra,
      link: '/overview'
    },
    {
      label: 'Kampf',
      icon: faFistRaised,
      link: '/combat'
    },
    {
      label: 'Session Flow',
      icon: faStream,
      link: '/flow'
    },
    {
      label: 'Orte',
      icon: faCompass,
      link: '/places'
    },
    {
      label: 'Personen',
      icon: faUsers,
      link: '/people'
    },
    {
      label: 'Projekte',
      icon: faChartBar,
      link: '/projects'
    },
    {
      label: 'Achievements',
      icon: faTrophy,
      link: '/achievements'
    },
    {
      label: 'Abenteuer',
      icon: faMeteor,
      link: '/quests'
    },
    {
      label: 'Inventar',
      icon: faShoppingBag,
      link: '/inventory'
    },
    {
      label: 'Notizen',
      icon: faNoteSticky,
      link: '/notes'
    },
    {
      label: 'Regeln',
      icon: faScaleBalanced,
      link: '/rules'
    },
  ];

  constructor(
    private router: Router,
  ) {
    this.navVisible$ = new BehaviorSubject(this.showNav);
    this.activeNavigation = this.navigation[0];
    this.pageLabel$ = new BehaviorSubject(this.activeNavigation.label);
    this.showBackButton$ = new BehaviorSubject<boolean>(false);
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        if (!this.currentBackLink) {
          this.showBackButton$.next(false);
        }
        const active = this.navigation.find((page) => page.link === event.url);
        if (active) {
          this.activeNavigation = active;
          this.pageLabel$.next(this.activeNavigation.label);
        }
      }
    });
  }



  getNavigation(): NavEntry[] {
    return this.navigation;
  }


  navigateBack() {
    this.navigateTo(this.currentBackLink);
    this.showBackButton$.next(false);
  }


  navigateTo(target: string): void {
    this.router.navigate([target]);
    this.currentBackLink = '';
  }


  setNavigationVisible(visible: boolean): void {
    this.showNav = visible;
    this.navVisible$.next(this.showNav);
  }


  setPageLabel(title: string, backLink?: string): void {
    this.pageLabel$.next(title);
    if (backLink) {
      this.showBackButton$.next(true);
      this.currentBackLink = backLink;
    } else {
      this.currentBackLink = '';
    }
  }


  toggleNavigation(): void {
    this.showNav = !this.showNav;
    this.navVisible$.next(this.showNav);
  }
}
