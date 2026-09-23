import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { PersonSummaryComponent } from './person-summary.component';
import { EstimatedAgePipe } from '../../../shared/pipes/estimated-age.pipe';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('PersonSummaryComponent', () => {
  let component: PersonSummaryComponent;
  let fixture: ComponentFixture<PersonSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PersonSummaryComponent, EstimatedAgePipe],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PersonSummaryComponent);
    component = fixture.componentInstance;
    component.person = { id: 'p1', name: 'Test', image: '', title: '' } as any;
    component.showAsList = false;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
