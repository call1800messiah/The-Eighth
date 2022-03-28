import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { Quest } from '../../models/quest';
import { QuestsService } from '../../services/quests.service';



@Component({
  selector: 'app-quest-summary',
  templateUrl: './quest-summary.component.html',
  styleUrls: ['./quest-summary.component.scss']
})
export class QuestSummaryComponent implements OnInit {
  @Input() quest: Quest;
  @Input() showCompleted = false;
  @Input() showSubQuests = true;
  questTypes = QuestsService.questTypes;

  constructor(
    private router: Router,
  ) { }

  ngOnInit(): void {
  }


  goToQuest() {
    this.router.navigate([`quests/${this.quest.id}`]);
  }
}
