import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { PopoverChild } from '../../../popover/interfaces/popover-child.model';
import { Person } from '../../../core/interfaces/person.interface';
import { CombatService } from '../../services/combat.service';



@Component({
  selector: 'app-add-combatant',
  templateUrl: './add-person-as-combatant.component.html',
  styleUrls: ['./add-person-as-combatant.component.scss']
})
export class AddPersonAsCombatantComponent implements OnInit, PopoverChild {
  @Input() data: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  people: Person[];
  selected: {[id: number]: boolean};

  constructor(
    private combat: CombatService,
  ) { }

  ngOnInit(): void {
    this.people = this.data.people;
    this.selected = this.people.reduce((all, person) => {
      all[person.id] = this.isSelected(person);
      return all;
    }, {});
  }



  selectionChanged(event, person: Person) {
    if (this.selected[person.id]) {
      this.combat.addCombatant(person);
    } else {
      this.combat.removeCombatantByPersonId(person.id);
    }
  }


  private isSelected(person: Person) {
    return this.data.selected.indexOf(person.id) !== -1;
  }
}
