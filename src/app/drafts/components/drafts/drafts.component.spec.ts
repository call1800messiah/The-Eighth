import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { DraftsComponent } from './drafts.component';
import { AuthService } from '../../../core/services/auth.service';
import { DraftsService } from '../../../core/services/drafts.service';

describe('DraftsComponent', () => {
  let fixture: ComponentFixture<DraftsComponent>;
  let drafts: any;
  let user$: BehaviorSubject<any>;

  const draft = { type: 'person', id: 'p1', name: 'Hesindiane', createdAt: new Date(), route: { path: '/people/p1' } };
  const connection = { id: 'g1', clientName: 'Claude', approvedBy: 'Gordon', createdAt: new Date(), lastUsedAt: null, revokedAt: null };

  beforeEach(async () => {
    user$ = new BehaviorSubject<any>({ id: 'gm', isGM: true });
    drafts = {
      getDrafts: () => of([draft]),
      getConnections: () => of([connection]),
      publish: jasmine.createSpy('publish').and.returnValue(Promise.resolve(true)),
      discard: jasmine.createSpy('discard').and.returnValue(Promise.resolve(true)),
      revoke: jasmine.createSpy('revoke').and.returnValue(Promise.resolve(true)),
    };
    await TestBed.configureTestingModule({
      declarations: [DraftsComponent],
      providers: [
        { provide: AuthService, useValue: { user$ } },
        { provide: DraftsService, useValue: drafts },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(DraftsComponent);
    fixture.detectChanges();
  });

  const buttons = (label: string) => Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
    .filter(button => button.textContent!.trim() === label);

  it('lists drafts and connections for a GM, with the endpoint to connect to', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Hesindiane');
    expect(text).toContain('Claude');
    expect(text).toContain('Gordon');
    expect(text).toContain(`${window.location.origin}/mcp`);
  });

  it('publishes a draft', async () => {
    buttons('Freigeben')[0].click();
    await fixture.whenStable();
    expect(drafts.publish).toHaveBeenCalledWith('person', 'p1');
  });

  it('discards only after confirming', async () => {
    const confirm = spyOn(window, 'confirm').and.returnValue(false);
    buttons('Verwerfen')[0].click();
    expect(drafts.discard).not.toHaveBeenCalled();
    confirm.and.returnValue(true);
    buttons('Verwerfen')[0].click();
    await fixture.whenStable();
    expect(drafts.discard).toHaveBeenCalledWith('person', 'p1');
  });

  it('revokes a connection after confirming', async () => {
    spyOn(window, 'confirm').and.returnValue(true);
    buttons('Trennen')[0].click();
    await fixture.whenStable();
    expect(drafts.revoke).toHaveBeenCalledWith('g1');
  });

  it('shows nothing of it to players', () => {
    user$.next({ id: 'p', isGM: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('nur für die Spielleitung');
    expect(fixture.nativeElement.textContent).not.toContain('Hesindiane');
  });
});
