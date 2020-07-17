import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { faUserEdit } from '@fortawesome/free-solid-svg-icons';
import { Observable, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Person } from '../../../core/models/person.model';
import { EditPersonComponent } from '../edit-person/edit-person.component';
import { PopoverService } from '../../../popover/services/popover.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { DataService } from '../../../core/services/data.service';
import { EditImageComponent } from '../../../shared/components/edit-image/edit-image.component';
import { UtilService } from '../../../core/services/util.service';
import { Info } from '../../../core/models/info.model';
import { InfoType } from '../../../core/enums/info-type.enum';
import { ConfigService } from '../../../core/services/config.service';



@Component({
  selector: 'app-person',
  templateUrl: './person.component.html',
  styleUrls: ['./person.component.scss']
})
export class PersonComponent implements OnInit, OnDestroy {
  person: Person;
  faUserEdit = faUserEdit;
  infos$: Observable<Map<InfoType, Info[]>>;
  infoTypes = ConfigService.infoTypes;
  private personSub: Subscription;

  constructor(
    private popover: PopoverService,
    private route: ActivatedRoute,
    private navigation: NavigationService,
    private data: DataService,
    private util: UtilService,
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
        this.infos$ = this.data.getInfosByParentId(this.person.id);
      }
    });
  }

  ngOnDestroy() {
    this.personSub.unsubscribe();
  }



  editImage() {
    this.popover.showPopover('Bild ändern', EditImageComponent, {
      bucket: 'people',
      imageName: this.util.slugify(this.person.name),
      imageUrl: this.person.image,
      updateRef: this.person,
    });
  }


  editPerson() {
    this.popover.showPopover(this.person.name, EditPersonComponent, this.person);
  }
}
