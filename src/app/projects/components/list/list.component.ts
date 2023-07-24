import { Component, OnInit } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import { Project } from '../../models/project';
import { ProjectService } from '../../services/project.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditProjectComponent } from '../edit-project/edit-project.component';



@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  filteredProjects$: Observable<Project[]>;
  faPlus = faPlus;
  filterText: BehaviorSubject<string>;
  initialFilterText: string;
  showCompleted: UntypedFormControl;

  constructor(
    private projectsService: ProjectService,
    private popover: PopoverService
  ) {
    this.initialFilterText = localStorage.getItem('projects-filter') || '';
    this.filterText = new BehaviorSubject<string>(this.initialFilterText);
    this.showCompleted = new UntypedFormControl(false);
    this.filteredProjects$ = combineLatest([
      this.projectsService.getProjects(),
      this.filterText,
      this.showCompleted.valueChanges.pipe(
        startWith(false),
      ),
    ]).pipe(
      map(this.filterProjectsByText),
      map(this.filterProjectsByCompleted),
    );
  }

  ngOnInit(): void {
  }



  onFilterChanged(text: string) {
    localStorage.setItem('projects-filter', text);
    this.filterText.next(text);
  }


  showAddDialog() {
    this.popover.showPopover('Neues Projekt', EditProjectComponent);
  }



  private filterProjectsByText(data): [Project[], boolean] {
    const [projects, text, showCompleted] = data;
    return [projects.filter((project) => {
      return text === ''
        || project.name.toLowerCase().indexOf(text.toLowerCase()) !== -1
        || project.interval.toLowerCase().indexOf(text.toLowerCase()) !== -1
        || project.benefit.toLowerCase().indexOf(text.toLowerCase()) !== -1
        || project.requirements.some((requirement) => requirement.skill.toLowerCase().indexOf(text.toLowerCase()) !== -1)
        || project.milestones.some((milestone) => milestone.description.toLowerCase().indexOf(text.toLowerCase()) !== -1);
    }), showCompleted];
  }


  private filterProjectsByCompleted(data): Project[] {
    const [projects , showCompleted] = data;

    return projects.filter((project) => {
      const completed = project.requirements.reduce((acc, req) => {
        if (req.currentPoints < req.requiredPoints) {
          acc = false;
        }
        return acc;
      }, true);
      return showCompleted ? completed : !completed;
    });
  }
}
