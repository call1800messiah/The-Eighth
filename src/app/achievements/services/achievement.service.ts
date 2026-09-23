import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Achievement } from '../models/achievement';
import type { Person } from '../../people/models/person';
import { UtilService } from '../../core/services/util.service';
import { PeopleService } from '../../people/services/people.service';
import { DataService } from '../../core/services/data.service';
import { ApiService } from '../../core/services/api.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';



@Injectable({
  providedIn: 'root'
})
export class AchievementService {
  static readonly collection = 'achievements';
  private achievements$: Observable<Achievement[]>;

  constructor(
    private api: ApiService,
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


  async store(achievement: Partial<Achievement>, achievementId?: string) {
    const peopleIds: string[] = (achievement.people as any[] || [])
      .map(p => typeof p === 'string' ? p : p?.id)
      .filter(Boolean);
    const cleaned: any = { ...achievement };
    delete cleaned.people;

    const result = await this.data.store(cleaned, AchievementService.collection, achievementId);

    if (result.success && result.id) {
      await this.api.from('achievement_people' as any).delete().eq('achievement_id', result.id);
      if (peopleIds.length > 0) {
        await this.api.from('achievement_people' as any)
          .insert(peopleIds.map(personId => ({ achievement_id: result.id, person_id: personId })));
      }
    }
    return result;
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
