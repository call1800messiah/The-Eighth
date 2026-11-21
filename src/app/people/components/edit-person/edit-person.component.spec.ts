import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditPersonComponent } from './edit-person.component';
import { PeopleService } from '../../services/people.service';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('AddPersonComponent', () => {
  let component: EditPersonComponent;
  let fixture: ComponentFixture<EditPersonComponent>;
  let peopleService: any;

  beforeEach(async () => {
    peopleService = { store: jasmine.createSpy('store').and.returnValue(Promise.resolve()) };
    await TestBed.configureTestingModule({
      declarations: [EditPersonComponent],
      providers: [...createComponentTestProviders(), { provide: PeopleService, useValue: peopleService }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditPersonComponent);
    component = fixture.componentInstance;
    component.props = {} as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should save birth and death as in-game dates', () => {
    component.personForm.patchValue({
      name: 'x', birth: { day: 5, precision: 'year' }, death: { day: 9, precision: 'day' },
    });
    component.save();
    const stored = peopleService.store.calls.mostRecent().args[0];
    expect(stored.birth).toEqual({ day: 5, precision: 'year' });
    expect(stored.death).toEqual({ day: 9, precision: 'day' });
  });

  it('should not save while a date is invalid', () => {
    component.personForm.controls['birth'].setErrors({ invalidDate: true });
    component.save();
    expect(peopleService.store).not.toHaveBeenCalled();
  });
});
