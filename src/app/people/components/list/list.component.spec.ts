import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { ListComponent } from './list.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('ListComponent', () => {
  let component: ListComponent;
  let fixture: ComponentFixture<ListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ListComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('ListComponent dead filter', () => {
  let component: ListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ListComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    component = TestBed.createComponent(ListComponent).componentInstance;
  });

  const living = { id: 'a', name: 'Alrik', death: null, deathLegacy: null };
  const legacyDead = { id: 'b', name: 'Bosper', death: null, deathLegacy: 'Bald' };
  const dead = { id: 'c', name: 'Cora', death: { day: 3, precision: 'day' }, deathLegacy: null };

  it('hides people with only a legacy death text unless show-dead', () => {
    const filter = (component as any).filterPeopleByText.bind(component);
    expect(filter([[living, legacyDead, dead], '', false]).map((p: any) => p.id)).toEqual(['a']);
    expect(filter([[living, legacyDead, dead], '', true]).length).toBe(3);
  });
});
