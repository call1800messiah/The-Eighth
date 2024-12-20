import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { deleteField } from '@angular/fire/firestore';
import { Observable, Subscription } from 'rxjs';

import type { Place } from '../../models/place';
import type { PlaceDB } from '../../models/place.db';
import type { PopoverChild } from '../../../shared';
import { AuthService } from '../../../core/services/auth.service';
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
  placeForm = new UntypedFormGroup({
    name: new UntypedFormControl(''),
    inhabitants: new UntypedFormControl(''),
    parentId: new UntypedFormControl(),
    type: new UntypedFormControl(this.placeTypes[0])
  });
  placeTypeMap = PlaceService.placeTypes;
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
      this.placeForm.patchValue({ parentId: this.props.parent ? this.props.parent.id : null });
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }


  save() {
    const place: Partial<PlaceDB> = {
      ...this.placeForm.value
    };
    if (this.props.id) {
      place.owner = this.props.owner;
    } else {
      place.owner = this.userID;
    }
    if (this.props.id && place.parentId === 'null') {
      place.parentId = deleteField();
    } else if (place.parentId === 'null') {
      delete place.parentId;
    }
    this.placeService.store(place, this.props.id).then(() => {
      this.dismissPopover.emit(true);
    });
  }


  toggleDelete() {
    this.deleteDisabled = !this.deleteDisabled;
  }
}
