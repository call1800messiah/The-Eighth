import { Injectable } from '@angular/core';
import { combineLatest, from, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

import type { Combatant } from '../models/combatant';
import type { Person } from '../../people';
import type { Attribute, CombatState } from '../../shared';
import type { Rules } from '../../rules';
import { ApiService } from '../../core/services/api.service';
import { PeopleService } from '../../people/services/people.service';
import { RulesService } from '../../rules/services/rules.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';



@Injectable({
  providedIn: 'root',
})
export class CombatService {
  static readonly collection = 'combatants';
  static readonly combatCollection = 'combatants';
  private combatants$: Observable<Combatant[]>;
  private activeSessionId: string;
  private rules: Rules;

  constructor(
    private api: ApiService,
    private peopleService: PeopleService,
    private realtime: RealtimeService,
    private rulesService: RulesService,
  ) {
    this.rulesService.getRulesConfig().then((rules) => this.rules = rules);
  }



  async addCombatant(combatant: Person | string) {
    const sessionId = await this.getActiveSessionId();
    if (!sessionId) return;

    if (typeof combatant !== 'string' && combatant.id) {
      const { data, error } = await this.api.from('combatants' as any)
        .insert({
          combat_session_id: sessionId,
          person_id: combatant.id,
          active: true,
          initiative: 0,
        })
        .select('id')
        .single() as { data: any; error: any };

      if (!error && combatant.attributes) {
        // Copy person attributes as combatant attributes
        for (const attr of combatant.attributes) {
          await this.api.from('combatant_attributes' as any).insert({
            combatant_id: data.id,
            type: attr.type,
            current: attr.current,
            max: attr.max,
          });
        }
      }
    } else {
      const name = typeof combatant === 'string' ? combatant : (combatant as any).name;
      const { data, error } = await this.api.from('combatants' as any)
        .insert({
          combat_session_id: sessionId,
          name,
          active: true,
          initiative: 0,
        })
        .select('id')
        .single() as { data: any; error: any };

      if (!error && this.rules?.allowedAttributes?.find((att) => att.shortCode === 'lep')) {
        await this.api.from('combatant_attributes' as any).insert({
          combatant_id: data.id,
          type: 'lep',
          current: 30,
          max: 30,
        });
      }
    }
  }


  getCombatants(): Observable<Combatant[]> {
    if (!this.combatants$) {
      this.combatants$ = combineLatest([
        this.peopleService.getPeople(),
        this.realtime.watch<any>(
          'combatants',
          query => query.select('*, combatant_attributes(*), combatant_states(*)'),
          'combatants',
          ['combatant_attributes', 'combatant_states'],
        ),
      ]).pipe(
        map(([people, fighters]) => this.transformCombatants(people, fighters)),
      );
    }
    return this.combatants$;
  }


  getIdsOfPeopleInFight(): Observable<string[]> {
    return this.getCombatants().pipe(
      map((fighters) => this.transformPeopleFighting(fighters)),
    );
  }


  async removeCombatant(id: string) {
    await this.api.from('combatants' as any)
      .delete()
      .eq('id', id);
  }


  removeCombatantByPersonId(id: string) {
    this.getCombatants().pipe(
      take(1),
      map((combatants) => {
        return combatants.find((fighter) => fighter.person && fighter.person.id === id);
      }),
    ).subscribe((fighter) => {
      if (fighter) {
        this.removeCombatant(fighter.id);
      }
    });
  }


  async setInitiative(combatantId: string, initiative: number, active: boolean) {
    await this.api.from('combatants' as any)
      .update({ active, initiative })
      .eq('id', combatantId);
  }


  async setStates(combatantId: string, states: CombatState[]) {
    // Delete existing states
    await this.api.from('combatant_states' as any)
      .delete()
      .eq('combatant_id', combatantId);

    // Insert new states
    if (states && states.length > 0) {
      const rows = states.map(s => ({
        combatant_id: combatantId,
        state: s.name,
      }));
      await this.api.from('combatant_states' as any).insert(rows);
    }
  }


  async updateCombatantAttribute(combatantId: string, attribute: Attribute): Promise<boolean> {
    const { error } = await this.api.from('combatant_attributes' as any)
      .upsert({
        combatant_id: combatantId,
        type: attribute.type,
        current: attribute.current,
        max: attribute.max,
      }, { onConflict: 'combatant_id,type' });
    return !error;
  }


  async store(combatant: Partial<Combatant>, combatantId: string) {
    const update: any = {};
    if (combatant.active !== undefined) update.active = combatant.active;
    if (combatant.initiative !== undefined) update.initiative = combatant.initiative;
    if (combatant.name !== undefined) update.name = combatant.name;

    await this.api.from('combatants' as any)
      .update(update)
      .eq('id', combatantId);
  }


  private async getActiveSessionId(): Promise<string | null> {
    if (this.activeSessionId) return this.activeSessionId;

    const { data, error } = await this.api.from('combat_sessions' as any)
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single() as { data: any; error: any };

    if (error || !data) {
      // Create a new session
      const { data: newSession, error: createError } = await this.api.from('combat_sessions' as any)
        .insert({ name: 'Combat', is_active: true })
        .select('id')
        .single() as { data: any; error: any };
      if (createError) return null;
      this.activeSessionId = newSession.id;
    } else {
      this.activeSessionId = data.id;
    }
    return this.activeSessionId;
  }


  private transformCombatants(people: Person[], fighters: any[]): Combatant[] {
    return fighters.map(row => {
      const person = row.person_id ? people.find((p) => p.id === row.person_id) : undefined;
      const attrs = (row.combatant_attributes || []).map((a: any) => ({
        type: a.type,
        current: a.current,
        max: a.max,
      }));
      const states = (row.combatant_states || []).map((s: any) => ({
        name: s.state,
        modifiers: [],
      }));

      return {
        id: row.id,
        active: row.active,
        attributes: from([person?.attributes || attrs]),
        initiative: row.initiative,
        name: row.name || null,
        person: person || undefined,
        states: states.length > 0 ? states : null,
      };
    }).sort((a, b) => {
      if (a.active && !b.active) return -1;
      if (!a.active && b.active) return 1;
      if (a.initiative > b.initiative) return -1;
      if (a.initiative < b.initiative) return 1;
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
