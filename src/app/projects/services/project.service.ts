import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';
import { Project } from '../models/project';
import { DataService } from '../../core/services/data.service';
import { UtilService } from '../../core/services/util.service';
import { ProjectRequirement } from '../models/project-requirement';
import { ProjectMilestone } from '../models/project-milestone';
import { RealtimeService } from '../../core/services/supabase-realtime.service';



@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  static readonly collection = 'projects';
  private projects$: BehaviorSubject<Project[]>;

  constructor(
    private api: ApiService,
    private data: DataService,
    private realtime: RealtimeService,
  ) {}



  getProjects(): Observable<Project[]> {
    if (!this.projects$) {
      this.projects$ = new BehaviorSubject<Project[]>([]);
      this.realtime.watch<any>(
        'projects',
        query => query.select('*, project_milestones(*), project_requirements(*)'),
        'projects',
      ).pipe(
        map(rows => this.transformProjects(rows))
      ).subscribe((projects: Project[]) => {
        this.projects$.next(projects);
      });
    }
    return this.projects$;
  }


  async store(project: Partial<Project>, projectId?: string): Promise<{ success: boolean; id?: string }> {
    const milestones = project.milestones;
    const requirements = project.requirements;
    const cleanedProject: any = { ...project };
    delete cleanedProject.milestones;
    delete cleanedProject.requirements;

    // Store the project itself
    const result = await this.data.store(cleanedProject, ProjectService.collection, projectId);
    if (!result.success) return result;

    const id = projectId || result.id;

    // Sync milestones if provided
    if (milestones !== undefined) {
      await this.syncMilestones(id, milestones);
    }

    // Sync requirements if provided
    if (requirements !== undefined) {
      await this.syncRequirements(id, requirements);
    }

    return result;
  }



  private async syncMilestones(projectId: string, milestones: ProjectMilestone[]) {
    // Delete existing milestones
    await this.api.from('project_milestones' as any)
      .delete()
      .eq('project_id', projectId);

    // Insert new ones
    if (milestones.length > 0) {
      const rows = milestones.map((m, i) => ({
        project_id: projectId,
        description: m.description,
        required_points: m.requiredPoints,
        sort_order: i,
      }));
      await this.api.from('project_milestones' as any).insert(rows);
    }
  }


  private async syncRequirements(projectId: string, requirements: ProjectRequirement[]) {
    // Delete existing requirements
    await this.api.from('project_requirements' as any)
      .delete()
      .eq('project_id', projectId);

    // Insert new ones
    if (requirements.length > 0) {
      const rows = requirements.map((r, i) => ({
        project_id: projectId,
        skill: r.skill,
        current_points: r.currentPoints,
        required_points: r.requiredPoints,
        threshold: r.threshold,
        sort_order: i,
      }));
      await this.api.from('project_requirements' as any).insert(rows);
    }
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
