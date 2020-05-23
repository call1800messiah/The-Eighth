import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { DataService } from '../../../core/services/data.service';
import { Person } from 'src/app/core/models/person.model';



@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  public people$: Observable<Person[]>

  constructor(
    private data: DataService
  ) {
    this.people$ = this.data.getPeople();
  }

  ngOnInit(): void {
  }

}
