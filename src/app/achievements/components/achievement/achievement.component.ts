import { Component, OnInit, Input } from '@angular/core';
import { faTrophy, faUnlock } from '@fortawesome/free-solid-svg-icons';

import { Achievement } from 'src/app/core/models/achievements.model';




@Component({
  selector: 'app-achievement',
  templateUrl: './achievement.component.html',
  styleUrls: ['./achievement.component.scss']
})
export class AchievementComponent implements OnInit {
  @Input() achievement: Achievement;
  faTrophy = faTrophy;
  faUnlock = faUnlock;

  constructor() {}

  ngOnInit(): void {}
}
