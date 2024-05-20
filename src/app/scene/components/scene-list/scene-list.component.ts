import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import type { Scene } from '../../models/scene';
import { SceneService } from '../../services/scene.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditSceneComponent } from '../edit-scene/edit-scene.component';

@Component({
  selector: 'app-scene-overview',
  templateUrl: './scene-list.component.html',
  styleUrls: ['./scene-list.component.scss']
})
export class SceneListComponent implements OnInit {
  faPlus = faPlus;
  filteredScenes$: Observable<Scene[]>;
  filterText: BehaviorSubject<string>;
  initialFilterText: string;
  scenes$: Observable<Scene[]>;

  constructor(
    private popover: PopoverService,
    private sceneService: SceneService,
  ) {
    this.initialFilterText = localStorage.getItem('scenes-filter') || '';
    this.filterText = new BehaviorSubject<string>(this.initialFilterText);
    this.filteredScenes$ = combineLatest([
      this.sceneService.getScenes(),
      this.filterText,
    ]).pipe(
      map(this.filterScenesByText),
    );
    this.scenes$ = this.sceneService.getScenes();
  }

  ngOnInit(): void {
  }



  onFilterChanged(text: string) {
    localStorage.setItem('scenes-filter', text);
    this.filterText.next(text);
  }


  showAddDialog() {
    this.popover.showPopover('Neue Szene', EditSceneComponent);
  }

  private filterScenesByText(data: [Scene[], string]): Scene[] {
    const [scenes, text] = data;
    return scenes.filter((scene) => {
      return text === ''
        || scene.name.toLowerCase().indexOf(text.toLowerCase()) !== -1;
    });
  }
}
