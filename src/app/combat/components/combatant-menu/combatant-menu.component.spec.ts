import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CombatantMenuComponent } from './combatant-menu.component';

describe('CombatantMenuComponent', () => {
  let component: CombatantMenuComponent;
  let fixture: ComponentFixture<CombatantMenuComponent>;

  beforeEach(async(() => {
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
