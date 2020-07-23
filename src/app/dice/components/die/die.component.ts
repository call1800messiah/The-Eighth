import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { faDiceD6, faDiceD20 } from '@fortawesome/free-solid-svg-icons';

import { Die } from '../../enums/die.enum';



@Component({
  selector: 'app-die',
  templateUrl: './die.component.html',
  styleUrls: ['./die.component.scss']
})
export class DieComponent implements OnInit {
  @Input() currentNumber: number;
  @Input() type: Die;
  @Output() rolled = new EventEmitter();
  dice = {
    6: faDiceD6,
    20: faDiceD20,
  };

  constructor() { }

  ngOnInit(): void {
  }



  onDieClicked() {
    this.rolled.emit(this.currentNumber);
  }
}
