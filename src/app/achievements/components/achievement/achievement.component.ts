import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { faTrophy, faUnlock } from '@fortawesome/free-solid-svg-icons';

import { Achievement } from 'src/app/achievements/models/achievement';
import { EditAchievementComponent } from '../edit-achievement/edit-achievement.component';
import { PopoverService } from '../../../core/services/popover.service';
import { AuthUser } from '../../../auth/models/auth-user';
import { AuthService } from '../../../core/services/auth.service';




@Component({
  selector: 'app-achievement',
  templateUrl: './achievement.component.html',
  styleUrls: ['./achievement.component.scss']
})
export class AchievementComponent implements OnInit, OnDestroy {
  @Input() achievement: Achievement;
  faTrophy = faTrophy;
  faUnlock = faUnlock;
  private readonly user: AuthUser;
  private subscription = new Subscription();

  constructor(
    private auth: AuthService,
    private popover: PopoverService,
  ) {
    this.user = this.auth.user;
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
