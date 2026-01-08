import { Component, Input, Output, EventEmitter } from '@angular/core';
import { faStickyNote, faEdit, faTimes, faCheck } from '@fortawesome/free-solid-svg-icons';

import type { GeneralNoteFlowItem } from '../../models';
import { FlowService } from '../../services/flow.service';

@Component({
  selector: 'app-general-note',
  templateUrl: './general-note.component.html',
  styleUrls: ['./general-note.component.scss']
})
export class GeneralNoteComponent {
  @Input() item: GeneralNoteFlowItem;
  @Output() remove = new EventEmitter<string>();

  faStickyNote = faStickyNote;
  faEdit = faEdit;
  faTimes = faTimes;
  faCheck = faCheck;

  editing = false;
  editContent = '';

  constructor(private flowService: FlowService) {}

  startEdit(): void {
    this.editing = true;
    this.editContent = this.item.content;
  }

  cancelEdit(): void {
    this.editing = false;
    this.editContent = '';
  }

  async saveEdit(): Promise<void> {
    if (this.editContent.trim()) {
      await this.flowService.updateGeneralNote(this.item.id, this.editContent);
      this.editing = false;
    }
  }

  removeNote(): void {
    this.remove.emit(this.item.id);
  }
}
