import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { faImage, faPlus, faStickyNote } from '@fortawesome/free-solid-svg-icons';

import { PopoverService } from '../../../core/services/popover.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { UtilService } from '../../../core/services/util.service';
import { PlaceService } from '../../services/place.service';
import { Place } from '../../models/place';
import { InfoType } from '../../../core/enums/info-type.enum';
import { Info } from '../../../shared/models/info';
import { ConfigService } from '../../../core/services/config.service';
import { EditInfoComponent } from '../../../shared/components/edit-info/edit-info.component';
import { EditImageComponent } from '../../../shared/components/edit-image/edit-image.component';
import { EditPlaceComponent } from '../edit-place/edit-place.component';



@Component({
  selector: 'app-place',
  templateUrl: './place.component.html',
  styleUrls: ['./place.component.scss']
})
export class PlaceComponent implements OnInit, OnDestroy {
  faImage = faImage;
  faPlus = faPlus;
  faStickyNote = faStickyNote;
  infos$: Observable<Map<InfoType, Info[]>>;
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
          this.navigation.setPageLabel(this.place.name);
          this.infos$ = this.placeService.getPlaceInfos(this.place.id);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }



  addDetail() {
    this.popover.showPopover('Neue Info', EditInfoComponent, {
      collection: PlaceService.collection,
      parentId: this.place.id
    });
  }


  editDetail(info: Info) {
    this.popover.showPopover('Info editieren', EditInfoComponent, {
      collection: PlaceService.collection,
      info,
      parentId: this.place.id,
    });
  }


  editImage() {
    this.popover.showPopover('Bild ändern', EditImageComponent, {
      bucket: 'places',
      cropperSettings: ConfigService.imageSettings.place,
      imageName: this.util.slugify(this.place.name),
      imageUrl: this.place.image,
      updateRef: this.place,
    });
  }


  editPlace() {
    this.popover.showPopover(this.place.name, EditPlaceComponent, this.place);
  }
}
