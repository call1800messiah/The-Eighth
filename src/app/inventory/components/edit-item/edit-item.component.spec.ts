import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditItemComponent } from './edit-item.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditItemComponent', () => {
  let component: EditItemComponent;
  let fixture: ComponentFixture<EditItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditItemComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditItemComponent);
    component = fixture.componentInstance;
    component.props = {} as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
