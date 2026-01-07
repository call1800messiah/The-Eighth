import { Component, Input, Output, EventEmitter } from '@angular/core';
import { faCalendar, faTimes } from '@fortawesome/free-solid-svg-icons';

import type { SessionMarkerFlowItem } from '../../models';

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

  removeMarker(): void {
    if (confirm('Session-Marker entfernen?')) {
      this.remove.emit(this.item.id);
    }
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
