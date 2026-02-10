import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Achievement } from '../models/achievement';
import type { Person } from '../../people/models/person';
import { UtilService } from '../../core/services/util.service';
import { PeopleService } from '../../people/services/people.service';
import { DataService } from '../../core/services/data.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';



@Injectable({
  providedIn: 'root'
})
export class AchievementService {
  static readonly collection = 'achievements';
  private achievements$: Observable<Achievement[]>;

  constructor(
    private data: DataService,
    private peopleService: PeopleService,
    private realtime: RealtimeService,
  ) {}



  getAchievements(): Observable<Achievement[]> {
    if (!this.achievements$) {
      this.achievements$ = combineLatest([
        this.realtime.watch<any>(
          'achievements',
          query => query.select('*, achievement_people(person_id)'),
          'achievements',
        ),
        this.peopleService.getPeople(),
      ]).pipe(
        map(([achievements, people]) => this.transformAchievements(achievements, people)),
        map((achievements) => achievements.sort(UtilService.orderByUnlocked)),
      );
    }
    return this.achievements$;
  }


  store(achievement: Partial<Achievement>, achievementId?: string) {
    return this.data.store(achievement, AchievementService.collection, achievementId);
  }


  private transformAchievements(rows: any[], people: Person[]): Achievement[] {
    return rows.map(row => {
      const personIds: string[] = (row.achievement_people || []).map((ap: any) => ap.person_id);
      return {
        access: [],
        collection: AchievementService.collection,
        id: row.id,
        name: row.name,
        description: row.description,
        unlocked: new Date(row.unlocked),
        icon: row.icon,
        people: people.filter((person) => personIds.includes(person.id)),
        owner: row.owner_id,
      };
    });
  }
}
