import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { faPlus, faStickyNote } from '@fortawesome/free-solid-svg-icons';
import { Observable, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Person } from '../../../core/interfaces/person.interface';
import { EditPersonComponent } from '../edit-person/edit-person.component';
import { PopoverService } from '../../../popover/services/popover.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { DataService } from '../../../core/services/data.service';
import { EditImageComponent } from '../../../shared/components/edit-image/edit-image.component';
import { UtilService } from '../../../core/services/util.service';
import { Info } from '../../../core/models/info.model';
import { InfoType } from '../../../core/enums/info-type.enum';
import { EditInfoComponent } from '../../../shared/components/edit-info/edit-info.component';
import { ConfigService } from '../../../core/services/config.service';
import { Values } from '../../../core/interfaces/values.interface';
import { Attribute } from '../../../core/interfaces/attribute.interface';
import { EditAttributeComponent } from '../../../shared/components/edit-attribute/edit-attribute.component';



@Component({
  selector: 'app-person',
  templateUrl: './person.component.html',
  styleUrls: ['./person.component.scss']
})
export class PersonComponent implements OnInit, OnDestroy {
  person: Person;
  faPlus = faPlus;
  faStickyNote = faStickyNote;
  infos$: Observable<Map<InfoType, Info[]>>;
  values$: Observable<Values>;
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
        this.values$ = this.data.getPersonValues(this.person.id);
      }
    });
  }

  ngOnDestroy() {
    this.personSub.unsubscribe();
  }



  addDetail() {
    this.popover.showPopover('Neue Info', EditInfoComponent, { parent: this.person.id });
  }


  editAttribute(attribute: Attribute) {
    this.popover.showPopover('Wert editieren', EditAttributeComponent, {
      person: this.person.id,
      attribute,
    });
  }


  editDetail(info: Info) {
    this.popover.showPopover('Info editieren', EditInfoComponent, info);
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
