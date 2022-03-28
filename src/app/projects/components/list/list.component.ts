import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

  constructor(
    private projectsService: ProjectService,
    private popover: PopoverService
  ) {
    this.filterText = new BehaviorSubject<string>('');
    this.filteredProjects$ = combineLatest([
      this.projectsService.getProjects(),
      this.filterText,
    ]).pipe(
      map(this.filterProjectsByText)
    );
  }

  ngOnInit(): void {
  }



  onFilterChanged(text: string) {
    this.filterText.next(text);
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
