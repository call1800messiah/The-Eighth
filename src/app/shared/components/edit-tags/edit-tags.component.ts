import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

import type { PopoverChild } from '../../models/popover-child';
import type { EditTagsProps } from '../../models/edit-tags-props';
import { DataService } from '../../../core/services/data.service';

@Component({
  selector: 'app-edit-tags',
  templateUrl: './edit-tags.component.html',
  styleUrls: ['./edit-tags.component.scss']
})
export class EditTagsComponent implements OnInit, PopoverChild {
  @Output() dismissPopover = new EventEmitter<boolean>();
  @Input() props: EditTagsProps;
  faPlus = faPlus;
  faTrash = faTrash;
  newTag = '';
  tagsList: string[] = [];

  constructor(
    private dataService: DataService,
  ) {}

  ngOnInit(): void {
    this.tagsList = [...this.props.tags];
  }

  addTag(): void {
    this.tagsList.push(this.newTag);
    this.newTag = '';
  }

  removeTag(tag: string): void {
    this.tagsList = [...this.tagsList.filter((t) => t !== tag)];
  }

  save(): void {
    this.dataService.store({ tags: this.tagsList }, this.props.collection, this.props.id).then((stuff) => {
      this.dismissPopover.emit(true);
    });
  }
}
