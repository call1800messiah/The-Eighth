import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CombatantMenuComponent } from './combatant-menu.component';

describe('CombatantMenuComponent', () => {
  let component: CombatantMenuComponent;
  let fixture: ComponentFixture<CombatantMenuComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CombatantMenuComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CombatantMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
