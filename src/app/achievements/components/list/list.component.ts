import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { faPlus } from '@fortawesome/free-solid-svg-icons';


import type { Achievement } from '../../models/achievement';
import type { AuthUser } from '../../../auth/models/auth-user';
import { AchievementService } from '../../services/achievement.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditAchievementComponent } from '../edit-achievement/edit-achievement.component';
import { AuthService } from '../../../core/services/auth.service';



@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class ListComponent implements OnInit {
  private achievementService = inject(AchievementService);
  private auth = inject(AuthService);
  private popover = inject(PopoverService);

  filteredAchievements$: Observable<Achievement[]>;
  faPlus = faPlus;
  filterText: BehaviorSubject<string>;
  initialFilterText: string;
  user: AuthUser;

  constructor() {
    this.user = this.auth.user;
    this.initialFilterText = localStorage.getItem('achievements-filter') || '';
    this.filterText = new BehaviorSubject<string>(this.initialFilterText);
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
    localStorage.setItem('achievements-filter', text);
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
