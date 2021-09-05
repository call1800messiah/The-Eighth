import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { combineLatest, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import { Place } from '../../models/place';
import { PopoverService } from '../../../popover/services/popover.service';
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
  textFilter: FormControl;

  constructor(
    private placeService: PlaceService,
    private popover: PopoverService,
    private router: Router,
  ) {
    this.textFilter = new FormControl('');
    this.filteredPlaces$ = combineLatest([
      this.placeService.getPlaces(),
      this.textFilter.valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
      ),
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
