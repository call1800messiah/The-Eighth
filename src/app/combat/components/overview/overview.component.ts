import { Component, OnInit } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { faList, faPlus, faUsers } from '@fortawesome/free-solid-svg-icons';

import type { Combatant } from '../../models/combatant';
import type { Person } from '../../../people/models/person';
import type { AuthUser } from '../../../auth/models/auth-user';
import { CombatService } from '../../services/combat.service';
import { PopoverService } from '../../../core/services/popover.service';
import { SelectPeopleComponent } from '../../../people/components/select-people/select-people.component';
import { PeopleService } from '../../../people/services/people.service';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';



@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {
  combatants$: Observable<Combatant[]>;
  displayAsBox: boolean;
  faList = faList;
  faPlus = faPlus;
  faUsers = faUsers;
  newCombatant = '';
  people: Person[];
  user: AuthUser;
  showAsList = false;

  constructor(
    private auth: AuthService,
    private combatService: CombatService,
    private peopleService: PeopleService,
    private popover: PopoverService,
  ) {
    this.combatants$ = this.combatService.getCombatants();
    this.displayAsBox = environment.tenant === 'tde5';
    this.showAsList = localStorage.getItem('combat-show-as-list') === 'true';
    this.user = this.auth.user;
  }

  ngOnInit(): void {}



  addCombatant() {
    if (this.newCombatant !== '') {
      this.combatService.addCombatant(this.newCombatant);
      this.newCombatant = '';
    }
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
        SelectPeopleComponent,
        {
          ...data,
          onPersonSelected: (person: Person) => {
            this.combatService.addCombatant(person);
          },
          onPersonDeselected: (id: string) => {
            this.combatService.removeCombatantByPersonId(id);
          },
        },
      );
    });
  }


  toggleDisplayStyle() {
    this.showAsList = !this.showAsList;
    localStorage.setItem('combat-show-as-list', this.showAsList.toString());
  }
}
