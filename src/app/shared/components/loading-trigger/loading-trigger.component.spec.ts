import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadingTriggerComponent } from './loading-trigger.component';

describe('LoadingTriggerComponent', () => {
  let component: LoadingTriggerComponent;
  let fixture: ComponentFixture<LoadingTriggerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingTriggerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoadingTriggerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
