import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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

  constructor(
    private placeService: PlaceService,
    private popover: PopoverService,
    private router: Router,
  ) {
    this.filterText = new BehaviorSubject<string>('');
    this.filteredPlaces$ = combineLatest([
      this.placeService.getPlaces(),
      this.filterText,
    ]).pipe(
      map(this.filterPlacesByText),
    );
  }

  ngOnInit(): void {
  }



  editPlace(place: Place) {
    this.popover.showPopover('Ort editieren', EditPlaceComponent, place);
  }


  goToPlace(place: Place) {
    this.router.navigate([`places/${place.id}`]);
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
