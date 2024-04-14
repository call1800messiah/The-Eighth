import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SelectPeopleComponent } from './select-people.component';

describe('AddPersonAsCombatantComponent', () => {
  let component: SelectPeopleComponent;
  let fixture: ComponentFixture<SelectPeopleComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SelectPeopleComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectPeopleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
