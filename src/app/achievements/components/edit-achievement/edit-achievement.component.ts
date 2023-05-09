import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { DateTime } from 'luxon';

import { PopoverChild } from '../../../shared/models/popover-child';
import { Achievement } from '../../models/achievement';
import { AuthService } from '../../../core/services/auth.service';
import { AchievementService } from '../../services/achievement.service';
import { PeopleService } from '../../../people/services/people.service';
import { Person } from '../../../people/models/person';



@Component({
  selector: 'app-edit-achievement',
  templateUrl: './edit-achievement.component.html',
  styleUrls: ['./edit-achievement.component.scss']
})
export class EditAchievementComponent implements OnInit, OnDestroy, PopoverChild {
  @Input() props: Achievement;
  @Output() dismissPopover = new EventEmitter<boolean>();
  achievementForm = new UntypedFormGroup({
    description: new UntypedFormControl(''),
    isPrivate: new UntypedFormControl(false),
    name: new UntypedFormControl(''),
    people: new UntypedFormControl([]),
    unlocked: new UntypedFormControl(new Date())
  });
  userID: string;
  playerCharacter$: Observable<Person[]>;
  private subscription = new Subscription();

  constructor(
    private achievementService: AchievementService,
    private auth: AuthService,
    private peopleService: PeopleService,
  ) {
    this.playerCharacter$ = this.peopleService.getPeople().pipe(
      map((people) => people.filter((person) => person.pc))
    );
    this.subscription.add(
      this.auth.user$.subscribe((user) => {
        this.userID = user.id;
      })
    );
  }

  ngOnInit(): void {
    if (this.props.id) {
      const {
        description,
        isPrivate,
        name,
        people,
        unlocked,
      } = this.props;
      this.achievementForm.patchValue({
        description,
        isPrivate,
        name,
        people,
        unlocked: DateTime.fromJSDate(unlocked).toISODate(),
      });
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }



  comparePCs(pc1: Person, pc2: Person) {
    return pc1 && pc2 ? pc1.name === pc2.name : pc1 === pc2;
  }


  save() {
    const achievement: Partial<Achievement> = {
      ...this.achievementForm.value,
      people: this.achievementForm.value.people.map((person) => person.id),
      unlocked: DateTime.fromISO(this.achievementForm.value.unlocked).toJSDate(),
    };
    if (this.props.id) {
      achievement.owner = this.props.owner;
    } else {
      achievement.owner = this.userID;
    }
    this.achievementService.store(achievement, this.props.id).then(() => {
      this.dismissPopover.emit(true);
    });
  }
}
