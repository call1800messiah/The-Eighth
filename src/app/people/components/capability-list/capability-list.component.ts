import { Component, Input } from '@angular/core';
import { faBolt, faHandsPraying, faPersonSwimming, faPlus, faThumbsDown, faThumbsUp, faWandSparkles } from '@fortawesome/free-solid-svg-icons';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Capability, Liturgy, Person, Skill, Spell } from '../../models';
import type { AddableRule } from '../../../rules';
import { PopoverService } from '../../../core/services/popover.service';
import { EditCapabilityComponent } from '../edit-capability/edit-capability.component';
import { DiceRollerService } from '../../../dice/services/dice-roller.service';
import { RulesService } from '../../../rules/services/rules.service';

@Component({
  selector: 'app-capability-list',
  templateUrl: './capability-list.component.html',
  styleUrl: './capability-list.component.scss'
})
export class CapabilityListComponent {
  @Input() person: Person;
  displayRule$: Observable<AddableRule | undefined>;
  faBolt = faBolt;
  faHandsPraying = faHandsPraying;
  faPersonSwimming = faPersonSwimming
  faPlus = faPlus;
  faThumbsDown = faThumbsDown;
  faThumbsUp = faThumbsUp;
  faWandSparkles = faWandSparkles;
  private selectedRule$: BehaviorSubject<string | undefined>;

  constructor(
    private popover: PopoverService,
    private dice: DiceRollerService,
    private rules: RulesService,
  ) {
    this.selectedRule$ = new BehaviorSubject(undefined);
    this.displayRule$ = combineLatest([this.rules.getDynamicRules(), this.selectedRule$]).pipe(
      map(([rules, selectedRule]) => rules.find((rule) => rule.id === selectedRule))
    );
  }

  addCapability(type?: AddableRule['type']): void {
    this.popover.showPopover('Fähigkeit hinzufügen', EditCapabilityComponent, { person: this.person, type });
  }

  editCapability(capability: Capability, type: AddableRule['type']): void {
    this.popover.showPopover('Fähigkeit bearbeiten', EditCapabilityComponent, { capability, person: this.person, type });
  }

  rollCapability(capability: Spell | Skill | Liturgy): void {
    const first = this.person.attributes.find((att) => att.type === capability.attributeOne);
    const second = this.person.attributes.find((att) => att.type === capability.attributeTwo);
    const third = this.person.attributes.find((att) => att.type === capability.attributeThree);
    const skill =  capability.value;

    if (first && second && third) {
      const modifier = parseInt(window.prompt('Mofikator eingeben', '0'), 10);
      this.dice.rollSkillCheck(
        first.current,
        second.current,
        third.current,
        skill,
        !Number.isNaN(modifier) ? modifier : 0,
        capability.name
      );
    }
  }

  toggleRule(rule?: string): void {
    this.selectedRule$.next(rule);
  }
}
