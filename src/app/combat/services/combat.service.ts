import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { Combatant } from '../../core/interfaces/combatant.interface';
import { DataService } from '../../core/services/data.service';
import { Person } from '../../core/interfaces/person.interface';
import { ApiService } from '../../core/services/api.service';



@Injectable({
  providedIn: 'root',
})
export class CombatService {
  private readonly combatants$: Observable<Combatant[]>;
  private readonly combatCollection = 'combat/tKthlBKLy0JuVaPnXWzY/fighters';

  constructor(
    private api: ApiService,
    private dataService: DataService,
  ) {
    this.combatants$ = combineLatest([
      this.dataService.getPeople(),
      this.api.getDataFromCollection(this.combatCollection),
    ]).pipe(
      map(([people, fighters]) => this.transformCombatants(people, fighters)),
    );
  }



  addCombatant(combatant: Person | string) {
    let newFighter;
    if (combatant.hasOwnProperty('id')) {
      newFighter = { active: true, initiative: 0, person: (combatant as Person).id };
    } else {
      newFighter = { active: true, initiative: 0, name: combatant };
    }
    this.api.addDocumentToCollection(newFighter, this.combatCollection);
  }


  getCombatants(): Observable<Combatant[]> {
    return this.combatants$;
  }


  getIdsOfPeopleInFight(): Observable<string[]> {
    return this.combatants$.pipe(
      map((fighters) => this.transformPeopleFighting(fighters)),
    );
  }


  removeCombatant(id: string) {
    this.api.deleteDocumentFromCollection(id, this.combatCollection);
  }


  removeCombatantByPersonId(id: string) {
    this.combatants$.pipe(
      take(1),
      map((combatants) => {
        return combatants.find((fighter) => fighter.person && fighter.person.id === id);
      }),
    ).subscribe((fighter) => {
      this.removeCombatant(fighter.id);
    });
  }


  setInitiative(combatantId: string, initiative: number, active: boolean) {
    return this.api.updateDocumentInCollection(
      combatantId,
      this.combatCollection,
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
      if (a.active && !b.active) {
        return -1;
      }
      if (!a.active && b.active) {
        return 1;
      }
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