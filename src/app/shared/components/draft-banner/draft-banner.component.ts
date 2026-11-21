import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

import { DraftType, DraftsService } from '../../../core/services/drafts.service';

const LIST_PATHS: Record<DraftType, string> = {
  person: '/people',
  place: '/places',
  quest: '/quests',
};

/**
 * Shown on a person, place or quest page while it is one of Claude's drafts,
 * so the GM can review it where they read it. Only GMs ever see drafts.
 */
@Component({
  selector: 'app-draft-banner',
  templateUrl: './draft-banner.component.html',
  styleUrls: ['./draft-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class DraftBannerComponent {
  private drafts = inject(DraftsService);
  private router = inject(Router);

  @Input() entityType: DraftType;
  @Input() entity: { id: string; name?: string; status?: string } | null | undefined;
  busy = false;


  async publish() {
    await this.run(() => this.drafts.publish(this.entityType, this.entity!.id));
  }


  async discard() {
    if (!window.confirm(`„${this.entity?.name ?? 'Entwurf'}“ verwerfen? Der Entwurf wird gelöscht.`)) {
      return;
    }
    if (await this.run(() => this.drafts.discard(this.entityType, this.entity!.id))) {
      this.router.navigateByUrl(LIST_PATHS[this.entityType]);
    }
  }


  private async run(action: () => Promise<boolean>): Promise<boolean> {
    this.busy = true;
    try {
      const ok = await action();
      if (!ok) {
        window.alert('Das hat nicht geklappt. Bitte versuche es noch einmal.');
      }
      return ok;
    } finally {
      this.busy = false;
    }
  }
}
