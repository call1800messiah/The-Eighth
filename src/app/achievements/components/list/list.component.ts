import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { Achievement } from 'src/app/core/models/achievements.model';
import { DataService } from 'src/app/core/services/data.service';



@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  achievements$: Observable<Achievement[]>;

  constructor(
    private data: DataService,
  ) {
    this.achievements$ = this.data.getAchievements();
  }

  ngOnInit(): void {
  }

}
