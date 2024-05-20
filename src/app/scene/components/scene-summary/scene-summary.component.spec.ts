import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SceneSummaryComponent } from './scene-summary.component';

describe('SceneSummaryComponent', () => {
  let component: SceneSummaryComponent;
  let fixture: ComponentFixture<SceneSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SceneSummaryComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SceneSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
