import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { StatsComponent } from './stats.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';
import { AuthService } from '../../../core/services/auth.service';

describe('StatsComponent', () => {
  let component: StatsComponent;
  let fixture: ComponentFixture<StatsComponent>;
  let auth: { user: any };

  beforeEach(async () => {
    // AuthService emits the session user before the users table has loaded,
    // so isGM is missing at first; the sidebar creates this component then.
    auth = { user: { id: 'gm-1' } };
    await TestBed.configureTestingModule({
      declarations: [StatsComponent],
      providers: [
        ...createComponentTestProviders(),
        { provide: AuthService, useValue: auth },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(StatsComponent);
    component = fixture.componentInstance;
    component.person$ = of({ id: 'p1', name: 'Test', owner: 'user-2' } as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not let a non-owner edit', () => {
    expect(component.isOwnerOrCan('editStats')).toBeFalse();
  });

  it('lets a GM edit once the GM role arrives after creation', () => {
    auth.user = { id: 'gm-1', isGM: true };
    expect(component.isOwnerOrCan('editStats')).toBeTrue();
  });
});
