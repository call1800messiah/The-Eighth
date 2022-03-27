import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';

import { PopoverChild } from '../../../shared/models/popover-child';
import { AuthService } from '../../../core/services/auth.service';
import { Place } from '../../models/place';
import { PlaceService } from '../../services/place.service';



@Component({
  selector: 'app-edit-place',
  templateUrl: './edit-place.component.html',
  styleUrls: ['./edit-place.component.scss']
})
export class EditPlaceComponent implements OnInit, OnDestroy, PopoverChild {
  @Input() props: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  deleteDisabled = true;
  placeTypes: Record<string, string>[] = Object.entries(PlaceService.placeTypes).reduce((all, [key, value]) => {
    all.push({ key, value });
    return all;
  }, []);
  placeForm = new FormGroup({
    name: new FormControl(''),
    isPrivate: new FormControl(false),
    parentId: new FormControl(),
    type: new FormControl(this.placeTypes[0])
  });
  places$: Observable<Place[]>;
  userID: string;
  private subscription = new Subscription();

  constructor(
    private placeService: PlaceService,
    private auth: AuthService,
  ) {
    this.places$ = this.placeService.getPlaces();
    this.subscription.add(
      this.auth.user$.subscribe((user) => {
        this.userID = user.id;
      })
    );
  }

  ngOnInit(): void {
    if (this.props.id) {
      const place = this.props as Place;
      this.placeForm.patchValue(place);

      if (this.props.parent) {
        this.placeForm.patchValue({ parentId: this.props.parent.id });
      }
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }


  isSelectedParent(parentId: string): boolean {
    return this.props.id && this.props.parent && this.props.parent.id === parentId;
  }


  save() {
    const place: Partial<Place> = {
      ...this.placeForm.value
    };
    if (this.props.id) {
      place.owner = this.props.owner;
    } else {
      place.owner = this.userID;
    }
    this.placeService.store(place, this.props.id).then(() => {
      this.dismissPopover.emit(true);
    });
  }


  toggleDelete() {
    this.deleteDisabled = !this.deleteDisabled;
  }
}
