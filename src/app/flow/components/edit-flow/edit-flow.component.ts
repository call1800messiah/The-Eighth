import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';

import type { Flow } from '../../models';
import { PopoverChild } from '../../../shared';
import { AuthService } from '../../../core/services/auth.service';
import { FlowService } from '../../services/flow.service';
import { Subscription } from 'rxjs';

export interface EditFlowProps extends Partial<Flow> {
  onSave?: (flow: { id: string; date: Date; title?: string }) => void;
}

@Component({
  selector: 'app-edit-flow',
  templateUrl: './edit-flow.component.html',
  styleUrl: './edit-flow.component.scss'
})
export class EditFlowComponent implements OnInit, OnDestroy, PopoverChild {
  @Input() props: EditFlowProps;
  @Output() dismissPopover = new EventEmitter<boolean>();

  flowForm = new UntypedFormGroup({
    date: new UntypedFormControl('', Validators.required),
    title: new UntypedFormControl('')
  });
  userID: string;
  private subscription = new Subscription();

  constructor(
    private auth: AuthService,
    private flowService: FlowService
  ) {
    this.subscription.add(
      this.auth.user$.subscribe((user) => {
        this.userID = user.id;
      })
    );
  }

  ngOnInit(): void {
    if (this.props?.id) {
      // Edit mode - populate form
      this.flowForm.patchValue({
        date: this.formatDateForInput(this.props.date),
        title: this.props.title || ''
      });
    } else {
      // Create mode - default to today
      this.flowForm.patchValue({
        date: this.formatDateForInput(new Date())
      });
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  save(): void {
    if (!this.flowForm.valid) {
      return;
    }
    const flow: Partial<Flow> = {
      ...this.flowForm.value,
    }
    if (this.props.id) {
      flow.owner = this.props.owner;
    } else {
      flow.owner = this.userID;
    }

    const date = new Date(this.flowForm.value.date);
    const title = this.flowForm.value.title?.trim();

    this.flowService.storeFlow(flow, this.props.id).then((result) => {
      if (result.success && result.id && this.props?.onSave) {
        this.props.onSave({ id: result.id, date, title });
      }
      this.dismissPopover.emit(true);
    });
  }

  private formatDateForInput(date: Date): string {
    if (!date) {
      date = new Date();
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
