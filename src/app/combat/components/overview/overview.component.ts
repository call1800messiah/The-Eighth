import { Component, OnInit } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { faDizzy, faPlus, faUserNinja, faUsers } from '@fortawesome/free-solid-svg-icons';

import { Combatant } from '../../../core/interfaces/combatant.interface';
import { CombatService } from '../../services/combat.service';
import { PopoverService } from '../../../popover/services/popover.service';
import { EditInitiativeComponent } from '../edit-initiative/edit-initiative.component';
import { Person } from '../../../core/interfaces/person.interface';
import { AddPersonAsCombatantComponent } from '../add-person-as-combatant/add-person-as-combatant.component';
import { Attribute } from '../../../core/interfaces/attribute.interface';
import { EditAttributeComponent } from '../../../shared/components/edit-attribute/edit-attribute.component';
import { CombatantMenuComponent } from '../combatant-menu/combatant-menu.component';
import { PeopleService } from '../../../people/services/people.service';



@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {
  combatants$: Observable<Combatant[]>;
  faDizzy = faDizzy;
  faPlus = faPlus;
  faUserNinja = faUserNinja;
  faUsers = faUsers;
  newCombatant = '';
  people: Person[];

  constructor(
    private combatService: CombatService,
    private peopleService: PeopleService,
    private popover: PopoverService,
  ) {
    this.combatants$ = this.combatService.getCombatants();
  }

  ngOnInit(): void {}



  addCombatant() {
    if (this.newCombatant !== '') {
      this.combatService.addCombatant(this.newCombatant);
      this.newCombatant = '';
    }
  }


  editAttribute(attribute: Attribute, fighter) {
    const data = {
      altCollection: null,
      person: fighter.person ? fighter.person.id : fighter.id,
      attribute,
    };
    if (!fighter.person) {
      data.altCollection = this.combatService.combatCollection;
    }
    this.popover.showPopover('Wert editieren', EditAttributeComponent, data);
  }


  setInitiative(combatant: Combatant) {
    this.popover.showPopover(
      `Ini ${combatant.person ? combatant.person.name : combatant.name}`,
      EditInitiativeComponent,
      {
        active: combatant.active,
        combatantId: combatant.id,
        initiative: combatant.initiative
      },
    );
  }


  showAddPersonDialog() {
    combineLatest([
      this.peopleService.getPeople().pipe(
        map((people) => people.filter(person => !person.deathday)),
      ),
      this.combatService.getIdsOfPeopleInFight(),
    ]).pipe(
      map(([people, selected]) => ({ people, selected })),
      take(1),
    ).subscribe((data) => {
      this.popover.showPopover(
        'Kämpfer hinzufügen',
        AddPersonAsCombatantComponent,
        data,
      );
    });
  }


  showMenu(combatant: Combatant) {
    this.popover.showPopover(combatant.name, CombatantMenuComponent, combatant);
  }
}
