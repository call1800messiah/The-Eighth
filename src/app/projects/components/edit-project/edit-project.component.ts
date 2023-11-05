import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';

import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import { Project } from '../../models/project';
import { ProjectRequirement } from '../../models/project-requirement';
import { ProjectMilestone } from '../../models/project-milestone';
import { ConfigService } from '../../../core/services/config.service';



@Component({
  selector: 'app-edit-project',
  templateUrl: './edit-project.component.html',
  styleUrls: ['./edit-project.component.scss']
})
export class EditProjectComponent implements OnInit, OnDestroy {
  @Input() props: Project;
  @Output() dismissPopover = new EventEmitter<boolean>();
  faMinus = faMinus;
  faPlus = faPlus;
  milestones: ProjectMilestone[];
  // TODO: Add form validation to check for at least one requirement
  projectForm = new UntypedFormGroup({
    benefit: new UntypedFormControl(''),
    interval: new UntypedFormControl(''),
    name: new UntypedFormControl(''),
  });
  requirements: ProjectRequirement[];
  userID: string;
  private subscription = new Subscription();

  constructor(
    private projectService: ProjectService,
    private auth: AuthService,
  ) {
    this.subscription.add(
      this.auth.user$.subscribe((user) => {
        this.userID = user.id;
      })
    );
  }

  ngOnInit(): void {
    if (this.props.id) {
      const project = this.props as Project;
      this.milestones = [...this.props.milestones];
      this.requirements = [...this.props.requirements];
      this.projectForm.patchValue(project);
      this.requirements.forEach((requirement) => {
        this.projectForm.addControl(`req-${requirement.id}-skill`, new UntypedFormControl(requirement.skill));
        this.projectForm.addControl(`req-${requirement.id}-cur`, new UntypedFormControl(requirement.currentPoints));
        this.projectForm.addControl(`req-${requirement.id}-req`, new UntypedFormControl(requirement.requiredPoints));
        this.projectForm.addControl(`req-${requirement.id}-thr`, new UntypedFormControl(requirement.threshold));
      });
      this.milestones.forEach((milestone) => {
        this.projectForm.addControl(`mile-${milestone.id}-desc`, new UntypedFormControl(milestone.description));
        this.projectForm.addControl(`mile-${milestone.id}-req`, new UntypedFormControl(milestone.requiredPoints));
      });
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }



  addMilestone() {
    const milestone = {
      id: ConfigService.nanoid(),
      description: '',
      requiredPoints: 1
    };
    this.milestones.push(milestone);
    this.projectForm.addControl(`mile-${milestone.id}-desc`, new UntypedFormControl(milestone.description));
    this.projectForm.addControl(`mile-${milestone.id}-req`, new UntypedFormControl(milestone.requiredPoints));
    // TODO: Fix broken change detection after adding new required inputs
  }


  addRequirement() {
    const requirement = {
      id: ConfigService.nanoid(),
      skill: '',
      currentPoints: 0,
      requiredPoints: 0,
      threshold: 0
    };
    this.requirements.push(requirement);
    this.projectForm.addControl(`req-${requirement.id}-skill`, new UntypedFormControl(requirement.skill));
    this.projectForm.addControl(`req-${requirement.id}-cur`, new UntypedFormControl(requirement.currentPoints));
    this.projectForm.addControl(`req-${requirement.id}-req`, new UntypedFormControl(requirement.requiredPoints));
    this.projectForm.addControl(`req-${requirement.id}-thr`, new UntypedFormControl(requirement.threshold));
    // TODO: Fix broken change detection after adding new required inputs
  }


  removeMilestone(milestone: ProjectMilestone) {
    const index = this.milestones.findIndex((mile) => mile.id === milestone.id);
    if (index !== -1) {
      this.milestones.splice(index, 1);
      this.projectForm.removeControl(`mile-${milestone.id}-desc`);
      this.projectForm.removeControl(`mile-${milestone.id}-req`);
    }
  }


  removeRequirement(requirement: ProjectRequirement) {
    const index = this.requirements.findIndex((req) => req.id === requirement.id);
    if (index !== -1) {
      this.requirements.splice(index, 1);
      this.projectForm.removeControl(`req-${requirement.id}-skill`);
      this.projectForm.removeControl(`req-${requirement.id}-cur`);
      this.projectForm.removeControl(`req-${requirement.id}-req`);
      this.projectForm.removeControl(`req-${requirement.id}-thr`);
    }
  }


  save() {
    const project: Project = {
      ...this.projectForm.value
    };
    if (this.props.id) {
      project.owner = this.props.owner;
    } else {
      project.owner = this.userID;
    }
    this.projectService.store(project, this.props.id).then(() => {
      this.dismissPopover.emit(true);
    });
  }
}
