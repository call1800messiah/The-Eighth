import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { AuthUser } from '../../auth/models/auth-user';
import type { Quest } from '../models/quest';
import { ApiService } from '../../core/services/api.service';
import { UtilService } from '../../core/services/util.service';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';



@Injectable({
  providedIn: 'root'
})
export class QuestsService {
  static readonly collection = 'quests';
  static questTypes = {
    main: 'Hauptqueste',
    scene: 'Szene',
    sub: 'Subquest',
    task: 'Aufgabe',
  };
  private quests$: BehaviorSubject<Quest[]>;
  private user: AuthUser;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private data: DataService,
  ) {
    this.user = this.auth.user;
  }



  private static transformQuests(quests: any[]): Quest[] {
    return quests.reduce((all, entry) => {
      const questData = entry.payload.doc.data();
      const quest: Quest = {
        access: questData.access,
        collection: QuestsService.collection,
        completed: questData.completed || false,
        description: questData.description || '',
        id: entry.payload.doc.id,
        name: questData.name || '',
        owner: questData.owner,
        type: questData.type || null
      };
      if (questData.parentId) {
        quest.parent = { id: questData.parentId };
      }
      all.push(quest);
      return all;
    }, []);
  }



  getQuestById(id: string): Observable<Quest> {
    return this.getQuests().pipe(
      map((quests) => quests.find(quest => quest.id === id)),
    );
  }


  getQuests(): Observable<Quest[]> {
    if (!this.quests$) {
      this.quests$ = new BehaviorSubject<Quest[]>([]);
      this.api.getDataFromCollection(
        QuestsService.collection,
        (ref) => ref
          .where('access', 'array-contains', this.user.id)
      ).pipe(
        map(QuestsService.transformQuests),
        map(this.resolveParents),
        map((quests: Quest[]) => quests.sort(UtilService.orderByName)),
        map(this.createQuestTree)
      ).subscribe((quests) => {
        this.quests$.next(quests);
      });
    }
    return this.quests$;
  }


  store(quest: Partial<Quest>, questId?: string) {
    return this.data.store(quest, QuestsService.collection, questId);
  }



  private createQuestTree(quests: Quest[]): Quest[] {
    const questMap: Record<string, Quest> = {};
    const questGroupMap: Record<string, Quest[]> = {
      Nichts: []
    };

    quests.forEach((quest) => {
      questMap[quest.id] = quest;
      if (quest.parent) {
        if (!questGroupMap[quest.parent.id]) {
          questGroupMap[quest.parent.id] = [];
        }
        questGroupMap[quest.parent.id].push(quest);
      }
    });

    Object.entries(questGroupMap).forEach(([questId, questList]) => {
      if (questMap[questId]) {
        questMap[questId].subQuests = questList;
      }
    });

    return quests;
  }


  private resolveParents(quests: Quest[]): Quest[] {
    return quests.map(quest => {
      if (quest.parent) {
        const parent = quests.find(parentCandidate => quest.parent.id === parentCandidate.id);
        if (parent) {
          quest.parent.name = parent.name;
        }
      }
      return quest;
    });
  }
}
