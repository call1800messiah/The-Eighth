import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Die } from '../enums/die.enum';
import { AttributeRoll, DamageRoll, DiceRoll, Roll, SkillRoll } from '../models/roll';
import { ApiService } from '../../core/services/api.service';
import { AuthUser } from '../../auth/models/auth-user';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { RollType } from '../enums/roll-type.enum';


@Injectable({
  providedIn: 'root'
})
export class DiceRollerService {
  static collection = 'rolls';
  private rolls$: Observable<Roll[]>;
  private stats: Record<number, Record<number, number>> = {};
  private user: AuthUser;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private data: DataService,
  ) {
    this.user = this.auth.user;
  }


  getRecentRolls(limit: number = 100): Observable<Roll[]> {
    if (!this.rolls$) {
      this.rolls$ = this.api.getDataFromCollection(
        DiceRollerService.collection,
        (ref) => ref
          .where('access', 'array-contains', this.user.id)
          .limit(limit)
      );
    }

    return this.rolls$;
  }



  rollAttributeCheck(attribute: number, modifier: number = 0): number {
    const result = this.roll(Die.D20);
    this.store({
      attribute,
      created: new Date(),
      isPrivate: false,
      modifier,
      owner: this.user.id,
      roll: result,
      type: RollType.Attribute,
    });
    return attribute - (result + modifier);
  }


  rollDamage(amount: number, type: Die, modifier: number = 0): number {
    const results = this.rollDice(amount, type);
    this.store({
      created: new Date(),
      diceType: type,
      isPrivate: false,
      modifier,
      owner: this.user.id,
      rolls: results,
      type: RollType.Damage,
    });
    return results.reduce((total, roll ) => total += roll, 0) + modifier;
  }


  rollDice(amount: number, type: Die): number[] {
    const results = [];

    for (let i = 0; i < amount; i++) {
      results.push(this.roll(type));
    }

    this.store({
      created: new Date(),
      diceType: type,
      isPrivate: false,
      owner: this.user.id,
      rolls: results,
      type: RollType.Dice,
    });
    return results;
  }


  rollSkillCheck(
    first: number,
    second: number,
    third: number,
    skill: number,
    modifier: number = 0,
  ): number {
    console.log('Skill check', first, second, third, skill, modifier);
    const results = this.rollDice(3, Die.D20);
    console.log('Rolls', ...results);
    const effectiveSkill = skill - modifier;
    let netSkill = effectiveSkill;
    let attributes;

    if (effectiveSkill < 0) {
      attributes = [first + effectiveSkill, second + effectiveSkill, third + effectiveSkill];
      if (attributes[0] > results[0] && attributes[1] > results[1] && attributes[2] > results[2]) {
        netSkill = 1;
      }
    } else {
      attributes = [first, second, third];
      for (let i = 0; i < 3; i++) {
        if (results[i] > attributes[i]) {
          netSkill -= results[i] - attributes[i];
        }
      }
    }

    if (netSkill > skill) {
      netSkill = skill;
    }
    if (netSkill === 0) {
      netSkill = 1;
    }
    console.log('Remaining', netSkill);

    this.store({
      attributes: [first, second, third],
      created: new Date(),
      isPrivate: false,
      modifier,
      owner: this.user.id,
      rolls: results,
      skillPoints: skill,
      type: RollType.Skill,
    });
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
    console.log(roll);
    return roll;
  }


  private store(roll: AttributeRoll | DamageRoll | DiceRoll | SkillRoll) {
    this.data.store(roll, DiceRollerService.collection);
  }
}
