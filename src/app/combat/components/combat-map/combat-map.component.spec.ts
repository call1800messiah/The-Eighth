import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import Konva from 'konva';

import { CombatMapComponent } from './combat-map.component';
import { CombatMap, CombatMapService } from '../../services/combat-map.service';
import { AuthService } from '../../../core/services/auth.service';
import type { Combatant } from '../../models/combatant';

describe('CombatMapComponent', () => {
  let fixture: ComponentFixture<CombatMapComponent>;
  let component: CombatMapComponent;
  let map$: BehaviorSubject<CombatMap | null>;
  let tokens$: BehaviorSubject<Map<string, { x: number; y: number }>>;
  let maps: any;
  let user$: BehaviorSubject<any>;

  const combatant = (id: string, extra: Partial<Combatant> = {}): Combatant =>
    ({ id, active: true, initiative: 0, attributes: of([]), name: id, ...extra });

  const stage = () => (component as any).stage as Konva.Stage;
  const token = (id: string) => stage().findOne(`#${id}`) as Konva.Group;

  beforeEach(async () => {
    map$ = new BehaviorSubject<CombatMap | null>({
      id: 'm1', imageUrl: null, imagePath: null, size: { width: 1000, height: 600 },
      grid: { enabled: true, size: 50, offsetX: 0, offsetY: 0 },
    });
    tokens$ = new BehaviorSubject(new Map([['placed', { x: 525, y: 325 }]]));
    user$ = new BehaviorSubject<any>({ id: 'gm', isGM: true });
    maps = {
      getMap: () => map$,
      getTokenPositions: () => tokens$,
      moveToken: jasmine.createSpy('moveToken').and.returnValue(Promise.resolve(true)),
      updateGrid: jasmine.createSpy('updateGrid').and.returnValue(Promise.resolve(true)),
      uploadImage: jasmine.createSpy('uploadImage').and.returnValue(Promise.resolve(true)),
    };
    await TestBed.configureTestingModule({
      declarations: [CombatMapComponent],
      providers: [
        { provide: CombatMapService, useValue: maps },
        { provide: AuthService, useValue: { user$ } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(CombatMapComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.display = 'block';
    fixture.nativeElement.style.width = '800px';
    component.combatants = [
      combatant('placed'),
      combatant('ork-1', { name: 'Ork' }),
      combatant('ork-2', { name: 'Ork Hauptmann', active: false }),
      combatant('alrik', { name: undefined, person: { id: 'p1', name: 'Alrik von Gareth', pc: true, owner: 'someone' } as any }),
    ];
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('draws a token per combatant: placed ones where stored, the rest in the staging row', () => {
    expect(token('placed').position()).toEqual({ x: 525, y: 325 });
    expect(token('ork-1').position()).toEqual({ x: 25, y: 25 });
    expect(token('ork-2').position()).toEqual({ x: 75, y: 25 });
    expect(token('alrik').position()).toEqual({ x: 125, y: 25 });
  });

  it('shows initials without a portrait and dims inactive combatants', () => {
    const texts = token('ork-2').find('Text').map(node => (node as Konva.Text).text());
    expect(texts).toEqual(['OH', 'Ork Hauptmann']);
    expect(token('ork-2').opacity()).toBeLessThan(1);
    expect(token('ork-1').opacity()).toBe(1);
  });

  it('shows players only first names unless they may see more', () => {
    user$.next({ id: 'player', isGM: false });
    const label = () => token('alrik').find('Text').map(node => (node as Konva.Text).text()).pop();
    expect(label()).toBe('Alrik');
    user$.next({ id: 'player', isGM: false, viewName: true });
    expect(label()).toBe('Alrik von Gareth');
  });

  it('lets only the GM drag tokens', () => {
    expect(token('ork-1').draggable()).toBeTrue();
    user$.next({ id: 'player', isGM: false });
    expect(token('ork-1').draggable()).toBeFalse();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#map-grid-size')).toBeNull();
  });

  it('snaps a dropped token to the grid and stores it', () => {
    const ork = token('ork-1');
    ork.fire('dragstart');
    ork.position({ x: 212, y: 140 });
    ork.fire('dragend');
    expect(ork.position()).toEqual({ x: 225, y: 125 });
    expect(maps.moveToken).toHaveBeenCalledWith('ork-1', { x: 225, y: 125 });
  });

  it('drops freely without a grid, but not off the map', () => {
    map$.next({ ...map$.value!, grid: { ...map$.value!.grid, enabled: false } });
    const ork = token('ork-1');
    ork.fire('dragstart');
    ork.position({ x: 1212, y: 140 });
    ork.fire('dragend');
    expect(maps.moveToken).toHaveBeenCalledWith('ork-1', { x: 1000, y: 140 });
  });

  it('moves tokens when another device moves them', async () => {
    tokens$.next(new Map([['placed', { x: 25, y: 575 }]]));
    // A short animation on requestAnimationFrame, which fakeAsync does not drive.
    await new Promise(resolve => setTimeout(resolve, 400));
    expect(token('placed').position()).toEqual({ x: 25, y: 575 });
  });

  it('removes the token of a removed combatant', () => {
    component.combatants = component.combatants!.filter(c => c.id !== 'ork-1');
    component.ngOnChanges();
    expect(token('ork-1')).toBeUndefined();
  });

  it('draws the grid, and none when it is off', () => {
    const lines = () => (component as any).mapLayer.find('Line').length;
    expect(lines()).toBe(21 + 13);
    map$.next({ ...map$.value!, grid: { ...map$.value!.grid, enabled: false } });
    expect(lines()).toBe(0);
  });

  it('previews grid edits at once and saves them once typing stops', fakeAsync(() => {
    component.editGrid({ size: 40 });
    component.editGrid({ size: 45 });
    expect(token('ork-1').position()).toEqual({ x: 22.5, y: 22.5 });
    tick(400);
    expect(maps.updateGrid).toHaveBeenCalledTimes(1);
    expect(maps.updateGrid).toHaveBeenCalledWith(jasmine.objectContaining({ size: 45 }));
    tick();
  }));

  it('ignores impossible cell sizes', () => {
    component.editGrid({ size: 3 });
    component.editGrid({ size: NaN });
    expect(component.gridDraft.size).toBe(50);
  });

  it('refuses non-raster uploads before sending them', async () => {
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' })] });
    await component.upload({ target: input } as any);
    expect(maps.uploadImage).not.toHaveBeenCalled();
    expect(component.message).toContain('PNG');
  });

  it('fits the whole map into view', () => {
    const view = stage();
    component.zoom(3);
    component.fit();
    const right = view.x() + 1000 * view.scaleX();
    expect(view.x()).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(view.width());
  });
});
