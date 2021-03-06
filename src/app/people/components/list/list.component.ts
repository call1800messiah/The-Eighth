import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { combineLatest, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import { DataService } from '../../../core/services/data.service';
import { Person } from 'src/app/core/interfaces/person.interface';
import { PopoverService } from '../../../popover/services/popover.service';
import { EditPersonComponent } from '../edit-person/edit-person.component';



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
    private router: Router,
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


  goToPerson(person: Person) {
    this.router.navigate([`people/${person.id}`]);
  }


  showAddDialog() {
    this.popover.showPopover('Neue Person', EditPersonComponent);
  }


  private filterPeopleByText(data): Person[] {
    const [people, text] = data;
    return people.filter((person) => {
      return text === ''
        || person.name.toLowerCase().indexOf(text.toLowerCase()) !== -1
        || (person.title && person.title.toLowerCase().indexOf(text.toLowerCase()) !== -1)
        || (person.race && person.race.toLowerCase().indexOf(text.toLowerCase()) !== -1)
        || (person.culture && person.culture.toLowerCase().indexOf(text.toLowerCase()) !== -1);
    });
  }
}
