import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { deleteField } from '@angular/fire/firestore';
import { Observable, Subscription } from 'rxjs';

import type { Quest, QuestDB } from '../../models';
import type { PopoverChild } from '../../../shared';
import { QuestsService } from '../../services/quests.service';
import { AuthService } from '../../../core/services/auth.service';



@Component({
  selector: 'app-edit-quest',
  templateUrl: './edit-quest.component.html',
  styleUrls: ['./edit-quest.component.scss']
})
export class EditQuestComponent implements OnInit, OnDestroy, PopoverChild {
  @Input() props: Quest;
  @Output() dismissPopover = new EventEmitter<boolean>();
  deleteDisabled = true;
  questTypes: Record<string, string>[] = Object.entries(QuestsService.questTypes).reduce((all, [key, value]) => {
    all.push({ key, value });
    return all;
  }, []);
  questForm = new UntypedFormGroup({
    name: new UntypedFormControl(''),
    parentId: new UntypedFormControl(),
    type: new UntypedFormControl(this.questTypes[0]),
    description: new UntypedFormControl(''),
    completed: new UntypedFormControl(false)
  });
  quests$: Observable<Quest[]>;
  userID: string;
  private subscription = new Subscription();

  constructor(
    private auth: AuthService,
    private questService: QuestsService,
  ) {
    this.quests$ = this.questService.getQuests();
    this.subscription.add(
      this.auth.user$.subscribe((user) => {
        this.userID = user.id;
      })
    );
  }

  ngOnInit(): void {
    if (this.props.id) {
      const quest = this.props;
      this.questForm.patchValue(quest);
      this.questForm.patchValue({ parentId: this.props.parent ? this.props.parent.id  : null });
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }



  save() {
    const quest: Partial<QuestDB> = {
      ...this.questForm.value
    };
    if (this.props.id) {
      quest.owner = this.props.owner;
    } else {
      quest.owner = this.userID;
    }
    if (this.props.id && quest.parentId === 'null') {
      quest.parentId = deleteField();
    } else if (quest.parentId === 'null') {
      delete quest.parentId;
    }
    this.questService.store(quest, this.props.id).then(() => {
      this.dismissPopover.emit(true);
    });
  }

  toggleDelete() {
    this.deleteDisabled = !this.deleteDisabled;
  }
}
