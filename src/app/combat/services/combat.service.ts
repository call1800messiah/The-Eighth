import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Combatant } from '../../core/interfaces/combatant.interface';
import { DataService } from '../../core/services/data.service';
import { Person } from '../../core/interfaces/person.interface';
import { ApiService } from '../../core/services/api.service';



@Injectable({
  providedIn: 'root',
})
export class CombatService {
  private readonly combatants$: Observable<Combatant[]>;

  constructor(
    private api: ApiService,
    private dataService: DataService,
  ) {
    this.combatants$ = combineLatest([
      this.dataService.getPeople(),
      this.api.getDataFromCollection('combat/tKthlBKLy0JuVaPnXWzY/fighters')
    ]).pipe(
      map(([people, fighters]) => this.transformCombatants(people, fighters)),
    );
  }



  addCombatant(combatant: Combatant) {
    // TODO
  }


  getCombatants(): Observable<Combatant[]> {
    return this.combatants$;
  }


  getIdsOfPeopleInFight(): Observable<string[]> {
    return this.combatants$.pipe(
      map((fighters) => this.transformPeopleFighting(fighters)),
    );
  }


  setInitiative(combatantId: string, initiative: number, active: boolean) {
    return this.api.updateDocumentInCollection(
      combatantId,
      'combat/tKthlBKLy0JuVaPnXWzY/fighters',
      {
        active,
        initiative,
      }
    );
  }


  private transformCombatants(people: Person[], fighters: any[]): Combatant[] {
    return fighters.reduce((all, data) => {
      const fighter = data.payload.doc.data();
      all.push({
        id: data.payload.doc.id,
        active: fighter.active,
        initiative: fighter.initiative,
        name: fighter.name ? fighter.name : null,
        person: people.find((person) => person.id === fighter.person),
      });
      return all;
    }, []).sort((a, b) => {
      if (a.initiative > b.initiative) {
        return -1;
      }
      if (a.initiative < b.initiative) {
        return 1;
      }
      return 0;
    });
  }


  private transformPeopleFighting(fighters: Combatant[]): string[] {
    return fighters.reduce((all: string[], fighter) => {
      if (fighter.person) {
        all.push(fighter.person.id);
      }
      return all;
    }, []);
  }
}
