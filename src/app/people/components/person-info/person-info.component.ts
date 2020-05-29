import {Component, Input, OnInit} from '@angular/core';
import { faSkullCrossbones } from '@fortawesome/free-solid-svg-icons';

import {Person} from '../../../core/models/person.model';



@Component({
  selector: 'app-person-info',
  templateUrl: './person-info.component.html',
  styleUrls: ['./person-info.component.scss']
})
export class PersonInfoComponent implements OnInit {
  @Input() person: Person;
  faSkullCrossbones = faSkullCrossbones;

  constructor() { }

  ngOnInit(): void {
  }

}
