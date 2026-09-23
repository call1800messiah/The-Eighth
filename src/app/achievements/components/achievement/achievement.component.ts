import { Component, OnInit, Input, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { faTrophy, faUnlock } from '@fortawesome/free-solid-svg-icons';

import type { Achievement } from '../../models/achievement';
import type { AuthUser } from '../../../auth/models/auth-user';
import { EditAchievementComponent } from '../edit-achievement/edit-achievement.component';
import { PopoverService } from '../../../core/services/popover.service';
import { AuthService } from '../../../core/services/auth.service';




@Component({
  selector: 'app-achievement',
  templateUrl: './achievement.component.html',
  styleUrls: ['./achievement.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class AchievementComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private popover = inject(PopoverService);

  @Input() achievement: Achievement;
  faTrophy = faTrophy;
  faUnlock = faUnlock;
  private readonly user: AuthUser;
  private subscription = new Subscription();

  constructor() {
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
