import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Subject, of } from 'rxjs';

import { PlaceComponent } from './place.component';
import { PlaceService } from '../../services/place.service';
import { InfoType } from '../../../core/enums/info-type.enum';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('PlaceComponent', () => {
  let component: PlaceComponent;
  let fixture: ComponentFixture<PlaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PlaceComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PlaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the info boxes when the infos are reloaded', async () => {
    // Every realtime refresh builds a new Map with new objects for the same infos.
    const infos$ = new Subject<Map<InfoType, any[]>>();
    const reload = () => infos$.next(new Map<InfoType, any[]>([
      [InfoType.Appearance, [{ id: 'i1', content: 'A' }]],
      [InfoType.Note, [{ id: 'i2', content: 'B' }]],
    ]));
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      declarations: [PlaceComponent],
      providers: [
        ...createComponentTestProviders(),
        {
          provide: PlaceService,
          useValue: {
            getPlaceById: () => of({ id: 'l1', name: 'Gareth', owner: 'user-1', access: [] }),
            getPlaceInfos: () => infos$,
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    const warn = spyOn(console, 'warn');
    const place = TestBed.createComponent(PlaceComponent);
    place.componentRef.setInput('entityId', 'l1');
    place.detectChanges();

    reload();
    place.detectChanges();
    const first = Array.from(place.nativeElement.querySelectorAll('app-info-box'));
    reload();
    place.detectChanges();
    const second = Array.from(place.nativeElement.querySelectorAll('app-info-box'));

    expect(second.length).toBe(2);
    expect(second.every((element, i) => element === first[i])).withContext('same DOM nodes').toBeTrue();
    expect(warn.calls.allArgs().filter(args => String(args[0]).includes('NG0956'))).toEqual([]);
  });
});
