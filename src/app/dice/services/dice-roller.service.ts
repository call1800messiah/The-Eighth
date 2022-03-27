import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
      ).pipe(
        map(this.transformRolls),
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
    const roll: SkillRoll = {
      attributes: [first, second, third],
      created: new Date(),
      isPrivate: false,
      modifier,
      owner: this.user.id,
      rolls: this.rollDice(3, Die.D20) as [number, number, number],
      skillPoints: skill,
      type: RollType.Skill,
    };
    this.store(roll);
    return this.validateSkillCheck(roll);
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


  private store(roll: AttributeRoll | DamageRoll | DiceRoll | SkillRoll) {
    this.data.store(roll, DiceRollerService.collection);
  }


  private transformRolls(data): Roll[] {
    return data.reduce((all, entry) => {
      const rollData = entry.payload.doc.data();
      let roll: Roll | AttributeRoll | DamageRoll | DiceRoll | SkillRoll = {
        created: new Date(rollData.created.seconds * 1000),
        isPrivate: rollData.isPrivate,
        owner: rollData.owner,
        type: rollData.type,
      };
      switch (rollData.type) {
        case RollType.Attribute:
          roll = {
            ...roll,
            attribute: rollData.attribute,
            modifier: rollData.modifier,
            name: rollData.name,
            roll: rollData.roll,
          };
          break;
        case RollType.Damage:
          roll = {
            ...roll,
            rolls: rollData.rolls,
            diceType: rollData.diceType,
            modifier: rollData.modifier,
          };
          break;
        case RollType.Dice:
          roll = {
            ...roll,
            diceType: rollData.diceType,
            rolls: rollData.rolls,
          };
          break;
        case RollType.Skill:
          roll = {
            ...roll,
            attributes: rollData.attributes,
            modifier: rollData.modifier,
            name: rollData.name,
            rolls: rollData.rolls,
            skillPoints: rollData.skillPoints,
          };
          break;
        default:
          break;
      }
      all.push(roll);
      return all;
    }, []);
  }
}
