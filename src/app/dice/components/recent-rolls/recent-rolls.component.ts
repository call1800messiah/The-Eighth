import { Component, Input, OnInit } from '@angular/core';
import { DiceRollerService } from '../../services/dice-roller.service';
import { UserService } from '../../../core/services/user.service';
import { combineLatest, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { User } from '../../../core/models/user';
import { UtilService } from '../../../core/services/util.service';

@Component({
  selector: 'app-recent-rolls',
  templateUrl: './recent-rolls.component.html',
  styleUrls: ['./recent-rolls.component.scss']
})
export class RecentRollsComponent implements OnInit {
  @Input() amount = 100;
  rolls$: Observable<any>;

  constructor(
    private dice: DiceRollerService,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    this.rolls$ = combineLatest([
      this.dice.getRecentRolls(this.amount),
      this.userService.getUsers(),
    ]).pipe(
      map(this.transformRolls),
      tap((rolls) => { console.log(rolls); })
    );
  }


  private transformRolls(data: any[]): any[] {
    const [rolls, users] = data;
    return rolls.map((roll) => {
      const userData = users.find((user: User) => user.id === roll.owner);

      return {
        ...roll,
        user: userData ? userData.name : 'Irgendwer',
      };
    }).sort(UtilService.orderByCreated);
  }
}
