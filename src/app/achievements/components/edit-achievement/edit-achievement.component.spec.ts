import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditAchievementComponent } from './edit-achievement.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditAchievementComponent', () => {
  let component: EditAchievementComponent;
  let fixture: ComponentFixture<EditAchievementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditAchievementComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditAchievementComponent);
    component = fixture.componentInstance;
    component.props = {} as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
