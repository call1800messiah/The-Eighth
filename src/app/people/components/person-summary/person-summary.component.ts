import { Component, Input, OnInit } from '@angular/core';
import { faSkullCrossbones, faUser } from '@fortawesome/free-solid-svg-icons';

import { Person } from '../../../core/models/person.model';



@Component({
  selector: 'app-person-summary',
  templateUrl: './person-summary.component.html',
  styleUrls: ['./person-summary.component.scss']
})
export class PersonSummaryComponent implements OnInit {
  @Input() person: Person;
  faSkullCrossbones = faSkullCrossbones;
  faUser = faUser;

  constructor() { }

  ngOnInit(): void {
  }

}

