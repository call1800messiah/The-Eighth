import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import type { Person } from '../../../people';
import { SidebarComponent } from './sidebar.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SidebarComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('xp box', () => {
    const select = (values: Partial<Person>) => {
      component.onSelectionChange({ id: 'per1', name: 'Alice', ...values } as Person);
      fixture.detectChanges();
    };
    const xpBox = (): HTMLElement => fixture.nativeElement.querySelector('.xp');
    const rows = () => Array.from(xpBox().querySelectorAll('dt')).map(dt => [
      dt.textContent.trim(),
      dt.nextElementSibling.textContent.trim(),
    ]);

    it('should not show without a selected person', () => {
      expect(xpBox()).toBeNull();
    });

    it('should not show when no xp is received or spent', () => {
      select({ xp: 0, xpSpent: null });
      expect(xpBox()).toBeNull();
    });

    it('should show only received xp when spent xp is untracked', () => {
      select({ xp: 100, xpSpent: null });
      expect(rows()).toEqual([['AP', '100']]);
    });

    it('should show spent xp of 0 when it is tracked', () => {
      select({ xp: 0, xpSpent: 0 });
      expect(rows()).toEqual([['AP Benutzt', '0']]);
    });

    it('should show received and spent xp', () => {
      select({ xp: 100, xpSpent: 40 });
      expect(rows()).toEqual([['AP', '100'], ['AP Benutzt', '40']]);
    });
  });
});
