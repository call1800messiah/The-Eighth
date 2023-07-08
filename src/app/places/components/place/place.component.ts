import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { faBars } from '@fortawesome/free-solid-svg-icons';

import type { Place } from '../../models/place';
import type { Info } from '../../../shared/models/info';
import type { Menu } from '../../../shared/models/menu';
import { PopoverService } from '../../../core/services/popover.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { UtilService } from '../../../core/services/util.service';
import { PlaceService } from '../../services/place.service';
import { InfoType } from '../../../core/enums/info-type.enum';
import { ConfigService } from '../../../core/services/config.service';
import { EditInfoComponent } from '../../../shared/components/edit-info/edit-info.component';
import { EditImageComponent } from '../../../shared/components/edit-image/edit-image.component';
import { EditPlaceComponent } from '../edit-place/edit-place.component';
import { EditAccessComponent } from '../../../shared/components/edit-access/edit-access.component';



@Component({
  selector: 'app-place',
  templateUrl: './place.component.html',
  styleUrls: ['./place.component.scss']
})
export class PlaceComponent implements OnInit, OnDestroy {
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
        action: this.editPlace.bind(this),
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
    ]
  };
  menuOpen = false;
  place: Place;
  placeTypes = PlaceService.placeTypes;
  private subscription: Subscription;

  constructor(
    private popover: PopoverService,
    private route: ActivatedRoute,
    private navigation: NavigationService,
    private placeService: PlaceService,
    private util: UtilService,
  ) {
    this.subscription = new Subscription();
  }

  ngOnInit(): void {
    this.subscription.add(
      this.route.paramMap.pipe(
        switchMap(params => {
          return this.placeService.getPlaceById(params.get('id'));
        }),
      ).subscribe((place) => {
        if (place) {
          this.place = place;
          this.navigation.setPageLabel(this.place.name, '/places');
          this.infos$ = this.placeService.getPlaceInfos(this.place.id);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }



  editDetail(info: Info) {
    this.popover.showPopover('Info editieren', EditInfoComponent, {
      collection: PlaceService.collection,
      info,
      parentId: this.place.id,
    });
  }


  toggleMenu(e) {
    e.preventDefault();
    this.menuOpen = !this.menuOpen;
  }


  private addDetail() {
    this.popover.showPopover('Neue Info', EditInfoComponent, {
      collection: PlaceService.collection,
      parentId: this.place.id
    });
  }


  private editImage() {
    this.popover.showPopover('Bild ändern', EditImageComponent, {
      bucket: 'places',
      cropperSettings: ConfigService.imageSettings.place,
      imageName: this.util.slugify(this.place.name),
      imageUrl: this.place.image,
      updateRef: this.place,
    });
  }


  private editPlace() {
    this.popover.showPopover(this.place.name, EditPlaceComponent, this.place);
  }


  private editAccess() {
    this.popover.showPopover('Zugriff regeln', EditAccessComponent, {
      collection: PlaceService.collection,
      documentId: this.place.id,
    });
  }
}
