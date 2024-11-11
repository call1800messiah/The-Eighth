import { Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import type { Person } from '../../models';
import type { Attribute } from '../../../shared';
import { PeopleService } from '../../services/people.service';
import type { AuthUser } from '../../../auth/models/auth-user';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss'
})
export class StatsComponent implements OnInit {
  @Input() person: Person;
  attributes$: Observable<Attribute[]>;
  user: AuthUser;

  constructor(
    private auth: AuthService,
    private peopleService: PeopleService,
  ) {
    this.user = this.auth.user;
  }

  ngOnInit() {
    this.attributes$ = this.peopleService.getPersonAttributes(this.person.id);
  }

  isOwnerOrCan(access: string): boolean {
    return this.user && (this.user.isGM || this.user[access] || this.user.id === this.person.owner);
  }
}
