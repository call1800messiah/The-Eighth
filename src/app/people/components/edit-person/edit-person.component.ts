import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import { PopoverChild } from '../../../popover/models/popover-child';
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
  personForm = new FormGroup({
    name: new FormControl(''),
    title: new FormControl(''),
    race: new FormControl(''),
    culture: new FormControl(''),
    profession: new FormControl(''),
    birthday: new FormControl(''),
    birthyear: new FormControl(1000),
    height: new FormControl(0),
    deathday: new FormControl(''),
    pc: new FormControl(false),
    isPrivate: new FormControl(false)
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
