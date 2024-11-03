import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import type { Enemy } from '../../models/enemy';
import { PopoverChild } from '../../../shared/models/popover-child';
import { CombatService } from '../../services/combat.service';

@Component({
  selector: 'app-edit-enemy',
  templateUrl: './edit-enemy.component.html',
  styleUrl: './edit-enemy.component.scss'
})
export class EditEnemyComponent implements OnInit, PopoverChild {
  @Input() props: Enemy;
  @Output() dismissPopover = new EventEmitter<boolean>();
  enemyForm = new UntypedFormGroup({
    name: new UntypedFormControl(''),
  });

  constructor(
    private combatService: CombatService,
  ) {}

  ngOnInit() {
    if (this.props.id) {
      this.enemyForm.patchValue(this.props);
    }
  }

  save() {
    const enemy = this.enemyForm.value;
    this.combatService.storeEnemy(enemy, this.props.id).then(() => {
      this.dismissPopover.emit(true);
    });
  }
}
