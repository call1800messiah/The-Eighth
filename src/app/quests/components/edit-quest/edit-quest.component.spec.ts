import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditQuestComponent } from './edit-quest.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditQuestComponent', () => {
  let component: EditQuestComponent;
  let fixture: ComponentFixture<EditQuestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditQuestComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditQuestComponent);
    component = fixture.componentInstance;
    component.props = {} as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
