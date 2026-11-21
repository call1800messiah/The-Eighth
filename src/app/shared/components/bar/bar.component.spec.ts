import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { BarComponent } from './bar.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('BarComponent', () => {
  let component: BarComponent;
  let fixture: ComponentFixture<BarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BarComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(BarComponent);
    component = fixture.componentInstance;
    component.bar = { label: 'HP', current: 10, max: 20 } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
