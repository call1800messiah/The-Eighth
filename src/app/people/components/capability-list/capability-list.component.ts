import { Component, Input } from '@angular/core';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import type { Capability, Person, Skill, Spell } from '../../models';
import type { AddableRule } from '../../../rules';
import { PopoverService } from '../../../core/services/popover.service';
import { EditCapabilityComponent } from '../edit-capability/edit-capability.component';
import { DiceRollerService } from '../../../dice/services/dice-roller.service';

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
    private dice: DiceRollerService,
  ) {}

  addCapability(type?: AddableRule['type']): void {
    this.popover.showPopover('Fähigkeit hinzufügen', EditCapabilityComponent, { person: this.person, type });
  }

  editCapability(capability: Capability, type: AddableRule['type']): void {
    this.popover.showPopover('Fähigkeit bearbeiten', EditCapabilityComponent, { capability, person: this.person, type });
  }

  rollCapability(capability: Spell | Skill): void {
    const first = this.person.attributes.find((att) => att.type === capability.attributeOne);
    const second = this.person.attributes.find((att) => att.type === capability.attributeTwo);
    const third = this.person.attributes.find((att) => att.type === capability.attributeThree);
    const skill =  capability.value;
    console.log('Roll?', first, second, third, skill);

    if (first && second && third) {
      this.dice.rollSkillCheck(first.current, second.current, third.current, skill);
    }
  }
}
