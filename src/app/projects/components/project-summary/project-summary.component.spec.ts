import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { ProjectSummaryComponent } from './project-summary.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('ProjectSummaryComponent', () => {
  let component: ProjectSummaryComponent;
  let fixture: ComponentFixture<ProjectSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProjectSummaryComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectSummaryComponent);
    component = fixture.componentInstance;
    component.project = { id: 'pr1', name: 'Test Project', description: '', milestones: [], requirements: [] } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
