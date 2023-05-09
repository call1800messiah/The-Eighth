import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';

import { PopoverChild } from '../../../shared/models/popover-child';
import { Person } from '../../models/person';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { PeopleService } from '../../services/people.service';



@Component({
  selector: 'app-edit-person',
  templateUrl: './edit-person.component.html',
  styleUrls: ['./edit-person.component.scss']
})
export class EditPersonComponent implements OnInit, OnDestroy, PopoverChild {
  @Input() props: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  personForm = new UntypedFormGroup({
    name: new UntypedFormControl(''),
    title: new UntypedFormControl(''),
    race: new UntypedFormControl(''),
    culture: new UntypedFormControl(''),
    profession: new UntypedFormControl(''),
    birthday: new UntypedFormControl(''),
    birthyear: new UntypedFormControl(1000),
    height: new UntypedFormControl(0),
    deathday: new UntypedFormControl(''),
    pc: new UntypedFormControl(false),
    isPrivate: new UntypedFormControl(false)
  });
  userID: string;
  private subscription = new Subscription();

  constructor(
    private peopleService: PeopleService,
    private auth: AuthService,
  ) {
    this.subscription.add(
      this.auth.user$.subscribe((user) => {
        this.userID = user.id;
      })
    );
  }

  ngOnInit(): void {
    if (this.props.id) {
      const person = this.props as Person;
      this.personForm.patchValue(person);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }


  save() {
    const person: Person = {
      ...this.personForm.value
    };
    if (this.props.id) {
      person.owner = this.props.owner;
    } else {
      person.owner = this.userID;
    }
    this.peopleService.store(person, this.props.id).then(() => {
      this.dismissPopover.emit(true);
    });
  }
}
