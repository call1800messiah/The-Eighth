import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { DRAFT_TYPE_LABELS, Draft, DraftsService, McpConnection } from '../../../core/services/drafts.service';

/**
 * GM page for Claude: drafts to review, the connections that may create
 * them, and how to connect.
 */
@Component({
  selector: 'app-drafts',
  templateUrl: './drafts.component.html',
  styleUrls: ['./drafts.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class DraftsComponent {
  private auth = inject(AuthService);
  private drafts = inject(DraftsService);

  connections$: Observable<McpConnection[]> = this.drafts.getConnections();
  drafts$: Observable<Draft[]> = this.drafts.getDrafts();
  /** Draft or connection currently being changed, so its buttons disable. */
  busy: string | null = null;
  endpoint = new URL('/mcp', window.location.origin).href;
  typeLabels = DRAFT_TYPE_LABELS;
  user$ = this.auth.user$;


  async publish(draft: Draft) {
    await this.whileBusy(draft.id, () => this.drafts.publish(draft.type, draft.id));
  }


  async discard(draft: Draft) {
    if (!window.confirm(`„${draft.name}“ verwerfen? Der Entwurf wird gelöscht.`)) {
      return;
    }
    await this.whileBusy(draft.id, () => this.drafts.discard(draft.type, draft.id));
  }


  async revoke(connection: McpConnection) {
    if (!window.confirm(`Verbindung „${connection.clientName}“ trennen? Claude muss sich danach neu verbinden.`)) {
      return;
    }
    await this.whileBusy(connection.id, () => this.drafts.revoke(connection.id));
  }


  private async whileBusy(id: string, action: () => Promise<boolean>) {
    this.busy = id;
    try {
      if (!await action()) {
        window.alert('Das hat nicht geklappt. Bitte versuche es noch einmal.');
      }
    } finally {
      this.busy = null;
    }
  }
}
