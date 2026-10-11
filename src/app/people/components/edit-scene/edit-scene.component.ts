import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { PopoverChild } from '../../../shared/models/popover-child';
import type { EditSceneProps, Person } from '../../models';
import { PeopleService } from '../../services/people.service';
import { SceneService } from '../../services/scene.service';
import { UtilService } from '../../../core/services/util.service';



@Component({
  selector: 'app-edit-scene',
  templateUrl: './edit-scene.component.html',
  styleUrls: ['./edit-scene.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class EditSceneComponent implements OnInit, PopoverChild {
  private peopleService = inject(PeopleService);
  private sceneService = inject(SceneService);

  @Input() props: EditSceneProps;
  @Output() dismissPopover = new EventEmitter<boolean>();
  caption = '';
  file: File | null = null;
  fileInvalid = false;
  people$: Observable<Person[]>;
  saving = false;
  /** May hold ids of people the user cannot see; those are kept as they are */
  selected = new Set<string>();

  ngOnInit(): void {
    this.people$ = this.peopleService.getPeople().pipe(
      map(people => [...people].sort(UtilService.orderByName)),
    );

    if (this.props.scene) {
      this.caption = this.props.scene.caption;
      this.props.scene.people.forEach(id => this.selected.add(id));
    } else if (this.props.personId) {
      this.selected.add(this.props.personId);
    }
  }



  get canSave(): boolean {
    return !this.saving
      && this.selected.size > 0
      && (!!this.props.scene || !!this.file);
  }


  fileChanged(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.fileInvalid = !!file && !file.type.startsWith('image/');
    this.file = file && !this.fileInvalid ? file : null;
  }


  toggle(personId: string, checked: boolean) {
    if (checked) {
      this.selected.add(personId);
    } else {
      this.selected.delete(personId);
    }
  }


  async save() {
    if (!this.canSave) {
      return;
    }

    this.saving = true;
    try {
      if (this.props.scene) {
        await this.sceneService.update(this.props.scene, this.caption, [...this.selected]);
      } else {
        await this.sceneService.create(this.file, this.caption, [...this.selected]);
      }
      this.dismissPopover.emit(true);
    } catch (error) {
      console.error('Saving scene failed', error);
      this.saving = false;
    }
  }
}
