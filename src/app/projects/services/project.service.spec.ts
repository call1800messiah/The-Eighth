import { TestBed } from '@angular/core/testing';

import { ProjectService } from './project.service';
import { ApiService } from '../../core/services/api.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import {
  createMockApiService,
  createMockQueryBuilder,
  createMockRealtimeService,
} from '../../testing/supabase-test-helpers';

describe('ProjectService', () => {
  let service: ProjectService;
  let mockApi: ReturnType<typeof createMockApiService>;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;

  beforeEach(() => {
    mockApi = createMockApiService();
    mockRealtime = createMockRealtimeService();

    TestBed.configureTestingModule({
      providers: [
        ProjectService,
        { provide: ApiService, useValue: mockApi },
        { provide: RealtimeService, useValue: mockRealtime },
      ],
    });
    service = TestBed.inject(ProjectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getProjects()', () => {
    it('should call realtime.watch with nested select for milestones and requirements', () => {
      service.getProjects().subscribe();
      expect(mockRealtime.watch).toHaveBeenCalledWith(
        'projects',
        jasmine.any(Function),
        'projects',
        ['project_milestones', 'project_requirements'],
      );
    });

    it('should order projects by creation date, so an edit does not move them', () => {
      service.getProjects().subscribe();
      const queryFn = mockRealtime.watch.calls.mostRecent().args[1];
      const builder = createMockQueryBuilder();

      queryFn(builder);

      expect(builder.order.calls.allArgs()).toEqual([
        ['created_at', { ascending: true }],
        ['id', { ascending: true }],
      ]);
    });

    it('should transform project rows with milestones', (done) => {
      service.getProjects().subscribe(projects => {
        if (projects.length === 0) return;
        expect(projects[0].milestones.length).toBe(2);
        expect(projects[0].milestones[0]).toEqual(jasmine.objectContaining({
          description: 'Milestone A',
          requiredPoints: 10,
        }));
        done();
      });

      mockRealtime.emitRows('projects', [{
        id: 'proj1', name: 'Build Ship', benefit: 'A ship', interval: 'weekly',
        owner_id: 'u1',
        project_milestones: [
          { id: 'm1', description: 'Milestone A', required_points: 10 },
          { id: 'm2', description: 'Milestone B', required_points: 20 },
        ],
        project_requirements: [],
      }]);
    });

    it('should transform project rows with requirements', (done) => {
      service.getProjects().subscribe(projects => {
        if (projects.length === 0) return;
        expect(projects[0].requirements.length).toBe(1);
        expect(projects[0].requirements[0]).toEqual(jasmine.objectContaining({
          skill: 'Carpentry',
          currentPoints: 5,
          requiredPoints: 20,
          threshold: 12,
        }));
        done();
      });

      mockRealtime.emitRows('projects', [{
        id: 'proj1', name: 'Build Ship', benefit: 'A ship', interval: 'weekly',
        owner_id: 'u1',
        project_milestones: [],
        project_requirements: [
          { id: 'r1', skill: 'Carpentry', current_points: 5, required_points: 20, threshold: 12 },
        ],
      }]);
    });

    it('should set access to empty array and collection to projects', (done) => {
      service.getProjects().subscribe(projects => {
        if (projects.length === 0) return;
        expect(projects[0].access).toEqual([]);
        expect(projects[0].collection).toBe('projects');
        done();
      });

      mockRealtime.emitRows('projects', [{
        id: 'proj1', name: 'Test', benefit: '', interval: '',
        owner_id: 'u1', project_milestones: [], project_requirements: [],
      }]);
    });
  });

  describe('store()', () => {
    const project = {
      name: 'Ship',
      benefit: 'A ship',
      interval: 'weekly',
      owner: 'u1',
      access: [],
      collection: 'projects',
      milestones: [{ id: 'm1', description: 'Keel', requiredPoints: 10 }],
      requirements: [{ id: 'r1', skill: 'Carpentry', currentPoints: 2, requiredPoints: 20, threshold: 12 }],
    } as any;

    it('saves the project and both lists in one save_project call', async () => {
      mockApi.rpc.and.resolveTo({ data: 'proj1', error: null });

      const result = await service.store(project, 'proj1');

      expect(result).toEqual({ success: true, id: 'proj1' });
      expect(mockApi.rpc).toHaveBeenCalledOnceWith('save_project', {
        p_id: 'proj1',
        p_project: { name: 'Ship', benefit: 'A ship', interval: 'weekly' },
        p_milestones: [{ description: 'Keel', required_points: 10 }],
        p_requirements: [{ skill: 'Carpentry', current_points: 2, required_points: 20, threshold: 12 }],
      });
      expect(mockApi.from).not.toHaveBeenCalled();
    });

    it('creates a project when there is no id and returns the new id', async () => {
      mockApi.rpc.and.resolveTo({ data: 'new-id', error: null });

      const result = await service.store(project);

      expect(result).toEqual({ success: true, id: 'new-id' });
      expect(mockApi.rpc.calls.mostRecent().args[1].p_id).toBeNull();
    });

    it('leaves a list alone when it is not given', async () => {
      mockApi.rpc.and.resolveTo({ data: 'proj1', error: null });

      await service.store({ name: 'Ship' }, 'proj1');

      const args = mockApi.rpc.calls.mostRecent().args[1];
      expect(args.p_milestones).toBeNull();
      expect(args.p_requirements).toBeNull();
    });

    it('reports failure when the database refuses the save', async () => {
      mockApi.rpc.and.resolveTo({ data: null, error: { code: '42501', message: 'may not be changed' } });

      const result = await service.store(project, 'proj1');

      expect(result).toEqual({ success: false });
    });
  });
});
