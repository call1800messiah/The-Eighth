import { ProjectRequirement } from './project-requirement';
import { ProjectMilestone } from './project-milestone';

export interface Project {
  id: string;
  benefit: string;
  interval: string;
  isPrivate: boolean;
  milestones: ProjectMilestone[];
  name: string;
  owner: string;
  requirements: ProjectRequirement[];
}
