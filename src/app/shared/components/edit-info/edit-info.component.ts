import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy, inject } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';

import type { EditInfoProps, Info, PopoverChild } from '../../models';
import { DataService } from '../../../core/services/data.service';
import { ConfigService } from '../../../core/services/config.service';
import { AuthService } from '../../../core/services/auth.service';



@Component({
  selector: 'app-edit-info',
  templateUrl: './edit-info.component.html',
  styleUrls: ['./edit-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class EditInfoComponent implements OnInit, OnDestroy, PopoverChild {
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private dataService = inject(DataService);

  @Input() props: EditInfoProps;
  @Output() dismissPopover = new EventEmitter<boolean>();
  deleteDisabled = true;
  error: string | null = null;
  infoForm = new UntypedFormGroup({
    content: new UntypedFormControl(''),
    type: new UntypedFormControl(0),
  });
  infoTypes = Object.values(ConfigService.infoTypes);
  userID: string;
  private subscription = new Subscription();

  constructor() {
    this.subscription.add(
      this.auth.user$.subscribe((user) => {
        this.userID = user.id;
      })
    );
  }

  ngOnInit(): void {
    if (this.props.info) {
      const info = this.props.info as Info;
      this.infoForm.patchValue(info);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }


  async delete() {
    if (this.props.info) {
      this.error = null;
      if (await this.dataService.deleteInfo(this.props.info.id)) {
        this.dismissPopover.emit(true);
      } else {
        this.error = 'Die Info wurde nicht gelöscht. Du darfst sie vermutlich nicht bearbeiten.';
        this.cdr.markForCheck();
      }
    }
  }


  async save() {
    const info = { ...this.infoForm.value };
    if (!this.props.info) {
      info.owner = this.userID;
    }

    this.error = null;
    const result = await this.dataService.storeInfo(info, this.props.collection, this.props.parentId, this.props.info?.id);
    if (result.success) {
      this.dismissPopover.emit(true);
    } else {
      this.error = 'Die Info wurde nicht gespeichert. Du darfst sie vermutlich nicht bearbeiten.';
      this.cdr.markForCheck();
    }
  }


  toggleDelete() {
    this.deleteDisabled = !this.deleteDisabled;
  }
}
