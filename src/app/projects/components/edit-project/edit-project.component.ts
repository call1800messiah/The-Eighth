import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy, inject } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, ValidatorFn, Validators } from '@angular/forms';
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
  styleUrls: ['./edit-project.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class EditProjectComponent implements OnInit, OnDestroy {
  private projectService = inject(ProjectService);
  private auth = inject(AuthService);

  @Input() props: Project;
  @Output() dismissPopover = new EventEmitter<boolean>();
  error: string | null = null;
  saving = false;
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

  constructor() {
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
      this.requirements.forEach((requirement) => this.addRequirementControls(requirement));
      this.milestones.forEach((milestone) => this.addMilestoneControls(milestone));
    } else {
      this.milestones = [];
      this.requirements = [];
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
    this.addMilestoneControls(milestone);
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
    this.addRequirementControls(requirement);
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


  async save() {
    if (this.projectForm.invalid || this.saving) {
      return;
    }
    const value = this.projectForm.value;
    const project: Partial<Project> = {
      name: value.name,
      benefit: value.benefit,
      interval: value.interval,
      milestones: this.milestones.map((milestone) => ({
        id: milestone.id,
        description: value[`mile-${milestone.id}-desc`],
        requiredPoints: value[`mile-${milestone.id}-req`],
      })),
      requirements: this.requirements.map((requirement) => ({
        id: requirement.id,
        skill: value[`req-${requirement.id}-skill`],
        currentPoints: value[`req-${requirement.id}-cur`],
        requiredPoints: value[`req-${requirement.id}-req`],
        threshold: value[`req-${requirement.id}-thr`],
      })),
    };
    if (this.props.id) {
      project.owner = this.props.owner;
    } else {
      project.owner = this.userID;
    }
    this.error = null;
    this.saving = true;
    const result = await this.projectService.store(project, this.props.id);
    this.saving = false;
    if (result.success) {
      this.dismissPopover.emit(true);
    } else {
      this.error = 'Das Projekt wurde nicht gespeichert. Bitte versuche es noch einmal.';
    }
  }


  // The point columns are int4 and NOT NULL. A milestone's description may be
  // NULL in the database, but the form has always asked for one.
  private addMilestoneControls(milestone: ProjectMilestone) {
    this.projectForm.addControl(`mile-${milestone.id}-desc`, new UntypedFormControl(milestone.description, Validators.required));
    this.projectForm.addControl(`mile-${milestone.id}-req`, new UntypedFormControl(milestone.requiredPoints, points(1)));
  }


  private addRequirementControls(requirement: ProjectRequirement) {
    this.projectForm.addControl(`req-${requirement.id}-skill`, new UntypedFormControl(requirement.skill, Validators.required));
    this.projectForm.addControl(`req-${requirement.id}-cur`, new UntypedFormControl(requirement.currentPoints, points(0)));
    this.projectForm.addControl(`req-${requirement.id}-req`, new UntypedFormControl(requirement.requiredPoints, points(0)));
    this.projectForm.addControl(`req-${requirement.id}-thr`, new UntypedFormControl(requirement.threshold, points()));
  }
}



const INT4_MIN = -2147483648;
const INT4_MAX = 2147483647;

/** A required whole number that fits an int4 column, optionally with a higher lower bound. */
function points(min = INT4_MIN): ValidatorFn[] {
  return [Validators.required, Validators.pattern(/^-?\d+$/), Validators.min(min), Validators.max(INT4_MAX)];
}
