import { Component, Input } from '@angular/core';
import { faDizzy, faUserNinja } from '@fortawesome/free-solid-svg-icons';

import type { Combatant } from '../../models/combatant';
import type { AuthUser } from '../../../auth/models/auth-user';
import { environment } from '../../../../environments/environment';
import { EditInitiativeComponent } from '../edit-initiative/edit-initiative.component';
import { PopoverService } from '../../../core/services/popover.service';
import { AuthService } from '../../../core/services/auth.service';
import { CombatantMenuComponent } from '../combatant-menu/combatant-menu.component';
import { EditStatesComponent } from '../edit-states/edit-states.component';
import { CombatService } from '../../services/combat.service';



@Component({
  selector: 'app-combatant',
  templateUrl: './combatant.component.html',
  styleUrls: ['./combatant.component.scss']
})
export class CombatantComponent {
  @Input() combatant: Combatant;
  @Input() showAsList: boolean;
  displayAsBox: boolean;
  faDizzy = faDizzy;
  faUserNinja = faUserNinja;
  private readonly user: AuthUser;

  constructor(
    private auth: AuthService,
    private popover: PopoverService,
  ) {
    this.displayAsBox = environment.tenant === 'tde5';
    this.user = this.auth.user;
  }


  gotoLink(event: MouseEvent, url?: string) {
    if (url) {
      event.stopPropagation();
      window.open(url, '_blank');
    }
  }


  isOwnerOrCan(access: string, owner?: string): boolean {
    return this.user && (this.user.isGM || this.user[access] || this.user.id === owner);
  }


  setInitiative() {
    this.popover.showPopover(
      `Ini ${this.combatant.person ? this.combatant.person.name : this.combatant.name}`,
      EditInitiativeComponent,
      {
        active: this.combatant.active,
        combatantId: this.combatant.id,
        initiative: this.combatant.initiative
      },
    );
  }


  setStates() {
    this.popover.showPopover(
      `Zustände ${this.combatant.person ? this.combatant.person.name : this.combatant.name}`,
      EditStatesComponent,
      this.combatant,
    );
  }



  showMenu() {
    if (!this.combatant.person) {
      this.popover.showPopover(this.combatant.name, CombatantMenuComponent, this.combatant);
    }
  }

  protected readonly CombatService = CombatService;
}
