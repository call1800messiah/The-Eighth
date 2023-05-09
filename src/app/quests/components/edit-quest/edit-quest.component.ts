import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';

import { QuestsService } from '../../services/quests.service';
import { PopoverChild } from '../../../shared/models/popover-child';
import { Quest } from '../../models/quest';
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
    isPrivate: new UntypedFormControl(true),
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

      if (this.props.parent) {
        this.questForm.patchValue({ parentId: this.props.parent.id });
      }
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }



  isSelectedParent(parentId: string): boolean {
    return this.props.id && this.props.parent && this.props.parent.id === parentId;
  }

  save() {
    const quest: Partial<Quest> = {
      ...this.questForm.value
    };
    if (this.props.id) {
      quest.owner = this.props.owner;
    } else {
      quest.owner = this.userID;
    }
    this.questService.store(quest, this.props.id).then(() => {
      this.dismissPopover.emit(true);
    });
  }

  toggleDelete() {
    this.deleteDisabled = !this.deleteDisabled;
  }
}
