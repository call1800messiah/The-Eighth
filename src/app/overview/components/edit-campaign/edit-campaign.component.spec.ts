import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditCampaignComponent } from './edit-campaign.component';
import { CampaignService } from '../../services/campaign.service';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditCampaignComponent', () => {
  let component: EditCampaignComponent;
  let fixture: ComponentFixture<EditCampaignComponent>;
  let campaignService: { store: jasmine.Spy };

  beforeEach(async () => {
    campaignService = { store: jasmine.createSpy('store').and.resolveTo({ success: true }) };
    await TestBed.configureTestingModule({
      declarations: [EditCampaignComponent],
      providers: [...createComponentTestProviders(), { provide: CampaignService, useValue: campaignService }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditCampaignComponent);
    component = fixture.componentInstance;
    component.props = { id: 'c1' } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should save the date as an in-game date', () => {
    component.campaignForm.patchValue({ name: 'x', date: { day: 5, precision: 'day' } });
    component.save();
    expect(campaignService.store.calls.mostRecent().args[0].date).toEqual({ day: 5, precision: 'day' });
  });

  it('should not save while the date is invalid', () => {
    component.campaignForm.controls['date'].setErrors({ invalidDate: true });
    component.save();
    expect(campaignService.store).not.toHaveBeenCalled();
  });
});
