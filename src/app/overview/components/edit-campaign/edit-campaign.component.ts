import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import type { CampaignData } from '../../models/campaign-data';
import { PopoverChild } from '../../../shared/models/popover-child';
import { CampaignService } from '../../services/campaign.service';

@Component({
  selector: 'app-edit-campaign',
  templateUrl: './edit-campaign.component.html',
  styleUrl: './edit-campaign.component.scss'
})
export class EditCampaignComponent implements OnInit, PopoverChild {
  @Input() props: CampaignData;
  @Output() dismissPopover = new EventEmitter<boolean>();
  campaignForm = new UntypedFormGroup({
    captain: new UntypedFormControl(''),
    crewcount: new UntypedFormControl(0),
    date: new UntypedFormControl(''),
    name: new UntypedFormControl(''),
    ship: new UntypedFormControl(''),
    staminaReduction: new UntypedFormControl(0),
    xp: new UntypedFormControl(0),
  });

  constructor(private campaignService: CampaignService) {}

  ngOnInit(): void {
    this.campaignForm.patchValue(this.props);
  }

  save() {
    this.campaignService.store(this.campaignForm.value, this.props.id).then(() => {
      this.dismissPopover.emit(true);
    });
  }
}
