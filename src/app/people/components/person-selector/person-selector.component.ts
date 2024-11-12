import { Component, EventEmitter, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';

import type { Person } from '../../models';
import type { AuthUser } from '../../../auth/models/auth-user';
import { PeopleService } from '../../services/people.service';
import { AuthService } from '../../../core/services/auth.service';



@Component({
  selector: 'app-person-selector',
  templateUrl: './person-selector.component.html',
  styleUrl: './person-selector.component.scss'
})
export class PersonSelectorComponent {
  @Output() personSelected = new EventEmitter<Person>();
  people$: Observable<Person[]>;
  user: AuthUser;
  personForm = new UntypedFormGroup({
    selectedPersonId: new UntypedFormControl('')
  });

  constructor(
    private auth: AuthService,
    private peopleService: PeopleService,
  ) {
    this.user = this.auth.user;
    const selectedPersonId = localStorage.getItem('sidebar-selected-person');
    if (selectedPersonId) {
      this.personForm.patchValue({ selectedPersonId });
    }
    this.people$ = this.peopleService.getPeople().pipe(
      map(people => people.filter(person => person.owner === this.user.id)),
      tap(people => {
        if (!selectedPersonId) {
          return;
        }

        const person = people.find(person => person.id === selectedPersonId);
        if (person) {
          this.personSelected.emit(person);
        }
      }),
    )
  }



  onSelectionChange() {
    localStorage.setItem('sidebar-selected-person', this.personForm.get('selectedPersonId').value);
    this.people$.pipe(take(1)).subscribe(people => {
      const person = people.find(person => person.id === this.personForm.get('selectedPersonId').value);
      this.personSelected.emit(person);
    });
  }
}
