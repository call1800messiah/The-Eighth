import { Component, Input } from '@angular/core';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import type { Capability, Person, Skill, Spell } from '../../models';
import type { AddableRule } from '../../../rules';
import { PopoverService } from '../../../core/services/popover.service';
import { EditCapabilityComponent } from '../edit-capability/edit-capability.component';

@Component({
  selector: 'app-capability-list',
  templateUrl: './capability-list.component.html',
  styleUrl: './capability-list.component.scss'
})
export class CapabilityListComponent {
  @Input() person: Person;
  faPlus = faPlus;

  constructor(
    private popover: PopoverService,
  ) {}

  addCapability(type?: AddableRule['type']): void {
    this.popover.showPopover('Fähigkeit hinzufügen', EditCapabilityComponent, { person: this.person, type });
  }

  editCapability(capability: Capability, type: AddableRule['type']): void {
    this.popover.showPopover('Fähigkeit bearbeiten', EditCapabilityComponent, { capability, person: this.person, type });
  }

  rollCapability(capability: Spell | Skill): void {

  }
}
