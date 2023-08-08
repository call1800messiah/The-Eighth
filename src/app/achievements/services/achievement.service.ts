import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Achievement } from '../models/achievement';
import type { AuthUser } from '../../auth/models/auth-user';
import type { Person } from '../../people/models/person';
import { UtilService } from '../../core/services/util.service';
import { ApiService } from '../../core/services/api.service';
import { PeopleService } from '../../people/services/people.service';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';



@Injectable({
  providedIn: 'root'
})
export class AchievementService {
  static readonly collection = 'achievements';
  private achievements$: Observable<Achievement[]>;
  private user: AuthUser;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private data: DataService,
    private peopleService: PeopleService,
  ) {
    this.user = this.auth.user;
  }



  getAchievements(): Observable<Achievement[]> {
    if (!this.achievements$) {
      this.achievements$ = combineLatest([
        this.api.getDataFromCollection(
          AchievementService.collection,
          (ref) => ref
            .where('access', 'array-contains', this.user.id)
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


  private transformAchievements(achievements: any[], people: Person[]): Achievement[] {
    return achievements.reduce((all, entry) => {
      const achieve = entry.payload.doc.data();
      all.push({
        access: achieve.access,
        collection: AchievementService.collection,
        id: entry.payload.doc.id,
        name: achieve.name,
        description: achieve.description,
        unlocked: new Date(achieve.unlocked.seconds * 1000),
        icon: achieve.icon,
        people: people.filter((person) => achieve.people.indexOf(person.id) !== -1),
        owner: achieve.owner
      });
      return all;
    }, []);
  }
}
