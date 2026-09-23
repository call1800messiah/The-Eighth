import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy, inject } from '@angular/core';

import { PopoverChild } from '../../../shared/models/popover-child';
import { Person } from '../../../people/models/person';
import { CombatService } from '../../services/combat.service';



@Component({
  selector: 'app-add-combatant',
  templateUrl: './add-person-as-combatant.component.html',
  styleUrls: ['./add-person-as-combatant.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class AddPersonAsCombatantComponent implements OnInit, PopoverChild {
  private combat = inject(CombatService);

  @Input() props: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  people: Person[];
  selected: {[id: number]: boolean};

  ngOnInit(): void {
    this.people = this.props.people;
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
    return this.props.selected.indexOf(person.id) !== -1;
  }
}
