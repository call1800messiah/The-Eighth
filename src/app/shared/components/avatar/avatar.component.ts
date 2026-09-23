import { Component, OnInit, Input, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { faUser } from '@fortawesome/free-solid-svg-icons';

import { Person } from '../../../people/models/person';



@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class AvatarComponent implements OnInit {
  @Input() person: Person;
  @Input() priority?: boolean;
  faUser = faUser;

  constructor(
    private router: Router,
  ) { }

  ngOnInit(): void {
  }


  goToPerson() {
    this.router.navigate([`/people/${this.person.id}`]);
  }
}
