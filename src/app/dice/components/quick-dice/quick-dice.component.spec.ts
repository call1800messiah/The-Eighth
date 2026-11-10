import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { QuickDiceComponent } from './quick-dice.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('QuickDiceComponent', () => {
  let component: QuickDiceComponent;
  let fixture: ComponentFixture<QuickDiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuickDiceComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(QuickDiceComponent);
    component = fixture.componentInstance;
    component.amount = 1;
    component.type = 6;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders one die per slot when several show the same number', () => {
    const warn = spyOn(console, 'warn');
    const several = TestBed.createComponent(QuickDiceComponent);
    several.componentInstance.amount = 3;
    several.componentInstance.type = 20;
    several.detectChanges();

    expect(several.nativeElement.querySelectorAll('app-die').length).toBe(3);
    const duplicateKeys = warn.calls.allArgs().filter(args => String(args[0]).includes('NG0955'));
    expect(duplicateKeys).toEqual([]);
  });
});
