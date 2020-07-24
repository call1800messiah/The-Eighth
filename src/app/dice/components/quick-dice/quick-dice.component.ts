import { Component, Input, OnInit } from '@angular/core';

import { DiceRollerService } from '../../services/dice-roller.service';
import { Die } from '../../enums/die.enum';



@Component({
  selector: 'app-quick-dice',
  templateUrl: './quick-dice.component.html',
  styleUrls: ['./quick-dice.component.scss']
})
export class QuickDiceComponent implements OnInit {
  @Input() amount: number;
  @Input() type: Die;
  rolls = [];
  total = 0;

  constructor(
    private diceRoller: DiceRollerService,
  ) { }

  ngOnInit(): void {
    for (let i = 0; i < this.amount; i++) {
      this.rolls.push(0);
    }
  }



  onDiceRolled(index) {
    const result = this.diceRoller.rollMany(index + 1, this.type);
    this.total = 0;

    this.rolls = this.rolls.reduce((all: number[], entry: number, i: number) => {
      const roll = result[i] ? result[i] : 0;
      this.total += roll;
      all.push(roll);
      return all;
    }, []);
  }
}
