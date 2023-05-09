import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';

import { PopoverChild } from '../../../shared/models/popover-child';
import { CombatService } from '../../services/combat.service';



@Component({
  selector: 'app-edit-initiative',
  templateUrl: './edit-initiative.component.html',
  styleUrls: ['./edit-initiative.component.scss']
})
export class EditInitiativeComponent implements OnInit, PopoverChild {
  @Input() props: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  initiativeForm = new UntypedFormGroup({
    active: new UntypedFormControl(false),
    initiative: new UntypedFormControl(0),
  });

  constructor(
    private combat: CombatService,
  ) { }

  ngOnInit(): void {
    if (this.props.initiative !== undefined && this.props.active !== undefined) {
      this.initiativeForm.patchValue({
        active: this.props.active,
        initiative: this.props.initiative,
      });
    }
  }


  save() {
    this.combat.setInitiative(
      this.props.combatantId,
      this.initiativeForm.value.initiative,
      this.initiativeForm.value.active
    ).then(() => {
      this.dismissPopover.emit(true);
    });
  }
}
