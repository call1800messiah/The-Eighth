import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Quest } from '../models/quest';
import { UtilService } from '../../core/services/util.service';
import { DataService } from '../../core/services/data.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';



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

  constructor(
    private data: DataService,
    private realtime: RealtimeService,
  ) {}



  private static transformQuests(rows: any[]): Quest[] {
    return rows.map(row => {
      const quest: Quest = {
        access: [],
        collection: QuestsService.collection,
        completed: row.completed || false,
        description: row.description || '',
        id: row.id,
        name: row.name || '',
        owner: row.owner_id,
        type: row.type || null
      };
      if (row.parent_id) {
        quest.parent = { id: row.parent_id };
      }
      return quest;
    });
  }



  getQuestById(id: string): Observable<Quest> {
    return this.getQuests().pipe(
      map((quests) => quests.find(quest => quest.id === id)),
    );
  }


  getQuests(): Observable<Quest[]> {
    if (!this.quests$) {
      this.quests$ = new BehaviorSubject<Quest[]>([]);
      this.realtime.watch<any>(
        'quests',
        undefined,
        'quests',
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
    const cleanedQuest: any = { ...quest };
    if (quest.parent) {
      cleanedQuest.parent_id = quest.parent.id;
      delete cleanedQuest.parent;
    }
    if ('parentId' in cleanedQuest) {
      cleanedQuest.parent_id = cleanedQuest.parentId || null;
      delete cleanedQuest.parentId;
    }
    delete cleanedQuest.subQuests;
    return this.data.store(cleanedQuest, QuestsService.collection, questId);
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
