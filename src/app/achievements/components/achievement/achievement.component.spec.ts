import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AchievementComponent } from './achievement.component';

describe('AchievementComponent', () => {
  let component: AchievementComponent;
  let fixture: ComponentFixture<AchievementComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AchievementComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AchievementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
