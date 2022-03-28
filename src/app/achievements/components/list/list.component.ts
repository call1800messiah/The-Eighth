import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { faPlus } from '@fortawesome/free-solid-svg-icons';


import { Achievement } from 'src/app/achievements/models/achievement';
import { AchievementService } from '../../services/achievement.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditAchievementComponent } from '../edit-achievement/edit-achievement.component';
import { User } from '../../../core/models/user';
import { UserService } from '../../../core/services/user.service';



@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  filteredAchievements$: Observable<Achievement[]>;
  faPlus = faPlus;
  filterText: BehaviorSubject<string>;
  user$: Observable<User>;

  constructor(
    private achievementService: AchievementService,
    private userService: UserService,
    private popover: PopoverService,
  ) {
    this.user$ = this.userService.getCurrentUser();
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
