import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { AchievementComponent } from './achievement.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('AchievementComponent', () => {
  let component: AchievementComponent;
  let fixture: ComponentFixture<AchievementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AchievementComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AchievementComponent);
    component = fixture.componentInstance;
    component.achievement = { id: 'a1', name: 'Test', description: '', unlocked: false } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
