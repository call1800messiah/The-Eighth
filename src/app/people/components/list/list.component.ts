import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { faList, faPlus, faSkullCrossbones } from '@fortawesome/free-solid-svg-icons';

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
  faList = faList;
  faPlus = faPlus;
  faSkullCrossbones = faSkullCrossbones;
  filteredPeople$: Observable<Person[]>;
  filterText: BehaviorSubject<string>;
  initialFilterText: string;
  showAsList = false;
  showDead = false;
  showDead$: BehaviorSubject<boolean>;

  constructor(
    private peopleService: PeopleService,
    private popover: PopoverService,
  ) {
    this.initialFilterText = localStorage.getItem('people-filter') || '';
    this.showAsList = localStorage.getItem('people-show-as-list') === 'true';
    this.showDead = localStorage.getItem('people-show-dead') === 'true';
    this.showDead$ = new BehaviorSubject<boolean>(this.showDead);
    this.filterText = new BehaviorSubject<string>(this.initialFilterText);
    this.filteredPeople$ = combineLatest([
      this.peopleService.getPeople(),
      this.filterText,
      this.showDead$,
    ]).pipe(
      map(this.filterPeopleByText.bind(this)),
    );
  }

  ngOnInit(): void {
  }



  onFilterChanged(text: string) {
    localStorage.setItem('people-filter', text);
    this.filterText.next(text);
  }


  showAddDialog() {
    this.popover.showPopover('Neue Person', EditPersonComponent);
  }


  toggleShowDead() {
    this.showDead = !this.showDead;
    this.showDead$.next(this.showDead);
    localStorage.setItem('people-show-dead', this.showDead.toString());
  }


  toggleDisplayStyle() {
    this.showAsList = !this.showAsList;
    localStorage.setItem('people-show-as-list', this.showAsList.toString());
  }


  private filterPeopleByText(data: [Person[], string, boolean]): Person[] {
    const [people, text, showDead] = data;
    return people.filter((person) => {
      const lowText = text.toLowerCase();
      return (
        text === ''
        || person.name.toLowerCase().indexOf(lowText) !== -1
        || (person.title && person.title.toLowerCase().indexOf(lowText) !== -1)
        || (person.race && person.race.toLowerCase().indexOf(lowText) !== -1)
        || (person.culture && person.culture.toLowerCase().indexOf(lowText) !== -1)
        || (person.tags && person.tags.find((tag) => tag.toLowerCase().indexOf(lowText) !== -1) !== undefined)
      ) && (!person.deathday || showDead);
    });
  }
}
