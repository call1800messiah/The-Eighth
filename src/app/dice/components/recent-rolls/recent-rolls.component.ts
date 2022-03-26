import { Component, Input, OnInit } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { DiceRollerService } from '../../services/dice-roller.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user';
import { UtilService } from '../../../core/services/util.service';
import { SkillRoll } from '../../models/roll';
import { AuthService } from '../../../core/services/auth.service';



@Component({
  selector: 'app-recent-rolls',
  templateUrl: './recent-rolls.component.html',
  styleUrls: ['./recent-rolls.component.scss']
})
export class RecentRollsComponent implements OnInit {
  @Input() amount = 100;
  rolls$: Observable<any>;
  userId: string;

  constructor(
    private auth: AuthService,
    private dice: DiceRollerService,
    private userService: UserService,
  ) {
    this.userId = this.auth.user.id;
  }

  ngOnInit(): void {
    this.rolls$ = combineLatest([
      this.dice.getRecentRolls(this.amount),
      this.userService.getUsers(),
    ]).pipe(
      map(this.transformRolls),
    );
  }



  total(rolls: number[], modifier: number = 0) {
    return rolls.reduce((total, roll) => total += roll, 0) + modifier;
  }


  validateSkillCheck(roll: SkillRoll): number {
    return this.dice.validateSkillCheck(roll);
  }


  getSkillCheckResultType(roll): number {
    const special = roll.rolls.reduce((count, r) => {
      if (r === 1) {
        count[0]++;
      }
      if (r === 20) {
        count[1]++;
      }
      return count;
    }, [0, 0]);
    return special[0] >= 2 ? 1 : (special[1] >= 2 ? -1 : 0);
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
