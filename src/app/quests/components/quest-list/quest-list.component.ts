import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
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
  faPlus = faPlus;
  showCompleted: boolean;
  filteredQuests$: Observable<Quest[]>;
  filterText: BehaviorSubject<string>;
  initialFilterText: string;
  quests$: Observable<Quest[]>;

  constructor(
    private questsService: QuestsService,
    private popover: PopoverService,
  ) {
    this.showCompleted = JSON.parse(localStorage.getItem('quests-showCompleted')) || false;
    this.initialFilterText = localStorage.getItem('quests-filter') || '';
    this.filterText = new BehaviorSubject<string>(this.initialFilterText);
    this.filteredQuests$ = combineLatest([
      this.questsService.getQuests(),
      this.filterText,
    ]).pipe(
      map(this.filterQuestsByText)
    );
    this.quests$ = this.questsService.getQuests().pipe(
      map((quests) => quests.filter((quest) => !quest.parent)),
    );
  }

  ngOnInit(): void {
  }



  onFilterChanged(text: string) {
    localStorage.setItem('quests-filter', text);
    this.filterText.next(text);
  }


  onSetShowCompleted() {
    localStorage.setItem('quests-showCompleted', JSON.stringify(this.showCompleted));
  }


  showAddDialog() {
    this.popover.showPopover('Neue Quest', EditQuestComponent);
  }


  private filterQuestsByText(data: [Quest[], string]): Quest[] {
    const [quests, text] = data;
    const lowText = text.trim().toLowerCase();
    return quests.filter((quest) => {
      return text === ''
        || quest.name.toLowerCase().indexOf(lowText) !== -1
        || (quest.type && quest.type.toLowerCase().indexOf(lowText) !== -1)
        || (quest.description && quest.description.toLowerCase().indexOf(lowText) !== -1);
    });
  }
}
