import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { faPlus } from '@fortawesome/free-solid-svg-icons';


import type { Achievement } from 'src/app/achievements/models/achievement';
import type { AuthUser } from '../../../auth/models/auth-user';
import { AchievementService } from '../../services/achievement.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditAchievementComponent } from '../edit-achievement/edit-achievement.component';
import { AuthService } from '../../../core/services/auth.service';



@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  filteredAchievements$: Observable<Achievement[]>;
  faPlus = faPlus;
  filterText: BehaviorSubject<string>;
  user: AuthUser;

  constructor(
    private achievementService: AchievementService,
    private auth: AuthService,
    private popover: PopoverService,
  ) {
    this.user = this.auth.user;
    this.filterText = new BehaviorSubject<string>('');
    this.filteredAchievements$ = combineLatest([
      this.achievementService.getAchievements(),
      this.filterText,
    ]).pipe(
      map(this.filterAchievements)
    );
  }

  ngOnInit(): void {
  }


  onFilterChanged(text: string) {
    this.filterText.next(text);
  }


  showAddDialog() {
    this.popover.showPopover('Neues Achievement', EditAchievementComponent);
  }


  private filterAchievements(data): Achievement[] {
    const [achievements, text] = data;
    return achievements.filter((achievement: Achievement) => {
      return text === ''
        || achievement.name.toLowerCase().indexOf(text.toLowerCase()) !== -1
        || achievement.description.toLowerCase().indexOf(text.toLowerCase()) !== -1;
    });
  }
}
