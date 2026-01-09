import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { faPlus, faCalendar, faStickyNote } from '@fortawesome/free-solid-svg-icons';

import type { EnrichedFlowItem } from '../../models';
import { FlowService } from '../../services/flow.service';
import { PopoverService } from '../../../core/services/popover.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { AddFlowItemComponent } from '../add-flow-item/add-flow-item.component';
import { EditNoteComponent } from '../../../notes/components/edit-note/edit-note.component';

@Component({
  selector: 'app-flow-view',
  templateUrl: './flow-view.component.html',
  styleUrls: ['./flow-view.component.scss']
})
export class FlowViewComponent implements OnInit {
  faPlus = faPlus;
  faCalendar = faCalendar;
  faStickyNote = faStickyNote;

  enrichedFlowItems$: Observable<EnrichedFlowItem[]>;
  loading = true;
  error: string | null = null;

  constructor(
    private flowService: FlowService,
    private popover: PopoverService,
    private navigation: NavigationService
  ) {}

  ngOnInit(): void {
    this.navigation.setPageLabel('Session Flow');
    this.enrichedFlowItems$ = this.flowService.getEnrichedFlowItems();

    // Subscribe to check loading state
    this.enrichedFlowItems$.subscribe(
      () => {
        this.loading = false;
      },
      (error) => {
        this.loading = false;
        this.error = 'Failed to load flow. Please try again.';
        console.error('Error loading flow:', error);
      }
    );
  }

  onDrop(event: CdkDragDrop<EnrichedFlowItem[]>): void {
    const items = [...(event.container.data || [])];
    moveItemInArray(items, event.previousIndex, event.currentIndex);

    // Update order in Firestore
    this.flowService.reorderItems(items).then(success => {
      if (!success) {
        console.error('Failed to reorder items');
      }
    });
  }

  showAddItemModal(): void {
    this.popover.showPopover('Element hinzufügen', AddFlowItemComponent, {});
  }

  showAddNoteModal(): void {
    this.popover.showPopover('Notiz hinzufügen', EditNoteComponent, {
      onSave: async (note) => {
        // Automatically add the newly created note to the flow
        await this.flowService.addItem({ type: 'note', noteId: note.id });
      }
    });
  }

  addSessionMarker(): void {
    this.flowService.addItem({
      type: 'session-marker',
      date: new Date()
    }).then(success => {
      if (!success) {
        console.error('Failed to add session marker');
      }
    });
  }

  removeItem(itemId: string): void {
    this.flowService.removeItem(itemId).then(success => {
      if (!success) {
        console.error('Failed to remove item');
      }
    });
  }
}
