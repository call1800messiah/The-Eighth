import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { faTrophy, faUnlock } from '@fortawesome/free-solid-svg-icons';

import { Achievement } from 'src/app/achievements/models/achievement';
import { EditAchievementComponent } from '../edit-achievement/edit-achievement.component';
import { PopoverService } from '../../../core/services/popover.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user';




@Component({
  selector: 'app-achievement',
  templateUrl: './achievement.component.html',
  styleUrls: ['./achievement.component.scss']
})
export class AchievementComponent implements OnInit, OnDestroy {
  @Input() achievement: Achievement;
  faTrophy = faTrophy;
  faUnlock = faUnlock;
  private user: User;
  private subscription = new Subscription();

  constructor(
    private popover: PopoverService,
    private userService: UserService,
  ) {
    this.subscription.add(
      this.userService.getCurrentUser().subscribe((user) => {
        this.user = user;
      }),
    );
  }

  ngOnInit(): void {}


  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }


  showEditDialog() {
    if (this.user && this.user.isGM) {
      this.popover.showPopover(this.achievement.name, EditAchievementComponent, this.achievement);
    }
  }
}
