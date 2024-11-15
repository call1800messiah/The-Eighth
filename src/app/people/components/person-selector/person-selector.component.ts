import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Person } from '../../models';
import type { AuthUser } from '../../../auth/models/auth-user';
import { PeopleService } from '../../services/people.service';
import { AuthService } from '../../../core/services/auth.service';



@Component({
  selector: 'app-person-selector',
  templateUrl: './person-selector.component.html',
  styleUrl: './person-selector.component.scss'
})
export class PersonSelectorComponent implements OnDestroy, OnInit {
  @Output() personSelected = new EventEmitter<Person>();
  people$: Observable<Person[]>;
  user: AuthUser;
  personForm = new UntypedFormGroup({
    selectedPersonId: new UntypedFormControl('')
  });
  private subscription = new Subscription();

  constructor(
    private auth: AuthService,
    private peopleService: PeopleService,
  ) {
    this.user = this.auth.user;
    this.people$ = this.peopleService.getPeople().pipe(
      map(people => people.filter(person => person.owner === this.user.id)),
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
