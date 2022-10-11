import { Component, Input, OnInit } from '@angular/core';
import { faAward, faStar } from '@fortawesome/free-solid-svg-icons';

import { Project } from '../../models/project';
import { PopoverService } from '../../../core/services/popover.service';
import { EditProjectComponent } from '../edit-project/edit-project.component';
import { ProjectRequirement } from '../../models/project-requirement';



@Component({
  selector: 'app-project-summary',
  templateUrl: './project-summary.component.html',
  styleUrls: ['./project-summary.component.scss']
})
export class ProjectSummaryComponent implements OnInit {
  @Input() project: Project;
  faAward = faAward;
  faStar = faStar;
  percentage: number;
  currentPoints = 0;
  requiredPoints = 0;
  markers: number[] = [];

  constructor(
    private popover: PopoverService,
  ) { }

  ngOnInit(): void {
    const points: { current: number, required: number } = this.project.requirements.reduce((all, requirement) => {
      all.required += requirement.requiredPoints;
      all.current += requirement.currentPoints;
      return all;
    }, { current: 0, required: 0 });
    this.currentPoints = points.current;
    this.requiredPoints = points.required;
    this.markers = this.project.milestones.reduce((all, milestone) => {
      all.push(milestone.requiredPoints / this.requiredPoints * 100);
      return all;
    }, []);
    this.percentage = this.requiredPoints > 0 ? Math.min(this.currentPoints / this.requiredPoints * 100, 100) : 0;
  }



  editProject(project: Project) {
    this.popover.showPopover('Projekt bearbeiten', EditProjectComponent, project);
  }


  getRequirementString(requirement: ProjectRequirement): string {
    if (requirement.requiredPoints === 0) {
      return `${requirement.skill}: TaW ${requirement.threshold}`;
    }

    const prefix = requirement.threshold > 0 ? '+' : '';
    const threshold = requirement.threshold !== 0 ? ` (${prefix}${requirement.threshold})` : '';
    return `${requirement.skill}${threshold}: ${requirement.currentPoints} / ${requirement.requiredPoints} TaP`;
  }
}
