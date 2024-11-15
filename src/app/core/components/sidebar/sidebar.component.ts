import { Component } from '@angular/core';
import type { Person } from '../../../people';
import { BehaviorSubject } from 'rxjs';



@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  selectedPerson$: BehaviorSubject<Person | null>;

  constructor() {
    this.selectedPerson$ = new BehaviorSubject(null);
  }

  onSelectionChange(person: Person) {
    this.selectedPerson$.next(person);
  }
}
