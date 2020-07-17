import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { PopoverChild } from '../../../popover/interfaces/popover-child.model';
import { DataService } from '../../../core/services/data.service';
import { Person } from '../../../core/models/person.model';
import { FormControl, FormGroup } from '@angular/forms';



@Component({
  selector: 'app-edit-person',
  templateUrl: './edit-person.component.html',
  styleUrls: ['./edit-person.component.scss']
})
export class EditPersonComponent implements OnInit, PopoverChild {
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
  });

  constructor(
    private dataService: DataService,
  ) { }

  ngOnInit(): void {
    if (this.data.id) {
      const person = this.data as Person;
      this.personForm.patchValue(person);
    }
  }


  savePerson() {
    const person: Person = {...this.personForm.value};
    if (this.data.id) {
      person.id = this.data.id;
    }
    this.dataService.store(person, 'people').then(() => {
      this.dismissPopover.emit(true);
    });
  }
}
