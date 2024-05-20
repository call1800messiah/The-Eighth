import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import type { Person } from '../../../people/models/person';
import type { Place } from '../../../places/models/place';
import type { Scene } from '../../models/scene';
import type { SceneDB } from '../../models/scene.db';
import { PopoverChild } from '../../../shared/models/popover-child';
import { SceneService } from '../../services/scene.service';
import { AuthService } from '../../../core/services/auth.service';
import { PeopleService } from '../../../people/services/people.service';
import { PlaceService } from '../../../places/services/place.service';

@Component({
  selector: 'app-edit-scene',
  templateUrl: './edit-scene.component.html',
  styleUrls: ['./edit-scene.component.scss']
})
export class EditSceneComponent implements OnInit, OnDestroy, PopoverChild {
  @Input() props: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  people: Person[];
  places: Place[];
  placeTypes = PlaceService.placeTypes;
  sceneForm = new UntypedFormGroup({
    name: new UntypedFormControl(''),
    place: new UntypedFormControl(''),
  });
  scenes$: Observable<Scene[]>;
  userID: string;
  private subscription = new Subscription();

  constructor(
    private auth: AuthService,
    private peopleService: PeopleService,
    private placeService: PlaceService,
    private sceneService: SceneService,
  ) {
    this.scenes$ = this.sceneService.getScenes();
    this.subscription.add(
      this.auth.user$.subscribe((user) => {
        this.userID = user.id;
      })
    );
    this.subscription.add(
      this.placeService.getPlaces().subscribe((places) => {
        this.places = places;
      })
    );
    this.subscription.add(
      this.peopleService.getPeople().subscribe((people) => {
        this.people = people;
      })
    );
  }

  ngOnInit(): void {
    if (this.props.id) {
      const scene = this.props as Scene;
      this.sceneForm.patchValue(scene);
    }
  }


  ngOnDestroy() {
    this.subscription.unsubscribe();
  }


  save() {
    const scene: SceneDB = {
      ...this.sceneForm.value
    };
    if (this.props.id) {
      scene.owner = this.props.owner;
    } else {
      scene.owner = this.userID;
    }
    this.sceneService.store(scene, this.props.id).then(() => {
      this.dismissPopover.emit(true);
    });
  }
}
