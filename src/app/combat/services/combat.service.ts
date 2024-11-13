import { Injectable } from '@angular/core';
import { combineLatest, from, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

import type { Combatant } from '../models/combatant';
import type { Person } from '../../people';
import type { CombatState } from '../../shared';
import type { Rules } from '../../rules';
import { ApiService } from '../../core/services/api.service';
import { PeopleService } from '../../people/services/people.service';
import { RulesService } from '../../rules/services/rules.service';
import { DataService } from '../../core/services/data.service';



@Injectable({
  providedIn: 'root',
})
export class CombatService {
  static readonly combatCollection = 'combat/tKthlBKLy0JuVaPnXWzY/fighters';
  private readonly combatants$: Observable<Combatant[]>;
  private rules: Rules;

  constructor(
    private api: ApiService,
    private data: DataService,
    private peopleService: PeopleService,
    private rulesService: RulesService,
  ) {
    this.combatants$ = combineLatest([
      this.peopleService.getPeople(),
      this.api.getDataFromCollection(CombatService.combatCollection),
    ]).pipe(
      map(([people, fighters]) => this.transformCombatants(people, fighters)),
    );
    this.rulesService.getRulesConfig().then((rules) => this.rules = rules);
  }



  addCombatant(combatant: Person | string) {
    let newFighter;
    if (combatant.hasOwnProperty('id')) {
      newFighter = { active: true, initiative: 0, person: (combatant as Person).id };
    } else {
      newFighter = {
        active: true,
        initiative: 0,
        name: combatant,
        attributes: []
      };
      if (this.rules?.allowedAttributes?.find((att) => att.shortCode === 'lep')) {
        newFighter.attributes.push({ type: 'lep', current: 30, max: 30 });
      }
    }
    this.api.addDocumentToCollection(newFighter, CombatService.combatCollection).then();
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
    this.api.deleteDocumentFromCollection(id, CombatService.combatCollection);
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
      CombatService.combatCollection,
      {
        active,
        initiative,
      }
    );
  }


  setStates(combatantId: string, states: CombatState[]) {
    return this.api.updateDocumentInCollection(
      combatantId,
      CombatService.combatCollection,
      {
        states
      }
    );
  }


  store(combatant: Combatant, combatantId: string) {
    return this.data.store(combatant, CombatService.combatCollection, combatantId);
  }


  private transformCombatants(people: Person[], fighters: any[]): Combatant[] {
    return fighters.reduce((all, data) => {
      const fighterData = data.payload.doc.data();
      const fighter = {
        id: data.payload.doc.id,
        active: fighterData.active,
        attributes: from([fighterData.attributes || []]),
        initiative: fighterData.initiative,
        name: fighterData.name ? fighterData.name : null,
        person: people.find((person) => person.id === fighterData.person),
        states: fighterData.states ? fighterData.states : null,
      };
      if (fighter.person) {
        fighter.attributes = from([fighter.person.attributes || []]);
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
