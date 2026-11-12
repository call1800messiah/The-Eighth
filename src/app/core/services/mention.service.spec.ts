import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { MentionService, MentionTarget } from './mention.service';
import { ApiService } from './api.service';
import { RealtimeService } from './supabase-realtime.service';
import { createMockQueryBuilder } from '../../testing/supabase-test-helpers';

const PERSON = '11111111-1111-4111-8111-111111111111';
const HIDDEN = '22222222-2222-4222-8222-222222222222';
const DELETED = '33333333-3333-4333-8333-333333333333';
const QUEST = '44444444-4444-4444-8444-444444444444';
const NOTE = '55555555-5555-4555-8555-555555555555';
const INFO = '66666666-6666-4666-8666-666666666666';

describe('MentionService', () => {
  let service: MentionService;
  let api: any;
  let realtime: any;
  let tables: Record<string, any[]>;

  beforeEach(() => {
    tables = {
      people: [{ id: PERSON, name: 'Alrik' }],
      places: [{ id: 'p1', name: 'Gareth' }],
      quests: [{ id: QUEST, name: 'Der Schatz' }],
      notes: [{ id: NOTE, title: null, content: '**Notiz** über Alrik', category: 'Plot' }],
      mentions: [],
    };

    realtime = {
      watch: jasmine.createSpy('watch').and.callFake((table: string) => of(tables[table])),
    };

    api = {
      rpc: jasmine.createSpy('rpc').and.returnValue(Promise.resolve({
        data: [{ entity_type: 'person', entity_id: HIDDEN }],
        error: null,
      })),
      from: jasmine.createSpy('from').and.callFake((table: string) => createMockQueryBuilder({
        data: table === 'info_boxes' ? [{ id: INFO, entity_type: 'person', entity_id: PERSON }] : [],
      })),
    };

    TestBed.configureTestingModule({
      providers: [
        MentionService,
        { provide: ApiService, useValue: api },
        { provide: RealtimeService, useValue: realtime },
      ],
    });
    service = TestBed.inject(MentionService);
  });

  it('lists every mentionable entity with a display name, sorted', async () => {
    const targets = await firstValueFrom(service.getTargets());
    expect(targets.map(t => [t.entityType, t.name])).toEqual([
      ['person', 'Alrik'],
      ['quest', 'Der Schatz'],
      ['place', 'Gareth'],
      ['note', 'Notiz über Alrik'],
    ]);
  });

  it('fetches only the name columns', () => {
    service.getTargets().subscribe();
    const select = jasmine.createSpy('select');
    const queryFn = realtime.watch.calls.all().find((call: any) => call.args[0] === 'people').args[1];
    queryFn({ select });
    expect(select).toHaveBeenCalledWith('id, name');
  });

  it('ranks names starting with the query first', () => {
    const targets: MentionTarget[] = [
      { entityType: 'note', entityId: '1', name: 'Notiz über Alrik' },
      { entityType: 'person', entityId: '2', name: 'Alrik' },
      { entityType: 'place', entityId: '3', name: 'Gareth' },
    ];
    expect(service.search(targets, 'alr').map(t => t.entityId)).toEqual(['2', '1']);
    expect(service.search(targets, '', 2).length).toBe(2);
  });

  it('searches note content too', () => {
    const targets: MentionTarget[] = [
      { entityType: 'note', entityId: '1', name: 'Plotnotiz', searchText: 'Drache im Keller' },
    ];
    expect(service.search(targets, 'drache').length).toBe(1);
  });

  it('resolves visible, hidden and deleted mentions', async () => {
    const resolve = await firstValueFrom(service.resolve([
      { entityType: 'person', entityId: PERSON },
      { entityType: 'person', entityId: HIDDEN },
      { entityType: 'person', entityId: DELETED },
    ]));
    expect(resolve('person', PERSON)).toEqual({ state: 'visible', name: 'Alrik' });
    expect(resolve('person', HIDDEN)).toEqual({ state: 'hidden' });
    expect(resolve('person', DELETED)).toEqual({ state: 'deleted' });
    expect(api.rpc).toHaveBeenCalledWith('mention_targets_exist', {
      p_refs: [
        { entity_type: 'person', entity_id: HIDDEN },
        { entity_type: 'person', entity_id: DELETED },
      ],
    });
  });

  it('does not ask the database when every mention is visible', async () => {
    await firstValueFrom(service.resolve([{ entityType: 'person', entityId: PERSON }]));
    expect(api.rpc).not.toHaveBeenCalled();
  });

  it('treats mentions as hidden, not deleted, when the check fails', async () => {
    api.rpc.and.returnValue(Promise.resolve({ data: null, error: { message: 'boom' } }));
    spyOn(console, 'error');
    const resolve = await firstValueFrom(service.resolve([{ entityType: 'person', entityId: DELETED }]));
    expect(resolve('person', DELETED)).toEqual({ state: 'hidden' });
  });

  it('describes backlinks once per source text', async () => {
    tables['mentions'] = [
      { source_type: 'quest', source_id: QUEST },
      { source_type: 'quest', source_id: QUEST },
      { source_type: 'info_box', source_id: INFO },
      { source_type: 'note', source_id: NOTE },
    ];
    const backlinks = await firstValueFrom(service.getBacklinks('place', 'p1'));
    expect(backlinks.map(b => [b.kind, b.label, b.route])).toEqual([
      ['Info', 'Alrik', { path: `/people/${PERSON}` }],
      ['Notiz', 'Notiz über Alrik', { path: '/notes', queryParams: { note: NOTE } }],
      ['Quest', 'Der Schatz', { path: `/quests/${QUEST}` }],
    ]);
  });

  it('watches backlinks of one entity only', () => {
    service.getBacklinks('place', 'p1').subscribe();
    const call = realtime.watch.calls.all().find((c: any) => c.args[0] === 'mentions');
    const query = { select: jasmine.createSpy('select'), eq: jasmine.createSpy('eq') };
    query.select.and.returnValue(query);
    query.eq.and.returnValue(query);
    call.args[1](query);
    expect(query.eq).toHaveBeenCalledWith('entity_type', 'place');
    expect(query.eq).toHaveBeenCalledWith('entity_id', 'p1');
  });
});
