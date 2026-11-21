import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditImageComponent } from './edit-image.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditImageComponent', () => {
  let component: EditImageComponent;
  let fixture: ComponentFixture<EditImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditImageComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditImageComponent);
    component = fixture.componentInstance;
    component.props = { collection: 'people', documentId: 'p1' } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
