import { Component, EventEmitter, Input, Output } from '@angular/core';
import { faEdit, faPlus } from '@fortawesome/free-solid-svg-icons';
import { Observable } from 'rxjs';
import type { Enemy } from '../../models/enemy';
import { CombatService } from '../../services/combat.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditEnemyComponent } from '../edit-enemy/edit-enemy.component';
import { PopoverChild } from '../../../shared/models/popover-child';

@Component({
  selector: 'app-list-enemies',
  templateUrl: './list-enemies.component.html',
  styleUrl: './list-enemies.component.scss'
})
export class ListEnemiesComponent implements PopoverChild {
  @Input() props: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  enemies$: Observable<Enemy[]>;
  faEdit = faEdit;
  faPlus = faPlus;

  constructor(
    private combatService: CombatService,
    private popoverService: PopoverService,
  ) {
    this.enemies$ = this.combatService.getEnemies();
  }

  addEnemyAsCombatant(enemy: Enemy) {
    this.combatService.addEnemyAsCombatant(enemy);
  }

  editEnemy(enemy: Enemy) {
    this.dismissPopover.emit(true);
    this.popoverService.showPopover('Gegner bearbeiten', EditEnemyComponent, enemy);
  }
}
