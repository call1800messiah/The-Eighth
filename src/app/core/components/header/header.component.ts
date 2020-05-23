import { Component, OnInit } from '@angular/core';
import { faBars, faDharmachakra, faTrophy, faUsers } from '@fortawesome/free-solid-svg-icons';



@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  faBars = faBars;
  navigation = [
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
  showNav = false;

  constructor() { }

  ngOnInit(): void {
  }


  toggleNavigation() {
    this.showNav = !this.showNav;
  }
}
