import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { combineLatest, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';

import { DataService } from '../../../core/services/data.service';
import { Person } from 'src/app/core/models/person.model';



@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  filteredPeople$: Observable<Person[]>;
  textFilter: FormControl;

  constructor(
    private data: DataService
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

  private filterPeopleByText(data): Person[] {
    const [people, text] = data;
    return people.filter((person) => {
      return text === ''
        || person.name.toLowerCase().indexOf(text.toLowerCase()) !== -1;
    });
  }
}
