import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import { QuestsService } from '../../services/quests.service';
import { Quest } from '../../models/quest';
import { PopoverService } from '../../../core/services/popover.service';
import { EditQuestComponent } from '../edit-quest/edit-quest.component';



@Component({
  selector: 'app-quest-list',
  templateUrl: './quest-list.component.html',
  styleUrls: ['./quest-list.component.scss']
})
export class QuestListComponent implements OnInit {
  completedQuests$: Observable<Quest[]>;
  filteredQuests$: Observable<Quest[]>;
  openQuests$: Observable<Quest[]>;
  faPlus = faPlus;
  filterText: BehaviorSubject<string>;

  constructor(
    private questsService: QuestsService,
    private popover: PopoverService,
    private router: Router,
  ) {
    this.filterText = new BehaviorSubject<string>('');
    this.completedQuests$ = this.questsService.getQuests().pipe(
      map((quests) => quests.filter((quest) => quest.completed === true))
    );
    this.filteredQuests$ = combineLatest([
      this.questsService.getQuests(),
      this.filterText,
    ]).pipe(
      map(this.filterQuestsByText)
    );
    this.openQuests$ = this.questsService.getQuests().pipe(
      map((quests) => quests.filter((quest) => quest.completed === false))
    );
  }

  ngOnInit(): void {
  }



  goToQuest(quest: Quest) {
    this.router.navigate([`quests/${quest.id}`]);
  }


  onFilterChanged(text: string) {
    this.filterText.next(text);
  }


  showAddDialog() {
    this.popover.showPopover('Neue Quest', EditQuestComponent);
  }


  private filterQuestsByText(data): Quest[] {
    const [quests, text] = data;
    return quests.filter((quest) => {
      return text === ''
        || quest.name.toLowerCase().indexOf(text.toLowerCase()) !== -1
        || (quest.type && quest.type.toLowerCase().indexOf(text.toLowerCase()) !== -1)
        || (quest.description && quest.description.toLowerCase().indexOf(text.toLowerCase()) !== -1);
    });
  }
}
