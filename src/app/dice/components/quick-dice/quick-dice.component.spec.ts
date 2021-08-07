import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { QuickDiceComponent } from './quick-dice.component';

describe('QuickDiceComponent', () => {
  let component: QuickDiceComponent;
  let fixture: ComponentFixture<QuickDiceComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ QuickDiceComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(QuickDiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
