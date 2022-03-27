import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecentRollsComponent } from './recent-rolls.component';

describe('RecentRollsComponent', () => {
  let component: RecentRollsComponent;
  let fixture: ComponentFixture<RecentRollsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RecentRollsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RecentRollsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
