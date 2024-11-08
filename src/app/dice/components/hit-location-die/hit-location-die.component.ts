import { Component, OnInit } from '@angular/core';
import { faMale } from '@fortawesome/free-solid-svg-icons';
import { DiceRollerService } from '../../services/dice-roller.service';
import { RulesService } from '../../../shared/services/rules.service';
import { Die } from '../../enums/die.enum';

@Component({
  selector: 'app-hit-location-die',
  templateUrl: './hit-location-die.component.html',
  styleUrls: ['./hit-location-die.component.scss']
})
export class HitLocationDieComponent implements OnInit {
  faMale = faMale;
  currentNumber: number;
  hit = '';
  locations: Record<string, string>;

  constructor(
    private dice: DiceRollerService,
    private rulesService: RulesService,
  ) {
    this.rulesService.getRules().then((rules) => {
      this.locations = rules.hitLocations;
    });
  }

  ngOnInit(): void {
  }

  rollHitLocationDie() {
    this.currentNumber = this.dice.rollDice(1, Die.D20)[0];
    this.hit = this.locations[this.currentNumber];
  }
}
