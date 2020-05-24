import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { faUser } from '@fortawesome/free-solid-svg-icons';

import { Person } from 'src/app/core/models/person.model';



@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss']
})
export class AvatarComponent implements OnInit {
  @Input() person: Person;
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
