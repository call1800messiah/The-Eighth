import { Component, OnInit } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { faDizzy, faPlus, faUserNinja, faUsers } from '@fortawesome/free-solid-svg-icons';

import { Combatant } from '../../../core/interfaces/combatant.interface';
import { CombatService } from '../../services/combat.service';
import { PopoverService } from '../../../popover/services/popover.service';
import { EditInitiativeComponent } from '../edit-initiative/edit-initiative.component';
import { Person } from '../../../core/interfaces/person.interface';
import { DataService } from '../../../core/services/data.service';
import { AddPersonAsCombatantComponent } from '../add-person-as-combatant/add-person-as-combatant.component';



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
    private dataService: DataService,
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


  removeCombatant(id: string) {
    if (window.confirm('Wirklich entfernen?')) {
      this.combatService.removeCombatant(id);
    }
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
      this.dataService.getPeople(),
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
}
