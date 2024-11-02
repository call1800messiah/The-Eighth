import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditCampaignComponent } from './edit-campaign.component';

describe('EditCampaignComponent', () => {
  let component: EditCampaignComponent;
  let fixture: ComponentFixture<EditCampaignComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditCampaignComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditCampaignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
