import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Achievement } from '../../core/models/achievements.model';
import { UtilService } from '../../core/services/util.service';
import { ApiService } from '../../core/services/api.service';
import { PeopleService } from '../../people/services/people.service';
import { Person } from '../../core/interfaces/person.interface';
import { AuthUser } from '../../core/interfaces/auth-user.interface';
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
      all.push(new Achievement(
        entry.payload.doc.id,
        achieve.name,
        achieve.description,
        new Date(achieve.unlocked.seconds * 1000),
        achieve.icon,
        people.filter((person) => achieve.people.indexOf(person.id) !== -1),
        achieve.isPrivate,
        achieve.owner
      ));
      return all;
    }, []);
  }
}
