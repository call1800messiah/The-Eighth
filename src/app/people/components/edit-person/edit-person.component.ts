import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';

import type { Person } from '../../models/person';
import type { Place } from '../../../places/models/place';
import type { PopoverChild } from '../../../shared/models/popover-child';
import { AuthService } from '../../../core/services/auth.service';
import { PeopleService } from '../../services/people.service';
import { PlaceService } from '../../../places/services/place.service';



@Component({
  selector: 'app-edit-person',
  templateUrl: './edit-person.component.html',
  styleUrls: ['./edit-person.component.scss']
})
export class EditPersonComponent implements OnInit, OnDestroy, PopoverChild {
  @Input() props: Person;
  @Output() dismissPopover = new EventEmitter<boolean>();
  personForm = new UntypedFormGroup({
    birthday: new UntypedFormControl(''),
    birthyear: new UntypedFormControl(1000),
    culture: new UntypedFormControl(''),
    deathday: new UntypedFormControl(''),
    height: new UntypedFormControl(0),
    location: new UntypedFormControl(''),
    name: new UntypedFormControl(''),
    pc: new UntypedFormControl(false),
    profession: new UntypedFormControl(''),
    race: new UntypedFormControl(''),
    title: new UntypedFormControl(''),
    xp: new UntypedFormControl(0),
  });
  userID: string;
  places: Place[] = [];
  placeTypes = PlaceService.placeTypes;
  private subscription = new Subscription();

  constructor(
    private auth: AuthService,
    private peopleService: PeopleService,
    private placeService: PlaceService,
  ) {
    this.subscription.add(
      this.auth.user$.subscribe((user) => {
        this.userID = user.id;
      })
    );
    this.subscription.add(
      this.placeService.getPlaces().subscribe((places) => {
        this.places = places;
      })
    );
  }

  ngOnInit(): void {
    if (this.props.id) {
      const person = this.props as Person;
      this.personForm.patchValue(person);
      if (person.location && person.location.id) {
        this.personForm.patchValue({ location: person.location.id });
      } else if (person.location) {
        this.personForm.patchValue({ location: person.location.name });
      }
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
