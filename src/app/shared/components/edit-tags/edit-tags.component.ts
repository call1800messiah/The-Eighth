import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

import type { PopoverChild } from '../../models/popover-child';
import type { EditTagsProps } from '../../models/edit-tags-props';

@Component({
  selector: 'app-edit-tags',
  templateUrl: './edit-tags.component.html',
  styleUrls: ['./edit-tags.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class EditTagsComponent implements OnInit, PopoverChild {
  @Output() dismissPopover = new EventEmitter<boolean>();
  @Input() props: EditTagsProps;
  faPlus = faPlus;
  faTrash = faTrash;
  newTag = '';
  tagsList: string[] = [];

  ngOnInit(): void {
    this.tagsList = [...(this.props.tags || [])];
  }

  addTag(): void {
    // A tag is unique per entity in the database, and the list is tracked by
    // value, so blanks and duplicates are dropped here.
    const tag = this.newTag.trim();
    if (tag && !this.tagsList.includes(tag)) {
      this.tagsList = [...this.tagsList, tag];
    }
    this.newTag = '';
  }

  removeTag(tag: string): void {
    this.tagsList = [...this.tagsList.filter((t) => t !== tag)];
  }

  async save(): Promise<void> {
    if (await this.props.save(this.tagsList)) {
      this.dismissPopover.emit(true);
    }
  }
}
