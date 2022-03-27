import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import firebase from 'firebase';
import FieldValue = firebase.firestore.FieldValue;

import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Project } from '../models/project';
import { AuthUser } from '../../auth/models/auth-user';
import { DataService } from '../../core/services/data.service';
import { UtilService } from '../../core/services/util.service';
import { ProjectRequirement } from '../models/project-requirement';
import { ProjectMilestone } from '../models/project-milestone';
import { ProjectDB } from '../models/project.db';



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
      this.api.getDataFromCollection(
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


  store(project: Partial<Project>, projectId?: string): Promise<boolean> {
    return this.data.store(this.serializeProject(project, projectId), ProjectService.collection, projectId);
  }



  private serializeProject(project: Partial<Project>, projectID?: string): ProjectDB {
    const mDesc: Record<string, string | FieldValue> = {};
    const mReq: Record<string, number | FieldValue> = {};
    const rCur: Record<string, number | FieldValue> = {};
    const rReq: Record<string, number | FieldValue> = {};
    const rSkill: Record<string, string | FieldValue> = {};

    Object.entries(project).forEach(([key, value]) => {
      const split = key.split('-');
      if (split[0] === 'mile' && split[2] === 'req') {
        mReq[split[1]] = value as unknown as number;
      }
      if (split[0] === 'mile' && split[2] === 'desc') {
        mDesc[split[1]] = value as unknown as string;
      }
      if (split[0] === 'req' && split[2] === 'req') {
        rReq[split[1]] = value as unknown as number;
      }
      if (split[0] === 'req' && split[2] === 'cur') {
        rCur[split[1]] = value as unknown as number;
      }
      if (split[0] === 'req' && split[2] === 'skill') {
        rSkill[split[1]] = value as unknown as string;
      }
    });

    if (projectID) {
      this.projects$.pipe(
        take(1),
        map((projects) => projects.find((p) => p.id === projectID))
      ).subscribe((currentProject) => {
        if (currentProject) {
          currentProject.milestones.forEach((milestone) => {
            if (!mDesc[milestone.id]) {
              mDesc[milestone.id] = FieldValue.delete();
              mReq[milestone.id] = FieldValue.delete();
            }
          });
          currentProject.requirements.forEach((requirement) => {
            if (!rSkill[requirement.id]) {
              rSkill[requirement.id] = FieldValue.delete();
              rReq[requirement.id] = FieldValue.delete();
              rCur[requirement.id] = FieldValue.delete();
            }
          });
        }
      });
    }

    return {
      benefit: project.benefit,
      interval: project.interval,
      isPrivate: project.isPrivate,
      mDesc,
      mReq,
      name: project.name,
      owner: project.owner,
      rCur,
      rReq,
      rSkill
    };
  }


  private transformProjects(projects: any[]): Project[] {
    return projects.reduce((all, entry) => {
      const projectData = entry.payload.doc.data();
      const milestones: ProjectMilestone[] = !projectData.mDesc || !projectData.mReq
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
      }, []).sort(UtilService.orderByRequiredPoints);

      const requirements: ProjectRequirement[] = !projectData.rSkill || !projectData.rCur || !projectData.rReq
        ? []
        : Object.entries(projectData.rSkill).reduce((allR, [id, skill]) => {
        if (projectData.rCur[id] !== undefined && projectData.rReq[id]) {
          allR.push({
            id,
            skill,
            currentPoints: projectData.rCur[id],
            requiredPoints: projectData.rReq[id],
          });
        }
        return allR;
      }, []).sort(UtilService.orderBySkill);

      const project: Project = {
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
