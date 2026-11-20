import { Component, Input, OnDestroy, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Person } from '../../models';
import type { Attribute } from '../../../shared';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class StatsComponent implements OnDestroy, OnInit {
  private auth = inject(AuthService);

  @Input() person$: Observable<Person>;
  attributes$: Observable<Attribute[]>;
  person: Person;
  private subscription = new Subscription();

  ngOnInit() {
    this.attributes$ = this.person$.pipe(
      map((person) => person.attributes || [])
    );
    this.subscription = this.person$.subscribe((person) => this.person = person);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  // Read auth.user on every call, not once at creation: the sidebar creates
  // this component before AuthService knows whether the user is a GM.
  isOwnerOrCan(access: string): boolean {
    const user = this.auth.user;
    return !!user && (user.isGM || user[access] || user.id === this.person.owner);
  }
}
