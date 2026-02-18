import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { AttributesComponent } from './attributes.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('AttributesComponent', () => {
  let component: AttributesComponent;
  let fixture: ComponentFixture<AttributesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AttributesComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AttributesComponent);
    component = fixture.componentInstance;
    component.attributeValues$ = of([]);
    component.canEdit = false;
    component.personId = 'p1';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
