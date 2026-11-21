import { Component, Input } from '@angular/core';
import type { InGameDate } from '@the-eighth/fantasy-calendar';

/** An in-game date in the viewer's calendar, or the old text if it was not converted yet. */
@Component({
  selector: 'app-in-game-date',
  templateUrl: './in-game-date.component.html',
  styleUrls: ['./in-game-date.component.scss'],
  standalone: false,
})
export class InGameDateComponent {
  @Input() date: InGameDate | null = null;
  @Input() legacy: string | null | undefined;
  @Input() calendar: string | undefined;
}
