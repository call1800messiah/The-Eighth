import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { faPlus, faCalendar, faStickyNote } from '@fortawesome/free-solid-svg-icons';

import type { EnrichedFlowItem } from '../../models';
import { FlowService } from '../../services/flow.service';
import { PopoverService } from '../../../core/services/popover.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { AddFlowItemComponent } from '../add-flow-item/add-flow-item.component';

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

  addGeneralNote(): void {
    // Add empty note that can be edited inline
    this.flowService.addItem({
      type: 'general-note',
      content: ''
    }).then(success => {
      if (!success) {
        console.error('Failed to add general note');
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
