import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import { Combatant } from '../../../core/interfaces/combatant.interface';
import { CombatService } from '../../services/combat.service';
import { PopoverService } from '../../../popover/services/popover.service';
import { EditInitiativeComponent } from '../edit-initiative/edit-initiative.component';
import { Person } from '../../../core/interfaces/person.interface';
import { DataService } from '../../../core/services/data.service';



@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {
  combatants$: Observable<Combatant[]>;
  faPlus = faPlus;
  people: Person[];

  constructor(
    private combatService: CombatService,
    private dataService: DataService,
    private popover: PopoverService,
  ) {
    this.combatants$ = this.combatService.getCombatants();
  }

  ngOnInit(): void {}



  setInitiative(combatant: Combatant) {
    this.popover.showPopover(
      `Ini ${combatant.person.name}`,
      EditInitiativeComponent,
      {
        active: combatant.active,
        combatantId: combatant.id,
        initiative: combatant.initiative
      },
    );
  }
}
