import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { combineLatest, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import { DataService } from '../../../core/services/data.service';
import { Person } from 'src/app/core/models/person.model';
import { PopoverService } from '../../../popover/services/popover.service';
import { AddPersonComponent } from '../add-person/add-person.component';



@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  filteredPeople$: Observable<Person[]>;
  faPlus = faPlus;
  textFilter: FormControl;

  constructor(
    private data: DataService,
    private popover: PopoverService,
  ) {
    this.textFilter = new FormControl('');
    this.filteredPeople$ = combineLatest([
      this.data.getPeople(),
      this.textFilter.valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
      ),
    ]).pipe(
      map(this.filterPeopleByText),
    );
  }

  ngOnInit(): void {
  }


  showAddDialog() {
    this.popover.showPopover('Neue Person', AddPersonComponent);
  }


  private filterPeopleByText(data): Person[] {
    const [people, text] = data;
    return people.filter((person) => {
      return text === ''
        || person.name.toLowerCase().indexOf(text.toLowerCase()) !== -1;
    });
  }
}
