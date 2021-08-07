import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AddPersonAsCombatantComponent } from './add-person-as-combatant.component';

describe('AddPersonAsCombatantComponent', () => {
  let component: AddPersonAsCombatantComponent;
  let fixture: ComponentFixture<AddPersonAsCombatantComponent>;

  beforeEach(waitForAsync(() => {
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
