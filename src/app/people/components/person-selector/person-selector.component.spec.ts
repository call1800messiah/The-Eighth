import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';

import { PersonSelectorComponent } from './person-selector.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';
import { AuthService } from '../../../core/services/auth.service';
import { PeopleService } from '../../services/people.service';
import type { Person } from '../../models';

describe('PersonSelectorComponent', () => {
  const people = [
    { id: 'p1', name: 'Alrik', owner: 'user-1' },
    { id: 'p2', name: 'Boronian', owner: 'user-2' },
    { id: 'p3', name: 'Cyriane', owner: 'gm-1' },
  ] as Person[];

  let component: PersonSelectorComponent;
  let fixture: ComponentFixture<PersonSelectorComponent>;

  async function setup(user: { id: string; isGM: boolean }) {
    await TestBed.configureTestingModule({
      declarations: [PersonSelectorComponent],
      providers: [
        ...createComponentTestProviders(),
        { provide: AuthService, useValue: { user } },
        { provide: PeopleService, useValue: { getPeople: () => of(people) } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PersonSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', async () => {
    await setup({ id: 'user-1', isGM: false });
    expect(component).toBeTruthy();
  });

  it('lists only their own characters for a player', async () => {
    await setup({ id: 'user-1', isGM: false });
    const listed = await firstValueFrom(component.people$);
    expect(listed.map(p => p.id)).toEqual(['p1']);
  });

  it('lists every character for a GM, in the order the service gives', async () => {
    await setup({ id: 'gm-1', isGM: true });
    const listed = await firstValueFrom(component.people$);
    expect(listed.map(p => p.id)).toEqual(['p1', 'p2', 'p3']);
  });
});
