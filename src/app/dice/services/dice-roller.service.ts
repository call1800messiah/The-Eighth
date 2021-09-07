import { Injectable } from '@angular/core';
import { Die } from '../enums/die.enum';

@Injectable({
  providedIn: 'root'
})
export class DiceRollerService {
  private stats: Record<number, Record<number, number>> = {};

  constructor() { }



  roll(type: Die): number {
    const roll = Math.ceil(Math.random() * type);
    this.addRollToStats(type, roll);
    return roll;
  }


  rollMany(amount: number, type: Die): number[] {
    const result = [];

    for (let i = 0; i < amount; i++) {
      result.push(this.roll(type));
    }

    return result;
  }


  rollSkillCheck(
    first: number,
    second: number,
    third: number,
    skill: number,
    modifier: number,
  ): number {
    console.log('Skill check', first, second, third, skill, modifier);
    const results = this.rollMany(3, Die.D20);
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
}
