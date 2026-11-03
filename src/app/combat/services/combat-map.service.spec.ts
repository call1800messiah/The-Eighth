import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { CombatMapService } from './combat-map.service';
import { CombatService } from './combat.service';
import { ApiService } from '../../core/services/api.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import { StorageService } from '../../core/services/storage.service';
import { createMockQueryBuilder } from '../../testing/supabase-test-helpers';
import { BLANK_MAP } from '../map/geometry';

describe('CombatMapService', () => {
  let service: CombatMapService;
  let api: any;
  let realtime: any;
  let storage: any;
  let combat: any;
  let builders: Record<string, any>;
  let rows: Record<string, any[]>;

  beforeEach(() => {
    rows = {
      combat_maps: [{
        id: 'm1', image: 'maps/m1/karte-x.png', image_width: 2000, image_height: 1400,
        grid_enabled: true, grid_size: 50, grid_offset_x: 5, grid_offset_y: 7,
      }],
      combat_tokens: [{ combatant_id: 'c1', x: 125, y: 75 }],
    };
    builders = {};
    realtime = { watch: jasmine.createSpy('watch').and.callFake((table: string) => of(rows[table])) };
    api = {
      from: jasmine.createSpy('from').and.callFake((table: string) => {
        builders[table] ??= createMockQueryBuilder({ data: { id: 'm1', image: 'maps/m1/old-a.png' } });
        return builders[table];
      }),
    };
    storage = {
      getDownloadURL: (path: string) => of(`https://example.com/${path}`),
      uploadFile: jasmine.createSpy('uploadFile').and.returnValue(Promise.resolve('maps/m1/neu-b.png')),
      delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
    };
    combat = { ensureActiveSession: jasmine.createSpy('ensureActiveSession').and.returnValue(Promise.resolve('s1')) };
    TestBed.configureTestingModule({
      providers: [
        CombatMapService,
        { provide: ApiService, useValue: api },
        { provide: RealtimeService, useValue: realtime },
        { provide: StorageService, useValue: storage },
        { provide: CombatService, useValue: combat },
      ],
    });
    service = TestBed.inject(CombatMapService);
  });

  it('reads the running session\'s map with its image and grid', async () => {
    const map = await firstValueFrom(service.getMap());
    expect(map).toEqual({
      id: 'm1',
      imageUrl: 'https://example.com/maps/m1/karte-x.png',
      imagePath: 'maps/m1/karte-x.png',
      size: { width: 2000, height: 1400 },
      grid: { enabled: true, size: 50, offsetX: 5, offsetY: 7 },
    });
    const call = realtime.watch.calls.argsFor(0);
    expect(call[3]).toEqual(['combat_sessions']);
    const query = { select: jasmine.createSpy('select'), eq: jasmine.createSpy('eq') };
    query.select.and.returnValue(query);
    call[1](query);
    expect(query.eq).toHaveBeenCalledWith('combat_sessions.is_active', true);
  });

  it('uses the blank area without an image, and null without a map', async () => {
    rows['combat_maps'] = [{ id: 'm1', image: null, grid_enabled: false, grid_size: 70, grid_offset_x: 0, grid_offset_y: 0 }];
    expect((await firstValueFrom(service.getMap()))!.size).toEqual(BLANK_MAP);
  });

  it('is null when no map was set up', async () => {
    rows['combat_maps'] = [];
    expect(await firstValueFrom(service.getMap())).toBeNull();
  });

  it('maps token positions by combatant', async () => {
    const positions = await firstValueFrom(service.getTokenPositions());
    expect(positions.get('c1')).toEqual({ x: 125, y: 75 });
  });

  it('stores a token position', async () => {
    expect(await service.moveToken('c1', { x: 10.04, y: 20 })).toBeTrue();
    expect(builders['combat_tokens'].upsert).toHaveBeenCalledWith(
      jasmine.objectContaining({ combatant_id: 'c1', x: 10, y: 20 }), { onConflict: 'combatant_id' });
  });

  it('creates the map row on the first grid change and clamps the cell size', async () => {
    await service.updateGrid({ size: 5000, enabled: false });
    const maps = builders['combat_maps'];
    expect(maps.upsert).toHaveBeenCalledWith({ combat_session_id: 's1' }, { onConflict: 'combat_session_id', ignoreDuplicates: true });
    expect(maps.update).toHaveBeenCalledWith(jasmine.objectContaining({ grid_size: 500, grid_enabled: false }));
  });

  it('does nothing without a session (players cannot create one)', async () => {
    combat.ensureActiveSession.and.returnValue(Promise.resolve(null));
    expect(await service.updateGrid({ size: 60 })).toBeFalse();
    expect(api.from).not.toHaveBeenCalled();
  });

  it('uploads into the map folder, records the size and removes the old image', async () => {
    spyOn(service, 'readImageSize').and.returnValue(Promise.resolve({ width: 3000, height: 2000 }));
    const file = new File(['x'], 'Karte.png', { type: 'image/png' });
    expect(await service.uploadImage(file)).toBeTrue();
    expect(storage.uploadFile).toHaveBeenCalledWith('Karte.png', file, 'maps/m1');
    expect(builders['combat_maps'].update).toHaveBeenCalledWith(jasmine.objectContaining({
      image: 'maps/m1/neu-b.png', image_width: 3000, image_height: 2000,
    }));
    expect(storage.delete).toHaveBeenCalledWith('maps', 'm1/old-a.png');
  });

  it('refuses SVG and other non-raster files', async () => {
    expect(await service.uploadImage(new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }))).toBeFalse();
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('removes the uploaded file again when the row cannot be updated', async () => {
    spyOn(console, 'error');
    spyOn(service, 'readImageSize').and.returnValue(Promise.resolve({ width: 10, height: 10 }));
    builders['combat_maps'] = createMockQueryBuilder({ data: { id: 'm1', image: null } });
    const update = builders['combat_maps'].update;
    update.and.callFake(() => createMockQueryBuilder({ error: { message: 'denied' } }));
    expect(await service.uploadImage(new File(['x'], 'k.png', { type: 'image/png' }))).toBeFalse();
    expect(storage.delete).toHaveBeenCalledWith('maps', 'm1/neu-b.png');
  });
});
