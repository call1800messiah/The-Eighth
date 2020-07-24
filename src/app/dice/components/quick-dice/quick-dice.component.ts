import { Component, OnInit } from '@angular/core';

import { DiceRollerService } from '../../services/dice-roller.service';
import { Die } from '../../enums/die.enum';



@Component({
  selector: 'app-quick-dice',
  templateUrl: './quick-dice.component.html',
  styleUrls: ['./quick-dice.component.scss']
})
export class QuickDiceComponent implements OnInit {
  d6 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  d20 = [0, 0, 0];
  d6Total = 0;
  d20Total = 0;

  constructor(
    private diceRoller: DiceRollerService,
  ) { }

  ngOnInit(): void {
  }

  onD6Rolled(index) {
    const result = this.diceRoller.rollMany(index + 1, Die.D6);
    this.d6Total = 0;

    this.d6 = this.d6.reduce((all: number[], entry: number, i: number) => {
      const roll = result[i] ? result[i] : 0;
      this.d6Total += roll;
      all.push(roll);
      return all;
    }, []);
  }

  onD20Rolled(index) {
    const result = this.diceRoller.rollMany(index + 1, Die.D20);
    this.d20Total = 0;

    this.d20 = this.d20.reduce((all: number[], entry: number, i: number) => {
      const roll = result[i] ? result[i] : 0;
      this.d20Total += roll;
      all.push(roll);
      return all;
    }, []);
  }
}
