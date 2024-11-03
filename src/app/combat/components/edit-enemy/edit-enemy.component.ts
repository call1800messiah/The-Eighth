import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PopoverChild } from '../../../shared/models/popover-child';
import type { Enemy } from '../../models/enemy';

@Component({
  selector: 'app-edit-enemy',
  templateUrl: './edit-enemy.component.html',
  styleUrl: './edit-enemy.component.scss'
})
export class EditEnemyComponent implements PopoverChild {
  @Input() props: Enemy;
  @Output() dismissPopover = new EventEmitter<boolean>();
}
