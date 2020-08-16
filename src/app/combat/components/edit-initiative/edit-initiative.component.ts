import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import { PopoverChild } from '../../../popover/interfaces/popover-child.model';
import { CombatService } from '../../services/combat.service';



@Component({
  selector: 'app-edit-initiative',
  templateUrl: './edit-initiative.component.html',
  styleUrls: ['./edit-initiative.component.scss']
})
export class EditInitiativeComponent implements OnInit, PopoverChild {
  @Input() data: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  initiativeForm = new FormGroup({
    active: new FormControl(false),
    initiative: new FormControl(0),
  });

  constructor(
    private combat: CombatService,
  ) { }

  ngOnInit(): void {
    if (this.data.initiative !== undefined && this.data.active !== undefined) {
      this.initiativeForm.patchValue({
        active: this.data.active,
        initiative: this.data.initiative,
      });
    }
  }


  save() {
    this.combat.setInitiative(
      this.data.combatantId,
      this.initiativeForm.value.initiative,
      this.initiativeForm.value.active
    ).then(() => {
      this.dismissPopover.emit(true);
    });
  }
}
