import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddPersonAsCombatantComponent } from './add-person-as-combatant.component';

describe('AddPersonAsCombatantComponent', () => {
  let component: AddPersonAsCombatantComponent;
  let fixture: ComponentFixture<AddPersonAsCombatantComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddPersonAsCombatantComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddPersonAsCombatantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
