import { Component, Input, OnInit } from '@angular/core';
import { faMask, faSkullCrossbones, faUser } from '@fortawesome/free-solid-svg-icons';

import { Person } from '../../models/person';



@Component({
  selector: 'app-person-summary',
  templateUrl: './person-summary.component.html',
  styleUrls: ['./person-summary.component.scss']
})
export class PersonSummaryComponent implements OnInit {
  @Input() person: Person;
  faMask = faMask;
  faSkullCrossbones = faSkullCrossbones;
  faUser = faUser;

  constructor() { }

  ngOnInit(): void {
  }

}

