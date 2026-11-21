import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { BarAttributesComponent } from './bar-attributes.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('BarAttributesComponent', () => {
  let component: BarAttributesComponent;
  let fixture: ComponentFixture<BarAttributesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BarAttributesComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(BarAttributesComponent);
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
