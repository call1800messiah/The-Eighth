import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy, inject } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';

import type { PopoverChild } from '../../../shared';
import type { Combatant } from '../../models/combatant';
import { CombatService } from '../../services/combat.service';



@Component({
  selector: 'app-combatant-menu',
  templateUrl: './combatant-menu.component.html',
  styleUrls: ['./combatant-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class CombatantMenuComponent implements OnInit, PopoverChild {
  private combatService = inject(CombatService);

  @Input() props: Combatant;
  @Output() dismissPopover = new EventEmitter<boolean>();
  combatantForm = new UntypedFormGroup({
    name: new UntypedFormControl(''),
  });
  deleteDisabled = true;

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
