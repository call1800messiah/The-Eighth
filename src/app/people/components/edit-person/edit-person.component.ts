import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import { PopoverChild } from '../../../popover/interfaces/popover-child.model';
import { DataService } from '../../../core/services/data.service';
import { Person } from '../../../core/interfaces/person.interface';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';



@Component({
  selector: 'app-edit-person',
  templateUrl: './edit-person.component.html',
  styleUrls: ['./edit-person.component.scss']
})
export class EditPersonComponent implements OnInit, OnDestroy, PopoverChild {
  @Input() data: any;
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
  private subscription = new Subscription();
  private userID: string;

  constructor(
    private dataService: DataService,
    private auth: AuthService,
  ) {
    this.subscription.add(
      this.auth.user$.subscribe((user) => {
        this.userID = user.id;
      })
    );
  }

  ngOnInit(): void {
    if (this.data.id) {
      const person = this.data as Person;
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
    if (this.data.id) {
      person.owner = this.data.owner;
    } else {
      person.owner = this.userID;
    }
    this.dataService.store(person, 'people', this.data.id).then(() => {
      this.dismissPopover.emit(true);
    });
  }
}
