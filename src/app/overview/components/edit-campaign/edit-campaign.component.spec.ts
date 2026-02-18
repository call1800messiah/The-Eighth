import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditCampaignComponent } from './edit-campaign.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditCampaignComponent', () => {
  let component: EditCampaignComponent;
  let fixture: ComponentFixture<EditCampaignComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditCampaignComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditCampaignComponent);
    component = fixture.componentInstance;
    component.props = {} as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
