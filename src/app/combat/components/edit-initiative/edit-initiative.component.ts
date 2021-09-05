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
  @Input() props: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  initiativeForm = new FormGroup({
    active: new FormControl(false),
    initiative: new FormControl(0),
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
