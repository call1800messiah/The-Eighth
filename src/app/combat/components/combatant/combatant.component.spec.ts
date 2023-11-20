import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CombatantComponent } from './combatant.component';

describe('CombatantComponent', () => {
  let component: CombatantComponent;
  let fixture: ComponentFixture<CombatantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CombatantComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CombatantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
