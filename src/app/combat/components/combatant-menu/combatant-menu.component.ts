import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { faUnlock } from '@fortawesome/free-solid-svg-icons';

import { PopoverChild } from '../../../popover/interfaces/popover-child.model';
import { CombatService } from '../../services/combat.service';
import { RulesService } from '../../../core/services/rules.service';
import { Combatant } from '../../../core/interfaces/combatant.interface';
import { CombatState } from '../../../core/interfaces/combat-state.interface';
import { UtilService } from '../../../core/services/util.service';



@Component({
  selector: 'app-combatant-menu',
  templateUrl: './combatant-menu.component.html',
  styleUrls: ['./combatant-menu.component.scss']
})
export class CombatantMenuComponent implements OnInit, PopoverChild {
  @Input() data: Combatant;
  @Output() dismissPopover = new EventEmitter<boolean>();
  deleteDisabled = true;
  faUnlock = faUnlock;
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


  removeCombatant() {
    this.combatService.removeCombatant(this.data.id);
    this.dismissPopover.emit(true);
  }


  setCombatantStates(states) {
    this.combatService.setStates(this.data.id, states);
  }


  toggleDelete() {
    this.deleteDisabled = !this.deleteDisabled;
  }
}
