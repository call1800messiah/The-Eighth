import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Quest } from '../models/quest';
import { AuthUser } from '../../auth/models/auth-user';
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
        id: entry.payload.doc.id,
        completed: questData.completed || false,
        description: questData.description || '',
        name: questData.name || '',
        type: questData.type || null,
        owner: questData.owner,
        isPrivate: questData.isPrivate
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
      this.api.getDataFromCollectionWhere(
        QuestsService.collection,
        (ref) => ref
          .where('access', 'array-contains', this.user.id)
      ).pipe(
        map(QuestsService.transformQuests),
        map(this.resolveParents),
        map((quests: Quest[]) => quests.sort(UtilService.orderByName)),
      ).subscribe((quests) => {
        this.quests$.next(quests);
      });
    }
    return this.quests$;
  }


  store(quest: Partial<Quest>, questId?: string) {
    return this.data.store(quest, QuestsService.collection, questId);
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
