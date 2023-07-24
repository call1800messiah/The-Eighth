import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import type { Person } from 'src/app/people/models/person';
import { PopoverService } from '../../../core/services/popover.service';
import { EditPersonComponent } from '../edit-person/edit-person.component';
import { PeopleService } from '../../services/people.service';



@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  filteredPeople$: Observable<Person[]>;
  faPlus = faPlus;
  filterText: BehaviorSubject<string>;

  constructor(
    private peopleService: PeopleService,
    private popover: PopoverService,
  ) {
    this.filterText = new BehaviorSubject<string>('');
    this.filteredPeople$ = combineLatest([
      this.peopleService.getPeople(),
      this.filterText,
    ]).pipe(
      map(this.filterPeopleByText),
    );
  }

  ngOnInit(): void {
  }



  onFilterChanged(text: string) {
    this.filterText.next(text);
  }


  showAddDialog() {
    this.popover.showPopover('Neue Person', EditPersonComponent);
  }


  private filterPeopleByText(data): Person[] {
    const [people, text] = data;
    return people.filter((person) => {
      const lowText = text.toLowerCase();
      return text === ''
        || person.name.toLowerCase().indexOf(lowText) !== -1
        || (person.title && person.title.toLowerCase().indexOf(lowText) !== -1)
        || (person.race && person.race.toLowerCase().indexOf(lowText) !== -1)
        || (person.culture && person.culture.toLowerCase().indexOf(lowText) !== -1)
        || (person.tags && person.tags.find((tag) => tag.toLowerCase().indexOf(lowText) !== -1) !== undefined);
    });
  }
}
