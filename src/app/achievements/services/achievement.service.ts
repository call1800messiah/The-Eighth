import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Achievement } from '../models/achievement';
import { UtilService } from '../../core/services/util.service';
import { ApiService } from '../../core/services/api.service';
import { PeopleService } from '../../people/services/people.service';
import { Person } from '../../people/models/person';
import { AuthUser } from '../../auth/models/auth-user';
import { AuthService } from '../../core/services/auth.service';



@Injectable({
  providedIn: 'root'
})
export class AchievementService {
  private achievements$: Observable<Achievement[]>;
  private user: AuthUser;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private peopleService: PeopleService,
  ) {
    this.user = this.auth.user;
  }




  getAchievements(): Observable<Achievement[]> {
    if (!this.achievements$) {
      this.achievements$ = combineLatest([
        this.api.getDataFromCollectionWhere(
          'achievements',
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



  private transformAchievements(achievements: any[], people: Person[]): Achievement[] {
    return achievements.reduce((all, entry) => {
      const achieve = entry.payload.doc.data();
      all.push({
        id: entry.payload.doc.id,
        name: achieve.name,
        description: achieve.description,
        unlocked: new Date(achieve.unlocked.seconds * 1000),
        icon: achieve.icon,
        people: people.filter((person) => achieve.people.indexOf(person.id) !== -1),
        isPrivate: achieve.isPrivate,
        owner: achieve.owner
      });
      return all;
    }, []);
  }
}
