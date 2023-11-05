import { AccessControlledItem } from '../../core/models/access-controlled-item';
import { ProjectRequirement } from './project-requirement';
import { ProjectMilestone } from './project-milestone';

export interface Project extends AccessControlledItem {
  id: string;
  benefit: string;
  interval: string;
  milestones: ProjectMilestone[];
  name: string;
  requirements: ProjectRequirement[];
}
