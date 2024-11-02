import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { Observable, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import type { Person } from '../../models/person';
import type { Info } from '../../../shared/models/info';
import type { Values } from '../../../shared/models/values';
import type { Attribute } from '../../../shared/models/attribute';
import type { Menu } from '../../../shared/models/menu';
import type { AuthUser } from '../../../auth/models/auth-user';
import type { EditAttributeProps } from '../../../shared/models/edit-attribute-props';
import type { EditInfoProps } from '../../../shared/models/edit-info-props';
import type { EditAccessProps } from '../../../shared/models/edit-access-props';
import type { EditImageProps } from '../../../shared/models/edit-image-props';
import { EditPersonComponent } from '../edit-person/edit-person.component';
import { PopoverService } from '../../../core/services/popover.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { DataService } from '../../../core/services/data.service';
import { EditImageComponent } from '../../../shared/components/edit-image/edit-image.component';
import { UtilService } from '../../../core/services/util.service';
import { InfoType } from '../../../core/enums/info-type.enum';
import { EditInfoComponent } from '../../../shared/components/edit-info/edit-info.component';
import { EditAttributeComponent } from '../../../shared/components/edit-attribute/edit-attribute.component';
import { ConfigService } from '../../../core/services/config.service';
import { PeopleService } from '../../services/people.service';
import { AuthService } from '../../../core/services/auth.service';
import { EditAccessComponent } from '../../../shared/components/edit-access/edit-access.component';
import { EditTagsComponent } from '../../../shared/components/edit-tags/edit-tags.component';



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
        action: this.editImage.bind(this),
        restricted: true,
      },
      {
        label: 'Daten ändern',
        action: this.editPerson.bind(this),
        restricted: true,
      },
      {
        label: 'Neues Attribut',
        action: this.addAttribute.bind(this),
        restricted: true,
      },
      {
        label: 'Banner ändern',
        action: this.editBanner.bind(this),
        restricted: true,
      },
      {
        label: 'Tags ändern',
        action: this.editTags.bind(this),
        restricted: true,
      },
      {
        label: 'Zugriff regeln',
        action: this.editAccess.bind(this),
        restricted: true,
      },
      {
        label: 'Neue Info',
        action: this.addDetail.bind(this)
      }
    ],
  };
  menuOpen = false;
  person: Person;
  relativeTypes = PeopleService.relativeTypes;
  user: AuthUser;
  values$: Observable<Values>;
  private personSub: Subscription;

  constructor(
    private auth: AuthService,
    private data: DataService,
    private navigation: NavigationService,
    private peopleService: PeopleService,
    private popover: PopoverService,
    private route: ActivatedRoute,
    private util: UtilService,
  ) {
    this.user = this.auth.user;
  }

  ngOnInit(): void {
    // TODO: Check if the person can be loaded by a resolver as an observable
    this.personSub = this.route.paramMap.pipe(
      switchMap(params => {
        return this.peopleService.getPersonById(params.get('id'));
      }),
    ).subscribe((person) => {
      if (person) {
        this.person = person;
        this.navigation.setPageLabel(this.isOwnerOrCan('viewName') ? person.name : person.name.split(' ')[0], '/people');
        this.infos$ = this.data.getInfos(this.person.id, PeopleService.collection);
        this.values$ = this.peopleService.getPersonValues(this.person.id);
      }
    });
  }

  ngOnDestroy() {
    this.personSub.unsubscribe();
  }



  editAttribute(attribute: Attribute) {
    if (this.isOwnerOrCan('editHitPoints')) {
      this.popover.showPopover<EditAttributeProps>('Wert editieren', EditAttributeComponent, {
        personId: this.person.id,
        attribute,
      });
    }
  }


  editDetail(info: Info) {
    this.popover.showPopover<EditInfoProps>('Info editieren', EditInfoComponent, {
      collection: PeopleService.collection,
      info,
      parentId: this.person.id,
    });
  }


  hasRelatives(): boolean {
    return Object.keys(this.person.relatives).length > 0;
  }


  isOwnerOrCan(access: string): boolean {
    return this.user && (this.user.isGM || this.user[access] || this.user.id === this.person.owner);
  }


  toggleMenu(e) {
    e.preventDefault();
    this.menuOpen = !this.menuOpen;
  }


  private addAttribute() {
    this.popover.showPopover<EditAttributeProps>('Neuer Wert', EditAttributeComponent, {
      personId: this.person.id,
    });
  }


  private addDetail() {
    this.popover.showPopover<EditInfoProps>('Neue Info', EditInfoComponent, {
      collection: PeopleService.collection,
      parentId: this.person.id
    });
  }


  private editAccess() {
    this.popover.showPopover<EditAccessProps>('Zugriff regeln', EditAccessComponent, {
      collection: PeopleService.collection,
      documentId: this.person.id,
    });
  }


  private editBanner() {
    this.popover.showPopover<EditImageProps>('Banner ändern', EditImageComponent, {
      bucket: 'banners',
      cropperSettings: ConfigService.imageSettings.banner,
      imageName: this.util.slugify(this.person.name),
      imageUrl: this.person.banner,
      updateRef: {
        attribute: 'banner',
        collection: PeopleService.collection,
        id: this.person.id,
      },
    });
  }


  private editImage() {
    this.popover.showPopover('Bild ändern', EditImageComponent, {
      bucket: PeopleService.collection,
      cropperSettings: ConfigService.imageSettings.person,
      imageName: this.util.slugify(this.person.name),
      imageUrl: this.person.image,
      updateRef: {
        attribute: 'image',
        collection: PeopleService.collection,
        id: this.person.id
      },
    });
  }


  private editPerson() {
    this.popover.showPopover(this.person.name, EditPersonComponent, this.person);
  }


  private editTags() {
    this.popover.showPopover('Tags editieren', EditTagsComponent, {
      collection: PeopleService.collection,
      id: this.person.id,
      tags: this.person.tags,
    });
  }
}
