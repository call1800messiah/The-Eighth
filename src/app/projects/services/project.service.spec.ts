import { TestBed } from '@angular/core/testing';

import { ProjectService } from './project.service';
import { ApiService } from '../../core/services/api.service';
import { DataService } from '../../core/services/data.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import {
  createMockApiService,
  createMockDataService,
  createMockQueryBuilder,
  createMockRealtimeService,
} from '../../testing/supabase-test-helpers';

describe('ProjectService', () => {
  let service: ProjectService;
  let mockApi: ReturnType<typeof createMockApiService>;
  let mockData: ReturnType<typeof createMockDataService>;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;

  beforeEach(() => {
    mockApi = createMockApiService();
    mockData = createMockDataService();
    mockRealtime = createMockRealtimeService();

    TestBed.configureTestingModule({
      providers: [
        ProjectService,
        { provide: ApiService, useValue: mockApi },
        { provide: DataService, useValue: mockData },
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
    it('should strip milestones and requirements before storing project', async () => {
      await service.store({
        name: 'Ship',
        milestones: [{ description: 'M1', requiredPoints: 10 }],
        requirements: [{ skill: 'S1', currentPoints: 0, requiredPoints: 10, threshold: 8 }],
      } as any, 'proj1');

      const storedItem = mockData.store.calls.mostRecent().args[0];
      expect(storedItem.milestones).toBeUndefined();
      expect(storedItem.requirements).toBeUndefined();
      expect(storedItem.name).toBe('Ship');
    });

    it('should sync milestones after storing project', async () => {
      await service.store({
        name: 'Ship',
        milestones: [{ description: 'M1', requiredPoints: 10 }],
      } as any, 'proj1');

      // Should delete existing then insert new
      expect(mockApi.from).toHaveBeenCalledWith('project_milestones');
    });

    it('should sync requirements after storing project', async () => {
      await service.store({
        name: 'Ship',
        requirements: [{ skill: 'Carpentry', currentPoints: 0, requiredPoints: 20, threshold: 12 }],
      } as any, 'proj1');

      expect(mockApi.from).toHaveBeenCalledWith('project_requirements');
    });

    describe('syncing rows', () => {
      // One builder per table; `fail` names the operation that returns an error.
      function tableBuilder(fail?: 'insert' | 'delete', insertedIds: string[] = ['new1']) {
        const builder = createMockQueryBuilder();
        builder.then.and.callFake((resolve: any) => {
          const op = builder.delete.calls.any() ? 'delete' : 'insert';
          const error = op === fail ? { message: `${op} failed` } : null;
          const data = op === 'insert' && !error ? insertedIds.map((id) => ({ id })) : null;
          return Promise.resolve({ data, error }).then(resolve);
        });
        return builder;
      }

      let builders: Record<string, any>;

      function useBuilders(milestones: any, requirements: any) {
        builders = { project_milestones: milestones, project_requirements: requirements };
        mockApi.from.and.callFake((table: string) => builders[table] ?? mockApi._queryBuilder);
      }

      const project = {
        name: 'Ship',
        milestones: [{ id: 'old1', description: 'M1', requiredPoints: 10 }],
        requirements: [{ id: 'old2', skill: 'S1', currentPoints: 1, requiredPoints: 10, threshold: 8 }],
      } as any;

      it('inserts the new rows before deleting the other rows of the project', async () => {
        useBuilders(tableBuilder(undefined, ['new1', 'new2']), tableBuilder());

        const result = await service.store(project, 'proj1');

        const milestones = builders.project_milestones;
        expect(result.success).toBeTrue();
        expect(milestones.insert).toHaveBeenCalledWith([
          { project_id: 'proj1', description: 'M1', required_points: 10, sort_order: 0 },
        ]);
        expect(milestones.insert).toHaveBeenCalledBefore(milestones.delete);
        expect(milestones.eq).toHaveBeenCalledWith('project_id', 'proj1');
        expect(milestones.not).toHaveBeenCalledWith('id', 'in', '(new1,new2)');
      });

      it('deletes every row of the project when the list is empty', async () => {
        useBuilders(tableBuilder(), tableBuilder());

        const result = await service.store({ ...project, milestones: [] }, 'proj1');

        const milestones = builders.project_milestones;
        expect(result.success).toBeTrue();
        expect(milestones.insert).not.toHaveBeenCalled();
        expect(milestones.delete).toHaveBeenCalled();
        expect(milestones.not).not.toHaveBeenCalled();
      });

      it('keeps the old rows and reports failure when the insert fails', async () => {
        useBuilders(tableBuilder('insert'), tableBuilder());

        const result = await service.store(project, 'proj1');

        expect(result.success).toBeFalse();
        expect(builders.project_milestones.delete).not.toHaveBeenCalled();
        expect(builders.project_requirements.insert).not.toHaveBeenCalled();
      });

      it('reports failure when deleting the old rows fails', async () => {
        useBuilders(tableBuilder(), tableBuilder('delete'));

        const result = await service.store(project, 'proj1');

        expect(result.success).toBeFalse();
      });

      it('does not sync rows when storing the project fails', async () => {
        useBuilders(tableBuilder(), tableBuilder());
        mockData.store.and.resolveTo({ success: false });

        const result = await service.store(project, 'proj1');

        expect(result.success).toBeFalse();
        expect(builders.project_milestones.insert).not.toHaveBeenCalled();
      });
    });
  });
});
