import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditPersonComponent } from './edit-person.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('AddPersonComponent', () => {
  let component: EditPersonComponent;
  let fixture: ComponentFixture<EditPersonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditPersonComponent],
      providers: createComponentTestProviders(),
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
});
