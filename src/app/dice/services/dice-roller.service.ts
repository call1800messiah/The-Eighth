import { Injectable } from '@angular/core';
import { Die } from '../enums/die.enum';

@Injectable({
  providedIn: 'root'
})
export class DiceRollerService {
  private stats = {};

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


  private addRollToStats(type: Die, roll: number) {
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
