import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import { PopoverChild } from '../../../popover/interfaces/popover-child.model';
import { DataService } from '../../../core/services/data.service';
import { Person } from '../../../core/interfaces/person.interface';



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


  save() {
    const person: Person = {...this.personForm.value};
    if (this.data.id) {
      person.id = this.data.id;
    }
    this.dataService.store(person, 'people').then(() => {
      this.dismissPopover.emit(true);
    });
  }
}
