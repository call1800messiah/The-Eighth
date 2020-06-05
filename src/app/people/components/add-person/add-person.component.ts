import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

import { PopoverChild } from '../../../popover/interfaces/popover-child.model';
import { DataService } from '../../../core/services/data.service';
import { Person } from '../../../core/models/person.model';
import { FormControl, FormGroup } from '@angular/forms';



@Component({
  selector: 'app-add-person',
  templateUrl: './add-person.component.html',
  styleUrls: ['./add-person.component.scss']
})
export class AddPersonComponent implements OnInit, PopoverChild {
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
    // image: new FormControl(''),
    pc: new FormControl(false),
  });

  constructor(
    private dataService: DataService,
  ) { }

  ngOnInit(): void {
  }


  savePerson() {
    const person: Person = {...this.personForm.value};
    this.dataService.addPerson(person).then((success) => {
      console.log(success);
      if (success) {
        this.dismissPopover.emit(true);
      }
    }).catch((error) => {
      console.log(error);
    });
  }
}
