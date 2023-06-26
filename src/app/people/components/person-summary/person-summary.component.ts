import { Component, Input, OnInit } from '@angular/core';
import { faMask, faSkullCrossbones, faUser } from '@fortawesome/free-solid-svg-icons';

import type { Person } from '../../models/person';
import { AuthUser } from '../../../auth/models/auth-user';
import { AuthService } from '../../../core/services/auth.service';



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
  user: AuthUser;

  constructor(
    private authService: AuthService,
  ) {
    this.user = this.authService.user;
  }

  ngOnInit(): void {
  }

  isOwnerOrCan(access: string): boolean {
    return this.user && (this.user.isGM || this.user[access] || this.user.id === this.person.owner);
  }
}

