import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import { Place } from '../../models/place';
import { PopoverService } from '../../../core/services/popover.service';
import { EditPlaceComponent } from '../edit-place/edit-place.component';
import { PlaceService } from '../../services/place.service';



@Component({
  selector: 'app-place-list',
  templateUrl: './place-list.component.html',
  styleUrls: ['./place-list.component.scss']
})
export class PlaceListComponent implements OnInit {
  filteredPlaces$: Observable<Place[]>;
  faPlus = faPlus;
  filterText: BehaviorSubject<string>;
  places$: Observable<Place[]>;

  constructor(
    private placeService: PlaceService,
    private popover: PopoverService,
  ) {
    this.filterText = new BehaviorSubject<string>('');
    this.filteredPlaces$ = combineLatest([
      this.placeService.getPlaces(),
      this.filterText,
    ]).pipe(
      map(this.filterPlacesByText),
    );
    this.places$ = this.placeService.getPlaces().pipe(
      map((places) => places.filter((place) => !place.parent))
    );
  }

  ngOnInit(): void {
  }



  editPlace(place: Place) {
    this.popover.showPopover('Ort editieren', EditPlaceComponent, place);
  }


  onFilterChanged(text: string) {
    this.filterText.next(text);
  }


  showAddDialog() {
    this.popover.showPopover('Neuer Ort', EditPlaceComponent);
  }


  private filterPlacesByText(data): Place[] {
    const [places, text] = data;
    return places.filter((place) => {
      return text === ''
        || place.name.toLowerCase().indexOf(text.toLowerCase()) !== -1;
    });
  }
}
