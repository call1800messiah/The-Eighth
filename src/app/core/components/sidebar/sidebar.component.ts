import { Component } from '@angular/core';
import type { Person } from '../../../people';



@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  selectedPerson: Person;

  onSelectionChange(person: Person) {
    this.selectedPerson = person;
  }
}
