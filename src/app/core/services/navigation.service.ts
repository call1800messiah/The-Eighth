import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { faDharmachakra, faTrophy, faUsers } from '@fortawesome/free-solid-svg-icons';
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
      label: 'Home',
      icon: faDharmachakra,
      link: '/'
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
    // TODO: Set this based on initial route
    this.activeNavigation = this.navigation[0];
    this.pageLabel$ = new BehaviorSubject(this.activeNavigation.label);
  }
  
  
  
  getNavigation() {
    return this.navigation;
  }
    
  
  navigateTo(target:string) {
    this.router.navigate([target]).then((success) => {
      if (success) {
        // TODO: Move this to a route change listener
        this.activeNavigation = this.findNavigationByLink(target);
        this.pageLabel$.next(this.activeNavigation.label);
      }
    });
    this.toggleNavigation();
  }
  
  
  toggleNavigation() {
    this.showNav = !this.showNav;
    this.navVisible$.next(this.showNav);
  }
  
  
  private findNavigationByLink(link: string) {
    return this.navigation.find((element) => element.link === link);
  }
}
