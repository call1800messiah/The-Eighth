import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { faBars, faChevronDown, faChevronRight, faGripVertical } from '@fortawesome/free-solid-svg-icons';

import type { EnrichedFlowItem, EnrichedQuestFlowItem, EnrichedPersonFlowItem, EnrichedPlaceFlowItem } from '../../models';
import type { Menu } from '../../../shared/models/menu';
import { DataService } from '../../../core/services/data.service';

@Component({
  selector: 'app-flow-item',
  templateUrl: './flow-item.component.html',
  styleUrls: ['./flow-item.component.scss']
})
export class FlowItemComponent {
  @Input() item: EnrichedFlowItem;
  @Output() remove = new EventEmitter<string>();

  faBars = faBars;
  faChevronDown = faChevronDown;
  faChevronRight = faChevronRight;
  faGripVertical = faGripVertical;

  expanded = false;
  menu: Menu;
  menuOpen = false;

  constructor(
    private router: Router,
    private data: DataService
  ) {
    this.menu = {
      actions: [
        {
          label: 'Aus Flow entfernen',
          action: this.removeItem.bind(this)
        }
      ]
    };
  }

  toggleExpand(): void {
    this.expanded = !this.expanded;
  }

  navigateToEntity(): void {
    if (!this.item || !(this.item as any).entity) {
      return;
    }

    if (this.item.type === 'quest') {
      this.router.navigate(['/quests', (this.item as EnrichedQuestFlowItem).questId]);
    } else if (this.item.type === 'person') {
      this.router.navigate(['/people', (this.item as EnrichedPersonFlowItem).personId]);
    } else if (this.item.type === 'place') {
      this.router.navigate(['/places', (this.item as EnrichedPlaceFlowItem).placeId]);
    }
  }

  toggleContextMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  removeItem(): void {
    this.remove.emit(this.item.id);
  }

  getEntityName(): string {
    const entity = (this.item as any).entity;
    if (!entity) {
      return 'Gelöschtes Element';
    }
    return entity.name || 'Unbenannt';
  }

  getTypeLabel(): string {
    switch (this.item.type) {
      case 'quest':
        return 'Quest';
      case 'person':
        return 'Person';
      case 'place':
        return 'Ort';
      default:
        return '';
    }
  }

  hasEntity(): boolean {
    return !!(this.item as any).entity;
  }
}
