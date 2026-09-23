import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditTagsComponent } from './edit-tags.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditTagsComponent', () => {
  let component: EditTagsComponent;
  let fixture: ComponentFixture<EditTagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditTagsComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditTagsComponent);
    component = fixture.componentInstance;
    component.props = { collection: 'people', documentId: 'p1', tags: [] } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
