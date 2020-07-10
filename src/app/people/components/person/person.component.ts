import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { faUserEdit } from '@fortawesome/free-solid-svg-icons';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Person } from '../../../core/models/person.model';
import { EditPersonComponent } from '../edit-person/edit-person.component';
import { PopoverService } from '../../../popover/services/popover.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { DataService } from '../../../core/services/data.service';



@Component({
  selector: 'app-person',
  templateUrl: './person.component.html',
  styleUrls: ['./person.component.scss']
})
export class PersonComponent implements OnInit, OnDestroy {
  person: Person;
  faUserEdit = faUserEdit;
  private personSub: Subscription;

  constructor(
    private popover: PopoverService,
    private route: ActivatedRoute,
    private navigation: NavigationService,
    private data: DataService,
  ) { }

  ngOnInit(): void {
    // TODO: Check if the person can be loaded by a resolver as an observable
    this.personSub = this.route.paramMap.pipe(
      switchMap(params => {
        return this.data.getPersonById(params.get('id'));
      }),
    ).subscribe((person) => {
      if (person) {
        this.person = person;
        this.navigation.setPageLabel(this.person.name);
      }
    });
  }

  ngOnDestroy() {
    this.personSub.unsubscribe();
  }


  showEditDialog() {
    this.popover.showPopover(this.person.name, EditPersonComponent, this.person);
  }
}
