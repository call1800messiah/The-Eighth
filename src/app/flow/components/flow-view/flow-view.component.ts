import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { faPlus, faStickyNote, faEdit } from '@fortawesome/free-solid-svg-icons';

import type { EnrichedFlowItem, Flow } from '../../models';
import { FlowService } from '../../services/flow.service';
import { PopoverService } from '../../../core/services/popover.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { AddFlowItemComponent } from '../add-flow-item/add-flow-item.component';
import { EditNoteComponent } from '../../../notes/components/edit-note/edit-note.component';
import { EditFlowComponent } from '../edit-flow/edit-flow.component';
import { AuthService } from '../../../core/services/auth.service';
import { AuthUser } from '../../../auth/models/auth-user';

@Component({
  selector: 'app-flow-view',
  templateUrl: './flow-view.component.html',
  styleUrls: ['./flow-view.component.scss']
})
export class FlowViewComponent implements OnInit, OnDestroy {
  faPlus = faPlus;
  faStickyNote = faStickyNote;
  faEdit = faEdit;

  flowId: string;
  flow$: Observable<Flow | null>;
  enrichedFlowItems$: Observable<EnrichedFlowItem[]>;
  loading = true;
  error: string | null = null;
  user: AuthUser;

  private subscription = new Subscription();

  constructor(
    private auth: AuthService,
    private flowService: FlowService,
    private popover: PopoverService,
    private navigation: NavigationService,
    private route: ActivatedRoute
  ) {
    this.user = this.auth.user;
  }

  ngOnInit(): void {
    // Get flowId from route params
    this.subscription.add(
      this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.flowId = id;
          this.loadFlow();
        } else {
          this.error = 'Keine Flow-ID angegeben';
          this.loading = false;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadFlow(): void {
    this.flow$ = this.flowService.getFlowById(this.flowId);
    this.enrichedFlowItems$ = this.flowService.getEnrichedFlowItems(this.flowId);

    // Update page label with flow date/title
    this.subscription.add(
      this.flow$.subscribe(flow => {
        if (flow) {
          const label = flow.title
            ? `${flow.title} (${flow.date.toLocaleDateString('de-DE')})`
            : flow.date.toLocaleDateString('de-DE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
          this.navigation.setPageLabel(label, '/flow');
          this.error = null;
          this.loading = false;
        } else {
          this.error = 'Flow nicht gefunden';
          this.loading = false;
        }
      })
    );
  }

  onDrop(event: CdkDragDrop<EnrichedFlowItem[]>): void {
    const items = [...(event.container.data || [])];
    moveItemInArray(items, event.previousIndex, event.currentIndex);

    // Update order in Firestore
    this.flowService.reorderItems(this.flowId, items).then(success => {
      if (!success) {
        console.error('Failed to reorder items');
      }
    });
  }

  showAddItemModal(): void {
    this.popover.showPopover('Element hinzufügen', AddFlowItemComponent, {
      flowId: this.flowId
    });
  }

  showAddNoteModal(): void {
    this.popover.showPopover('Notiz hinzufügen', EditNoteComponent, {
      onSave: async (note) => {
        // Automatically add the newly created note to the flow
        await this.flowService.addItem(this.flowId, { type: 'note', noteId: note.id });
      }
    });
  }

  showEditFlowModal(): void {
    this.subscription.add(
      this.flow$.pipe(take(1)).subscribe(flow => {
        if (flow) {
          this.popover.showPopover('Session bearbeiten', EditFlowComponent, flow);
        }
      })
    );
  }

  removeItem(itemId: string): void {
    this.flowService.removeItem(this.flowId, itemId).then(success => {
      if (!success) {
        console.error('Failed to remove item');
      }
    });
  }
}
