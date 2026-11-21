import { Component, EventEmitter, OnDestroy, OnInit, Output, ChangeDetectionStrategy, inject } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Person } from '../../models';
import { PeopleService } from '../../services/people.service';
import { AuthService } from '../../../core/services/auth.service';



@Component({
  selector: 'app-person-selector',
  templateUrl: './person-selector.component.html',
  styleUrl: './person-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class PersonSelectorComponent implements OnDestroy, OnInit {
  private auth = inject(AuthService);
  private peopleService = inject(PeopleService);

  @Output() personSelected = new EventEmitter<Person>();
  people$: Observable<Person[]>;
  personForm = new UntypedFormGroup({
    selectedPersonId: new UntypedFormControl('')
  });
  private subscription = new Subscription();

  constructor() {
    // Follow user$ rather than a snapshot of auth.user: the sidebar exists
    // from app start, and AuthService emits the session user before the users
    // table (and with it isGM) has loaded. GMs may view and edit every
    // character's values (RLS allows it), so they can pick any of them;
    // players only get their own.
    this.people$ = combineLatest([
      this.auth.user$,
      this.peopleService.getPeople(),
    ]).pipe(
      map(([user, people]) => {
        if (!user) {
          return [];
        }
        return user.isGM ? people : people.filter(person => person.owner === user.id);
      }),
    );
  }

  ngOnInit() {
    this.subscription = combineLatest([
      this.personForm.valueChanges,
      this.people$
    ]).subscribe(([changes, people]) => {
      if (changes.selectedPersonId) {
        localStorage.setItem('sidebar-selected-person', changes.selectedPersonId);
        const person = people.find(person => person.id === changes.selectedPersonId);
        this.personSelected.emit(person);
      }
    });
    const selectedPersonId = localStorage.getItem('sidebar-selected-person');
    if (selectedPersonId) {
      this.personForm.patchValue({ selectedPersonId });
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
