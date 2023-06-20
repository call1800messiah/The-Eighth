import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { Observable, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Person } from '../../models/person';
import { EditPersonComponent } from '../edit-person/edit-person.component';
import { PopoverService } from '../../../core/services/popover.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { DataService } from '../../../core/services/data.service';
import { EditImageComponent } from '../../../shared/components/edit-image/edit-image.component';
import { UtilService } from '../../../core/services/util.service';
import { Info } from '../../../shared/models/info';
import { InfoType } from '../../../core/enums/info-type.enum';
import { EditInfoComponent } from '../../../shared/components/edit-info/edit-info.component';
import { Values } from '../../../shared/models/values';
import { Attribute } from '../../../shared/models/attribute';
import { EditAttributeComponent } from '../../../shared/components/edit-attribute/edit-attribute.component';
import { ConfigService } from '../../../core/services/config.service';
import { PeopleService } from '../../services/people.service';
import { Menu } from '../../../shared/models/menu';



@Component({
  selector: 'app-person',
  templateUrl: './person.component.html',
  styleUrls: ['./person.component.scss']
})
export class PersonComponent implements OnInit, OnDestroy {
  faBars = faBars;
  infos$: Observable<Map<InfoType, Info[]>>;
  menu: Menu = {
    actions: [
      {
        label: 'Bild ändern',
        action: this.editImage.bind(this)
      },
      {
        label: 'Daten ändern',
        action: this.editPerson.bind(this)
      },
      {
        label: 'Neues Attribut',
        action: this.addAttribute.bind(this)
      },
      {
        label: 'Neue Info',
        action: this.addDetail.bind(this)
      }
    ],
};
  menuOpen = false;
  person: Person;
  values$: Observable<Values>;
  private personSub: Subscription;

  constructor(
    private data: DataService,
    private navigation: NavigationService,
    private peopleService: PeopleService,
    private popover: PopoverService,
    private route: ActivatedRoute,
    private util: UtilService,
  ) { }

  ngOnInit(): void {
    // TODO: Check if the person can be loaded by a resolver as an observable
    this.personSub = this.route.paramMap.pipe(
      switchMap(params => {
        return this.peopleService.getPersonById(params.get('id'));
      }),
    ).subscribe((person) => {
      if (person) {
        this.person = person;
        this.navigation.setPageLabel(this.person.name, '/people');
        this.infos$ = this.data.getInfos(this.person.id, PeopleService.collection);
        this.values$ = this.peopleService.getPersonValues(this.person.id);
      }
    });
  }

  ngOnDestroy() {
    this.personSub.unsubscribe();
  }



  editAttribute(attribute: Attribute) {
    this.popover.showPopover('Wert editieren', EditAttributeComponent, {
      person: this.person.id,
      attribute,
    });
  }


  editDetail(info: Info) {
    this.popover.showPopover('Info editieren', EditInfoComponent, {
      collection: PeopleService.collection,
      info,
      parentId: this.person.id,
    });
  }


  toggleMenu(e) {
    e.preventDefault();
    this.menuOpen = !this.menuOpen;
  }


  private addAttribute() {
    this.popover.showPopover('Neuer Wert', EditAttributeComponent, {
      person: this.person.id,
    });
  }


  private addDetail() {
    this.popover.showPopover('Neue Info', EditInfoComponent, {
      collection: PeopleService.collection,
      parentId: this.person.id
    });
  }


  private editImage() {
    this.popover.showPopover('Bild ändern', EditImageComponent, {
      bucket: PeopleService.collection,
      cropperSettings: ConfigService.imageSettings.person,
      imageName: this.util.slugify(this.person.name),
      imageUrl: this.person.image,
      updateRef: this.person,
    });
  }


  private editPerson() {
    this.popover.showPopover(this.person.name, EditPersonComponent, this.person);
  }
}
