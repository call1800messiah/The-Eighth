import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import type { Menu } from '../../../shared/models/menu';
import type { Person } from '../../../people/models/person';
import type { Scene } from '../../models/scene';
import { NavigationService } from '../../../core/services/navigation.service';
import { SceneService } from '../../services/scene.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditSceneComponent } from '../edit-scene/edit-scene.component';
import { SelectPeopleComponent } from '../../../people/components/select-people/select-people.component';
import { PeopleService } from '../../../people/services/people.service';

@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.scss']
})
export class SceneComponent implements OnInit, OnDestroy {
  faBars = faBars;
  menu: Menu = {
    actions: [
      {
        label: 'Daten ändern',
        action: this.editScene.bind(this),
        restricted: true,
      },
      {
        label: 'Personen ändern',
        action: this.editPeople.bind(this),
        restricted: true,
      },
    ],
  };
  scene: Scene;
  private people: Person[];
  private subscription: Subscription;

  constructor(
    private navigation: NavigationService,
    private peopleService: PeopleService,
    private popover: PopoverService,
    private route: ActivatedRoute,
    private sceneService: SceneService,
  ) {
    this.subscription = new Subscription();
    this.subscription.add(
      this.peopleService.getPeople().subscribe((people) => {
        this.people = people;
      })
    );
  }

  ngOnInit(): void {
    this.subscription.add(
      this.route.paramMap.pipe(
        switchMap((params) => {
          return this.sceneService.getSceneById(params.get('id'));
        }),
      ).subscribe((scene) => {
        if (scene) {
          this.scene = scene;
          this.navigation.setPageLabel(scene.name, '/scenes');
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }



  private editPeople() {
    this.popover.showPopover(
      'Kämpfer hinzufügen',
      SelectPeopleComponent,
      {
        people: this.people,
        selected: this.scene.people.map(person => person.id),
        onPersonSelected: (person: Person) => {
          this.sceneService.store({
            people: [...this.scene.people.map(p => p.id), person.id],
          }, this.scene.id);
        },
        onPersonDeselected: (id: string) => {
          this.sceneService.store({
            people: this.scene.people.map(p => p.id).filter(p => p !== id),
          }, this.scene.id);
        },
      },
    );
  }


  private editScene() {
    this.popover.showPopover('Szene bearbeiten', EditSceneComponent, this.scene);
  }
}
