import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { Observable, Subscription } from 'rxjs';
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
    private router: Router,
  ) {
    // TODO: Check if the quest can be loaded by a resolver as an observable
    this.questSub = this.route.paramMap.pipe(
      switchMap(params => {
        return this.questService.getQuestById(params.get('id'));
      }),
    ).subscribe((quest) => {
      if (quest) {
        this.quest = quest;
        this.navigation.setPageLabel(this.quest.name, '/quests');
        this.infos$ = this.data.getInfos(this.quest.id, QuestsService.collection);
      }
    });
  }

  ngOnInit(): void {
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


  goTo(id: string) {
    this.router.navigate([`quests/${id}`]);
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
