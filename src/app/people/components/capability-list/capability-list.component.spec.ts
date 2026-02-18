import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { CapabilityListComponent } from './capability-list.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('CapabilityListComponent', () => {
  let component: CapabilityListComponent;
  let fixture: ComponentFixture<CapabilityListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CapabilityListComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CapabilityListComponent);
    component = fixture.componentInstance;
    component.person = {
      id: 'p1',
      name: 'Test',
      skills: [],
      advantages: [],
      disadvantages: [],
      feats: [],
      spells: [],
      liturgies: [],
      cantrips: [],
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
