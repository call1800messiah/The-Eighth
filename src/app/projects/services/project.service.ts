import { Injectable, inject } from '@angular/core';
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
  private api = inject(ApiService);
  private data = inject(DataService);
  private realtime = inject(RealtimeService);

  static readonly collection = 'projects';
  private projects$: BehaviorSubject<Project[]>;



  getProjects(): Observable<Project[]> {
    if (!this.projects$) {
      this.projects$ = new BehaviorSubject<Project[]>([]);
      this.realtime.watch<any>(
        'projects',
        query => query.select('*, project_milestones(*), project_requirements(*)'),
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

    if (milestones !== undefined) {
      const rows = milestones.map((m, i) => ({
        project_id: id,
        description: m.description,
        required_points: m.requiredPoints,
        sort_order: i,
      }));
      if (!await this.replaceRows('project_milestones', id, rows)) return { success: false, id };
    }

    if (requirements !== undefined) {
      const rows = requirements.map((r, i) => ({
        project_id: id,
        skill: r.skill,
        current_points: r.currentPoints,
        required_points: r.requiredPoints,
        threshold: r.threshold,
        sort_order: i,
      }));
      if (!await this.replaceRows('project_requirements', id, rows)) return { success: false, id };
    }

    return result;
  }



  /**
   * Replaces a project's rows in a junction table. The new rows go in first and
   * only then are the others deleted, so a failed insert (a NOT NULL column, RLS)
   * leaves the old rows in place instead of losing them.
   */
  private async replaceRows(table: string, projectId: string, rows: object[]): Promise<boolean> {
    let keep: string[] = [];
    if (rows.length > 0) {
      const { data, error } = await this.api.from(table as any)
        .insert(rows)
        .select('id') as { data: { id: string }[] | null; error: any };
      if (error) {
        console.error(error);
        return false;
      }
      keep = (data ?? []).map((row) => row.id);
    }

    let query = this.api.from(table as any)
      .delete()
      .eq('project_id', projectId);
    if (keep.length > 0) {
      query = query.not('id', 'in', `(${keep.join(',')})`);
    }
    const { error } = await query;
    if (error) {
      console.error(error);
      return false;
    }
    return true;
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
