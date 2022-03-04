import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import { Project } from '../../models/project';



@Component({
  selector: 'app-edit-project',
  templateUrl: './edit-project.component.html',
  styleUrls: ['./edit-project.component.scss']
})
export class EditProjectComponent implements OnInit, OnDestroy {
  @Input() props: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  projectForm = new FormGroup({
    benefit: new FormControl(''),
    interval: new FormControl(''),
    name: new FormControl(''),
    isPrivate: new FormControl(false)
  });
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
      this.projectForm.patchValue(project);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
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
