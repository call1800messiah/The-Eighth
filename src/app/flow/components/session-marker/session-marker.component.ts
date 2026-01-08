import { Component, Input, Output, EventEmitter } from '@angular/core';
import { faCalendar, faTimes, faEdit, faCheck } from '@fortawesome/free-solid-svg-icons';

import type { SessionMarkerFlowItem } from '../../models';
import { FlowService } from '../../services/flow.service';

@Component({
  selector: 'app-session-marker',
  templateUrl: './session-marker.component.html',
  styleUrls: ['./session-marker.component.scss']
})
export class SessionMarkerComponent {
  @Input() item: SessionMarkerFlowItem;
  @Output() remove = new EventEmitter<string>();

  faCalendar = faCalendar;
  faTimes = faTimes;
  faEdit = faEdit;
  faCheck = faCheck;

  editing = false;
  editDate: string = '';

  constructor(private flowService: FlowService) {}

  startEdit(): void {
    this.editing = true;
    // Convert Date to YYYY-MM-DD format for input[type="date"]
    const date = typeof this.item.date === 'string' ? new Date(this.item.date) : this.item.date;
    this.editDate = this.formatDateForInput(date);
  }

  cancelEdit(): void {
    this.editing = false;
    this.editDate = '';
  }

  async saveEdit(): Promise<void> {
    if (this.editDate) {
      const newDate = new Date(this.editDate);
      await this.flowService.updateSessionMarker(this.item.id, newDate as any);
      this.editing = false;
    }
  }

  removeMarker(): void {
    this.remove.emit(this.item.id);
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getFormattedDate(): string {
    if (!this.item.date) {
      return '';
    }
    const date = typeof this.item.date === 'string' ? new Date(this.item.date) : this.item.date;
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
