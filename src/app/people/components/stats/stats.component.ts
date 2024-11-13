import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Person } from '../../models';
import type { Attribute } from '../../../shared';
import type { AuthUser } from '../../../auth/models/auth-user';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss'
})
export class StatsComponent implements OnDestroy, OnInit {
  @Input() person$: Observable<Person>;
  attributes$: Observable<Attribute[]>;
  user: AuthUser;
  person: Person;
  private subscription = new Subscription();

  constructor(
    private auth: AuthService,
  ) {
    this.user = this.auth.user;
  }

  ngOnInit() {
    this.attributes$ = this.person$.pipe(
      map((person) => person.attributes || [])
    );
    this.subscription = this.person$.subscribe((person) => this.person = person);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  isOwnerOrCan(access: string): boolean {
    return this.user && (this.user.isGM || this.user[access] || this.user.id === this.person.owner);
  }
}
