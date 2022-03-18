import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { combineLatest, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import { Project } from '../../models/project';
import { ProjectService } from '../../services/project.service';
import { PopoverService } from '../../../popover/services/popover.service';
import { EditProjectComponent } from '../edit-project/edit-project.component';



@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  filteredProjects$: Observable<Project[]>;
  faPlus = faPlus;
  textFilter: FormControl;

  constructor(
    private projectsService: ProjectService,
    private popover: PopoverService
  ) {
    this.textFilter = new FormControl('');
    this.filteredProjects$ = combineLatest([
      this.projectsService.getProjects(),
      this.textFilter.valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
      ),
    ]).pipe(
      map(this.filterProjectsByText)
    );
  }

  ngOnInit(): void {
  }



  showAddDialog() {
    this.popover.showPopover('Neues Projekt', EditProjectComponent);
  }



  private filterProjectsByText(data): Project[] {
    const [projects, text] = data;
    return projects.filter((project) => {
      return text === ''
        || project.name.toLowerCase().indexOf(text.toLowerCase()) !== -1
        || project.interval.toLowerCase().indexOf(text.toLowerCase()) !== -1
        || project.benefit.toLowerCase().indexOf(text.toLowerCase()) !== -1
        || project.requirements.some((requirement) => requirement.skill.toLowerCase().indexOf(text.toLowerCase()) !== -1)
        || project.milestones.some((milestone) => milestone.description.toLowerCase().indexOf(text.toLowerCase()) !== -1);
    });
  }
}
