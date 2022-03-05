import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Project } from '../models/project';
import { AuthUser } from '../../auth/models/auth-user';
import { DataService } from '../../core/services/data.service';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  static readonly collection = 'projects';
  private projects$: BehaviorSubject<Project[]>;
  private user: AuthUser;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private data: DataService,
  ) {
    this.user = this.auth.user;
  }

  getProjects(): Observable<Project[]> {
    if (!this.projects$) {
      this.projects$ = new BehaviorSubject<Project[]>([]);
      this.api.getDataFromCollectionWhere(
        ProjectService.collection,
        (ref) => ref.
          where('access', 'array-contains', this.user.id)
      ).pipe(
        map(this.transformProjects.bind(this))
      ).subscribe((projects: Project[]) => {
        this.projects$.next(projects);
      });
    }
    return this.projects$;
  }

  store(project: Partial<Project>, projectId?: string) {
    return this.data.store(project, ProjectService.collection, projectId);
  }

  private transformProjects(projects: any[]): Project[] {
    return projects.reduce((all, entry) => {
      const projectData = entry.payload.doc.data();
      const milestones = !projectData.mDesc || !projectData.mReq
        ? []
        : Object.entries(projectData.mDesc).reduce((allM, [id, description]) => {
        if (projectData.mReq[id]) {
          allM.push({
            id,
            description,
            requiredPoints: projectData.mReq[id]
          });
        }
        return allM;
      }, []);

      const requirements = !projectData.rSkill || !projectData.rCur || !projectData.rReq
        ? []
        : Object.entries(projectData.rSkill).reduce((allR, [id, skill]) => {
        if (projectData.rCur[id] && projectData.rReq[id]) {
          allR.push({
            id,
            skill,
            currentPoints: projectData.rCur[id],
            requiredPoints: projectData.rReq[id],
          });
        }
        return allR;
      }, []);

      const project = {
        id: entry.payload.doc.id,
        benefit: projectData.benefit,
        interval: projectData.interval,
        isPrivate: projectData.isPrivate,
        milestones,
        name: projectData.name,
        owner: projectData.owner,
        requirements,
      };
      all.push(project);
      return all;
    }, []);
  }
}
