import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';
import { Project } from '../models/project';
import { UtilService } from '../../core/services/util.service';
import { ProjectRequirement } from '../models/project-requirement';
import { ProjectMilestone } from '../models/project-milestone';
import { RealtimeService } from '../../core/services/supabase-realtime.service';



@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private api = inject(ApiService);
  private realtime = inject(RealtimeService);

  static readonly collection = 'projects';
  private projects$: BehaviorSubject<Project[]>;



  getProjects(): Observable<Project[]> {
    if (!this.projects$) {
      this.projects$ = new BehaviorSubject<Project[]>([]);
      this.realtime.watch<any>(
        'projects',
        // Without an explicit order Postgres returns rows as they lie on disk,
        // and an UPDATE writes a new row version, so an edited project would
        // jump to the end of the list.
        query => query
          .select('*, project_milestones(*), project_requirements(*)')
          .order('created_at', { ascending: true })
          .order('id', { ascending: true }),
        'projects',
        ['project_milestones', 'project_requirements'],
      ).pipe(
        map(rows => this.transformProjects(rows))
      ).subscribe((projects: Project[]) => {
        this.projects$.next(projects);
      });
    }
    return this.projects$;
  }


  /**
   * Creates (no id) or updates a project together with its milestones and
   * requirements. save_project() (migration 017) does it in one transaction, so
   * a refused or failed save changes nothing, and saves of the same project
   * run one after the other. A list left undefined is not touched.
   */
  async store(project: Partial<Project>, projectId?: string): Promise<{ success: boolean; id?: string }> {
    const { data, error } = await this.api.rpc('save_project', {
      p_id: projectId ?? null,
      p_project: { name: project.name, benefit: project.benefit, interval: project.interval },
      p_milestones: project.milestones?.map((m) => ({
        description: m.description,
        required_points: m.requiredPoints,
      })) ?? null,
      p_requirements: project.requirements?.map((r) => ({
        skill: r.skill,
        current_points: r.currentPoints,
        required_points: r.requiredPoints,
        threshold: r.threshold,
      })) ?? null,
    });
    if (error) {
      console.error(error);
      return { success: false };
    }
    return { success: true, id: data };
  }


  private transformProjects(rows: any[]): Project[] {
    return rows.map(row => {
      const milestones: ProjectMilestone[] = (row.project_milestones || [])
        .sort(UtilService.orderByRequiredPoints)
        .map((m: any) => ({
          id: m.id,
          description: m.description,
          requiredPoints: m.required_points,
        }));

      const requirements: ProjectRequirement[] = (row.project_requirements || [])
        .sort(UtilService.orderBySkill)
        .map((r: any) => ({
          id: r.id,
          skill: r.skill,
          currentPoints: r.current_points,
          requiredPoints: r.required_points,
          threshold: r.threshold,
        }));

      return {
        access: [],
        benefit: row.benefit,
        collection: ProjectService.collection,
        id: row.id,
        interval: row.interval,
        milestones,
        name: row.name,
        owner: row.owner_id,
        requirements,
      };
    });
  }
}
