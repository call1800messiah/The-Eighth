import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { PopoverChild } from '../../../shared';
import type { EditCapabilityProps } from '../../models';

@Component({
  selector: 'app-edit-capability',
  templateUrl: './edit-capability.component.html',
  styleUrl: './edit-capability.component.scss'
})
export class EditCapabilityComponent implements PopoverChild {
  @Input() props: EditCapabilityProps;
  @Output() dismissPopover = new EventEmitter<boolean>();
}
