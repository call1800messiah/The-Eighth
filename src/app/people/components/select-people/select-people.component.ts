import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import type { PopoverChild } from '../../../shared/models/popover-child';
import type { Person } from '../../models/person';
import type { SelectPeopleProps } from '../../models/select-people-props';



@Component({
  selector: 'app-select-people',
  templateUrl: './select-people.component.html',
  styleUrls: ['./select-people.component.scss']
})
export class SelectPeopleComponent implements OnInit, PopoverChild {
  @Input() props: SelectPeopleProps;
  @Output() dismissPopover = new EventEmitter<boolean>();
  people: Person[];
  selected: {[id: number]: boolean};

  constructor() { }

  ngOnInit(): void {
    this.people = this.props.people;
    this.selected = this.people.reduce((all, person) => {
      all[person.id] = this.isSelected(person);
      return all;
    }, {});
  }



  selectionChanged(event, person: Person) {
    if (this.selected[person.id]) {
      this.props.onPersonSelected(person);
    } else {
      this.props.onPersonDeselected(person.id);
    }
  }


  private isSelected(person: Person) {
    return this.props.selected.indexOf(person.id) !== -1;
  }
}
