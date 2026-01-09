import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { Observable, of, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import type { Quest } from '../../models/quest';
import type { Info } from '../../../shared/models/info';
import type { Menu } from '../../../shared/models/menu';
import { InfoType } from '../../../core/enums/info-type.enum';
import { DataService } from '../../../core/services/data.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditInfoComponent } from '../../../shared/components/edit-info/edit-info.component';
import { QuestsService } from '../../services/quests.service';
import { EditQuestComponent } from '../edit-quest/edit-quest.component';
import { EditAccessComponent } from '../../../shared/components/edit-access/edit-access.component';



@Component({
  selector: 'app-quest',
  templateUrl: './quest.component.html',
  styleUrls: ['./quest.component.scss']
})
export class QuestComponent implements OnInit, OnDestroy {
  @Input() entityId?: string; // Optional input for embedded usage
  faBars = faBars;
  infos$: Observable<Map<InfoType, Info[]>>;
  menu: Menu = {
    actions: [
      {
        label: 'Daten ändern',
        action: this.editQuest.bind(this),
        restricted: true,
      },
      {
        label: 'Zugriff regeln',
        action: this.editAccess.bind(this),
        restricted: true,
      },
      {
        label: 'Neue Info',
        action: this.addDetail.bind(this)
      }
    ]
  };
  menuOpen = false;
  quest: Quest;
  questSub: Subscription;
  questTypes = QuestsService.questTypes;

  constructor(
    private data: DataService,
    private navigation: NavigationService,
    private popover: PopoverService,
    private questService: QuestsService,
    private route: ActivatedRoute,
  ) {
  }

  ngOnInit(): void {
    // Support both routed and embedded usage
    const idSource$ = this.entityId
      ? of(this.entityId)
      : this.route.paramMap.pipe(switchMap(params => of(params.get('id'))));

    this.questSub = idSource$.pipe(
      switchMap(id => this.questService.getQuestById(id)),
    ).subscribe((quest) => {
      if (quest) {
        this.quest = quest;
        // Only set page label when used in routed context
        if (!this.entityId) {
          this.navigation.setPageLabel(this.quest.name, '/quests');
        }
        this.infos$ = this.data.getInfos(this.quest.id, QuestsService.collection);
      }
    });
  }

  ngOnDestroy() {
    this.questSub.unsubscribe();
  }



  editDetail(info: Info) {
    this.popover.showPopover('Info editieren', EditInfoComponent, {
      collection: QuestsService.collection,
      info,
      parentId: this.quest.id
    });
  }


  toggleMenu(e) {
    e.preventDefault();
    this.menuOpen = !this.menuOpen;
  }


  private addDetail() {
    this.popover.showPopover('Neue Info', EditInfoComponent, {
      collection: QuestsService.collection,
      parentId: this.quest.id
    });
  }


  private editAccess() {
    this.popover.showPopover('Zugriff regeln', EditAccessComponent, {
      collection: QuestsService.collection,
      documentId: this.quest.id,
    });
  }


  private editQuest() {
    this.popover.showPopover(this.quest.name, EditQuestComponent, this.quest);
  }
}
