import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import type { PopoverChild } from '../../../shared/models/popover-child';
import type { Combatant } from '../../models/combatant';
import { CombatService } from '../../services/combat.service';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { CombatantComponent } from '../combatant/combatant.component';



@Component({
  selector: 'app-combatant-menu',
  templateUrl: './combatant-menu.component.html',
  styleUrls: ['./combatant-menu.component.scss']
})
export class CombatantMenuComponent implements OnInit, PopoverChild {
  @Input() props: Combatant;
  @Output() dismissPopover = new EventEmitter<boolean>();
  combatantForm = new UntypedFormGroup({
    name: new UntypedFormControl(''),
  });
  deleteDisabled = true;

  constructor(
    private combatService: CombatService,
  ) {}

  ngOnInit(): void {
    this.combatantForm.patchValue(this.props);
  }



  removeCombatant() {
    this.combatService.removeCombatant(this.props.id);
    this.dismissPopover.emit(true);
  }


  save() {
    const combatant: Combatant = {
      ...this.combatantForm.value,
    };

    this.combatService.store(combatant, this.props.id);
    this.dismissPopover.emit(true);
  }


  toggleDelete() {
    this.deleteDisabled = !this.deleteDisabled;
  }
}
