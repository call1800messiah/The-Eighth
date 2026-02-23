import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { AttributeRoll, DamageRoll, DiceRoll, Roll, SkillRoll } from '../models/roll';
import type { AuthUser } from '../../auth/models/auth-user';
import type { Rules } from '../../rules';
import { Die } from '../enums/die.enum';
import { RollType } from '../enums/roll-type.enum';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { RulesService } from '../../rules/services/rules.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';


@Injectable({
  providedIn: 'root'
})
export class DiceRollerService {
  static collection = 'rolls';
  private rolls$: Observable<Roll[]>;
  private stats: Record<number, Record<number, number>> = {};
  private user: AuthUser;
  private rules: Rules;

  constructor(
    private auth: AuthService,
    private data: DataService,
    private realtime: RealtimeService,
    private rulesService: RulesService,
  ) {
    this.user = this.auth.user;
    this.rulesService.getRulesConfig().then((rules) => this.rules = rules);
  }


  getRecentRolls(limit: number = 100): Observable<Roll[]> {
    if (!this.rolls$) {
      this.rolls$ = this.realtime.watch<any>(
        'rolls',
        query => query
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit),
        'rolls',
      ).pipe(
        map(DiceRollerService.transformRolls),
      );
    }

    return this.rolls$;
  }



  rollAttributeCheck(attribute: number, modifier: number = 0, name?: string): number {
    const result = this.roll(Die.D20);
    this.storeRoll({
      attribute,
      created_at: new Date().toISOString(),
      modifier,
      name,
      owner_id: this.user.id,
      roll: result,
      type: RollType.Attribute,
    });
    return attribute - (result + modifier);
  }


  rollDamage(amount: number, type: Die, modifier: number = 0): number {
    const results = this.rollDice(amount, type);
    this.storeRoll({
      created_at: new Date().toISOString(),
      dice_type: 'd' + type,
      modifier,
      owner_id: this.user.id,
      dice_rolls: results,
      type: RollType.Damage,
    });
    return results.reduce((total, roll ) => total + roll, 0) + modifier;
  }


  rollDice(amount: number, type: Die, log = true): number[] {
    const results = [];

    for (let i = 0; i < amount; i++) {
      results.push(this.roll(type));
    }

    if(log) {
      this.storeRoll({
        created_at: new Date().toISOString(),
        dice_type: 'd' + type,
        owner_id: this.user.id,
        dice_rolls: results,
        type: RollType.Dice,
      });
    }
    return results;
  }


  rollSkillCheck(
    first: number,
    second: number,
    third: number,
    skill: number,
    modifier: number = 0,
    name?: string,
  ): number {
    const rollResults = this.rollDice(3, Die.D20, false) as [number, number, number];
    const roll: SkillRoll = {
      attributes: [first, second, third],
      created: new Date(),
      isPrivate: false,
      modifier,
      name,
      owner: this.user.id,
      rolls: rollResults,
      skillPoints: skill,
      type: this.rules.edition === 5 ? RollType.Skill5 : RollType.Skill,
    };

    this.storeRoll({
      attributes: [first, second, third],
      created_at: new Date().toISOString(),
      modifier,
      name,
      owner_id: this.user.id,
      rolls: rollResults,
      skill_points: skill,
      type: roll.type,
    });

    switch(roll.type) {
      case RollType.Skill:
        return this.validateSkillCheck(roll);
      case RollType.Skill5:
        return this.validateSkill5Check(roll);
      default:
        return this.validateSkillCheck(roll);
    }
  }


  validateSkillCheck(roll: Partial<SkillRoll>): number {
    const effectiveSkill = roll.skillPoints - roll.modifier;
    let netSkill = effectiveSkill;
    let effectiveAttributes: [number, number, number];

    if (effectiveSkill < 0) {
      effectiveAttributes = [
        roll.attributes[0] + effectiveSkill,
        roll.attributes[1] + effectiveSkill,
        roll.attributes[2] + effectiveSkill
      ];
      if (effectiveAttributes[0] > roll.rolls[0] && effectiveAttributes[1] > roll.rolls[1] && effectiveAttributes[2] > roll.rolls[2]) {
        netSkill = 1;
      } else {
        netSkill = 0;
        for (let i = 0; i < 3; i++) {
          if (roll.rolls[i] > effectiveAttributes[i]) {
            netSkill -= roll.rolls[i] - effectiveAttributes[i];
          }
        }
      }
    } else {
      effectiveAttributes = roll.attributes;
      for (let i = 0; i < 3; i++) {
        if (roll.rolls[i] > effectiveAttributes[i]) {
          netSkill -= roll.rolls[i] - effectiveAttributes[i];
        }
      }
    }

    if (netSkill > roll.skillPoints) {
      netSkill = roll.skillPoints;
    }
    if (netSkill === 0) {
      netSkill = 1;
    }

    return netSkill;
  }


  validateSkill5Check(roll: Partial<SkillRoll>): number {
    const effectiveAttributes = roll.attributes.map((attr) => attr + roll.modifier);
    let netSkill = roll.skillPoints;

    for (let i = 0; i < 3; i++) {
      if (roll.rolls[i] > effectiveAttributes[i]) {
        netSkill -= roll.rolls[i] - effectiveAttributes[i];
      }
    }

    return netSkill;
  }


  private addRollToStats(type: Die, roll: number): void {
    if (!this.stats[type]) {
      this.stats[type] = {};
    }
    if (!this.stats[type][roll]) {
      this.stats[type][roll] = 1;
    } else {
      this.stats[type][roll]++;
    }
  }


  private roll(type: Die): number {
    const roll = Math.ceil(Math.random() * type);
    this.addRollToStats(type, roll);
    return roll;
  }


  private storeRoll(roll: any) {
    this.data.store(roll, DiceRollerService.collection);
  }


  private static transformRolls(rows: any[]): Roll[] {
    return rows.map(row => {
      let roll: Roll | AttributeRoll | DamageRoll | DiceRoll | SkillRoll = {
        created: row.created_at ? new Date(row.created_at) : new Date(),
        isPrivate: false,
        owner: row.owner_id,
        type: row.type,
      };
      switch (row.type) {
        case RollType.Attribute:
          roll = { ...roll, attribute: row.attribute, modifier: row.modifier, name: row.name, roll: row.roll };
          break;
        case RollType.Damage:
          roll = { ...roll, rolls: row.dice_rolls, diceType: Number(String(row.dice_type).replace(/^d/i, '')), modifier: row.modifier };
          break;
        case RollType.Dice:
          roll = { ...roll, diceType: Number(String(row.dice_type).replace(/^d/i, '')), rolls: row.dice_rolls };
          break;
        case RollType.Skill:
        case RollType.Skill5:
          roll = { ...roll, attributes: row.attributes, modifier: row.modifier, name: row.name, rolls: row.rolls, skillPoints: row.skill_points };
          break;
      }
      return roll;
    });
  }
}
