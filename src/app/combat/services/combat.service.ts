import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { Combatant } from '../models/combatant';
import { Person } from '../../people/models/person';
import { ApiService } from '../../core/services/api.service';
import { CombatState } from '../../shared/models/combat-state';
import { PeopleService } from '../../people/services/people.service';



@Injectable({
  providedIn: 'root',
})
export class CombatService {
  readonly combatCollection = 'combat/tKthlBKLy0JuVaPnXWzY/fighters';
  private readonly combatants$: Observable<Combatant[]>;

  constructor(
    private api: ApiService,
    private peopleService: PeopleService,
  ) {
    this.combatants$ = combineLatest([
      this.peopleService.getPeople(),
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
    this.api.addDocumentToCollection(newFighter, this.combatCollection).then((ref) => {
      if (!combatant.hasOwnProperty('id')) {
        this.api.addDocumentToCollection({
          current: 30,
          max: 30,
          type: 'lep',
        }, `${this.combatCollection}/${ref.id}/attributes`);
        this.api.addDocumentToCollection({
          current: 30,
          max: 30,
          type: 'aup',
        }, `${this.combatCollection}/${ref.id}/attributes`);
      }
    });
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


  setStates(combatantId: string, states: CombatState[]) {
    return this.api.updateDocumentInCollection(
      combatantId,
      this.combatCollection,
      {
        states
      }
    );
  }


  private transformCombatants(people: Person[], fighters: any[]): Combatant[] {
    return fighters.reduce((all, data) => {
      const fighterData = data.payload.doc.data();
      const fighter = {
        id: data.payload.doc.id,
        active: fighterData.active,
        attributes: null,
        initiative: fighterData.initiative,
        name: fighterData.name ? fighterData.name : null,
        person: people.find((person) => person.id === fighterData.person),
        states: fighterData.states ? fighterData.states : null,
      };
      if (fighter.person) {
        fighter.attributes = this.peopleService.getPersonValues(fighter.person.id).pipe(
          map((values) => values.attributes),
        );
      } else {
        fighter.attributes = this.peopleService.getPersonValues(fighter.id, this.combatCollection).pipe(
          map((values) => values.attributes),
        );
      }
      all.push(fighter);
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
