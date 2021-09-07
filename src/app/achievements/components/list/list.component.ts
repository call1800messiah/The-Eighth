import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { Achievement } from 'src/app/achievements/models/achievement';
import { AchievementService } from '../../services/achievement.service';



@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  achievements$: Observable<Achievement[]>;

  constructor(
    private achievementService: AchievementService,
  ) {
    this.achievements$ = this.achievementService.getAchievements();
  }

  ngOnInit(): void {
  }

}
