import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, from, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

import type { Combatant } from '../models/combatant';
import type { Enemy } from '../models/enemy';
import type { Person } from '../../people/models/person';
import { ApiService } from '../../core/services/api.service';
import { CombatState } from '../../shared/models/combat-state';
import { PeopleService } from '../../people/services/people.service';
import { RulesService } from '../../core/services/rules.service';
import { Rules } from '../../shared/models/rules';
import { DataService } from '../../core/services/data.service';



@Injectable({
  providedIn: 'root',
})
export class CombatService {
  readonly combatCollection = 'combat/tKthlBKLy0JuVaPnXWzY/fighters';
  static enemiesCollection = 'enemies';
  private readonly combatants$: Observable<Combatant[]>;
  private enemies$: BehaviorSubject<Enemy[]>;
  private rules: Rules;

  constructor(
    private api: ApiService,
    private data: DataService,
    private peopleService: PeopleService,
    private rulesService: RulesService,
  ) {
    this.combatants$ = combineLatest([
      this.peopleService.getPeople(),
      this.api.getDataFromCollection(this.combatCollection),
    ]).pipe(
      map(([people, fighters]) => this.transformCombatants(people, fighters)),
    );
    this.rulesService.getRules().then((rules) => this.rules = rules);
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
      if (this.rules?.barTypes?.includes('lep')) {
        newFighter.attributes.push({ type: 'lep', current: 30, max: 30 });
      }
    }
    this.api.addDocumentToCollection(newFighter, this.combatCollection).then();
  }


  addEnemyAsCombatant(enemy: Enemy) {
    const newFighter = {
      active: true,
      initiative: 0,
      name: enemy.name,
      attributes: [],
      enemy: enemy.id,
    };
    if (this.rules?.barTypes?.includes('lep') && enemy.stats.lep) {
      newFighter.attributes.push({ type: 'lep', current: enemy.stats.lep, max: enemy.stats.lep });
    }
    this.api.addDocumentToCollection(newFighter, this.combatCollection).then();
  }


  getCombatants(): Observable<Combatant[]> {
    return this.combatants$;
  }


  getEnemies(): Observable<Enemy[]> {
    if (!this.enemies$) {
      this.enemies$ = new BehaviorSubject<Enemy[]>([]);
      this.api.getDataFromCollection(CombatService.enemiesCollection).pipe(
        map(this.transformEnemies),
      ).subscribe((enemies) => {
        this.enemies$.next(enemies);
      });
    }
    return this.enemies$;
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


  store(combatant: Combatant, combatantId: string) {
    return this.data.store(combatant, this.combatCollection, combatantId);
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
        fighter.attributes = this.peopleService.getPersonValues(fighter.person.id).pipe(
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


  private transformEnemies(enemies: any[]): Enemy[] {
    return enemies.reduce((all, data) => {
      const enemyData = data.payload.doc.data();
      all.push({
        attacks: enemyData.attacks,
        id: data.payload.doc.id,
        name: enemyData.name,
        stats: enemyData.stats,
      });
      return all;
    }, []);
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
