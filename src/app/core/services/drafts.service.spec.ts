import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { DraftsService } from './drafts.service';
import { ApiService } from './api.service';
import { RealtimeService } from './supabase-realtime.service';
import { createMockQueryBuilder } from '../../testing/supabase-test-helpers';

describe('DraftsService', () => {
  let service: DraftsService;
  let api: any;
  let realtime: any;
  let tables: Record<string, any[]>;

  beforeEach(() => {
    tables = {
      people: [{ id: 'p1', name: 'Hesindiane', created_at: '2026-11-03T10:00:00Z' }],
      places: [{ id: 'l1', name: 'Silbersee', created_at: '2026-11-03T12:00:00Z' }],
      quests: [],
      mcp_grants: [{
        id: 'g1', client_name: 'Claude', created_at: '2026-11-01T00:00:00Z',
        last_used_at: null, revoked_at: null, approver: { name: 'Gordon' },
      }],
    };
    realtime = { watch: jasmine.createSpy('watch').and.callFake((table: string) => of(tables[table])) };
    api = {
      rpc: jasmine.createSpy('rpc').and.returnValue(Promise.resolve({ data: null, error: null })),
      from: jasmine.createSpy('from').and.returnValue(createMockQueryBuilder()),
    };
    TestBed.configureTestingModule({
      providers: [
        DraftsService,
        { provide: ApiService, useValue: api },
        { provide: RealtimeService, useValue: realtime },
      ],
    });
    service = TestBed.inject(DraftsService);
  });

  it('lists drafts of every kind, newest first', async () => {
    const drafts = await firstValueFrom(service.getDrafts());
    expect(drafts.map(d => [d.type, d.name])).toEqual([['place', 'Silbersee'], ['person', 'Hesindiane']]);
    expect(drafts[1].route).toEqual({ path: '/people/p1' });
  });

  it('asks only for drafts', () => {
    service.getDrafts().subscribe();
    const query = { select: jasmine.createSpy('select'), eq: jasmine.createSpy('eq') };
    query.select.and.returnValue(query);
    realtime.watch.calls.argsFor(0)[1](query);
    expect(query.eq).toHaveBeenCalledWith('status', 'draft');
  });

  it('lists connections with who approved them', async () => {
    const [connection] = await firstValueFrom(service.getConnections());
    expect(connection.clientName).toBe('Claude');
    expect(connection.approvedBy).toBe('Gordon');
    expect(connection.revokedAt).toBeNull();
  });

  it('publishes and discards through the database functions', async () => {
    expect(await service.publish('person', 'p1')).toBeTrue();
    expect(api.rpc).toHaveBeenCalledWith('publish_draft', { p_entity_type: 'person', p_entity_id: 'p1' });
    expect(await service.discard('place', 'l1')).toBeTrue();
    expect(api.rpc).toHaveBeenCalledWith('discard_draft', { p_entity_type: 'place', p_entity_id: 'l1' });
  });

  it('reports a failed publish', async () => {
    spyOn(console, 'error');
    api.rpc.and.returnValue(Promise.resolve({ data: null, error: { message: 'nope' } }));
    expect(await service.publish('person', 'p1')).toBeFalse();
  });

  it('revokes a connection by setting revoked_at', async () => {
    const builder = createMockQueryBuilder();
    api.from.and.returnValue(builder);
    expect(await service.revoke('g1')).toBeTrue();
    expect(api.from).toHaveBeenCalledWith('mcp_grants');
    expect(builder.update).toHaveBeenCalledWith({ revoked_at: jasmine.any(String) });
    expect(builder.eq).toHaveBeenCalledWith('id', 'g1');
  });
});
