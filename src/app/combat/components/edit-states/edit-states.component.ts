import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import type { CombatState, PopoverChild } from '../../../shared';
import type { Combatant } from '../../models/combatant';
import { CombatService } from '../../services/combat.service';
import { RulesService } from '../../../rules/services/rules.service';
import { UtilService } from '../../../core/services/util.service';

@Component({
  selector: 'app-edit-states',
  templateUrl: './edit-states.component.html',
  styleUrls: ['./edit-states.component.scss']
})
export class EditStatesComponent implements OnInit, PopoverChild {
  @Input() props: Combatant;
  @Output() dismissPopover = new EventEmitter<boolean>();
  states: CombatState[] = [];

  constructor(
    private combatService: CombatService,
    private rulesService: RulesService,
  ) {
    this.rulesService.getRules().then((rules) => {
      this.states = rules.states.sort(UtilService.orderByName);
    });
  }

  ngOnInit(): void {}


  compareStates(state1: CombatState, state2: CombatState) {
    return state1 && state2 ? state1.name === state2.name : state1 === state2;
  }


  setCombatantStates(states: CombatState[]) {
    this.combatService.setStates(this.props.id, states).then();
  }
}
