import { ChangeDetectionStrategy, Component, Input, OnChanges, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Backlink, MentionService } from '../../../core/services/mention.service';
import type { MentionEntityType } from '../../markdown/mentions';

/** "Erwähnt in": the texts that mention an entity, as far as the viewer can see them. */
@Component({
  selector: 'app-backlinks',
  templateUrl: './backlinks.component.html',
  styleUrls: ['./backlinks.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class BacklinksComponent implements OnChanges {
  private mentions = inject(MentionService);

  @Input() entityType: MentionEntityType;
  @Input() entityId: string;
  backlinks$: Observable<Backlink[]> = of([]);

  ngOnChanges() {
    this.backlinks$ = this.entityType && this.entityId
      ? this.mentions.getBacklinks(this.entityType, this.entityId)
      : of([]);
  }
}
