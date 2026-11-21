import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy, inject } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import type { CampaignData } from '../../models/campaign-data';
import { PopoverChild } from '../../../shared/models/popover-child';
import { CampaignService } from '../../services/campaign.service';

@Component({
  selector: 'app-edit-campaign',
  templateUrl: './edit-campaign.component.html',
  styleUrl: './edit-campaign.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class EditCampaignComponent implements OnInit, PopoverChild {
  private campaignService = inject(CampaignService);

  @Input() props: CampaignData;
  @Output() dismissPopover = new EventEmitter<boolean>();
  campaignForm = new UntypedFormGroup({
    captain: new UntypedFormControl(''),
    crewcount: new UntypedFormControl(0),
    date: new UntypedFormControl(null),
    name: new UntypedFormControl(''),
    ship: new UntypedFormControl(''),
    staminaReduction: new UntypedFormControl(0),
    xp: new UntypedFormControl(0),
  });

  /** The user discarded the old date text; cleared on save. */
  discardedLegacy = false;

  /** Required, unless the old text still stands in for a date. */
  get dateRequired(): boolean {
    return !this.props?.dateLegacy || this.discardedLegacy;
  }

  ngOnInit(): void {
    this.campaignForm.patchValue(this.props);
  }

  save() {
    if (this.campaignForm.invalid) {
      this.campaignForm.markAllAsTouched();
      return;
    }
    const campaign = { ...this.campaignForm.value };
    if (this.discardedLegacy) {
      campaign.dateLegacy = null;
    }
    this.campaignService.store(campaign, this.props.id).then(() => {
      this.dismissPopover.emit(true);
    });
  }
}
