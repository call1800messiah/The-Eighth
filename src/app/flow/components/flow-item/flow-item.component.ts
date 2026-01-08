import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { faTimes, faChevronDown, faChevronRight, faGripVertical, faMeteor, faUsers, faCompass } from '@fortawesome/free-solid-svg-icons';

import type { EnrichedFlowItem, EnrichedQuestFlowItem, EnrichedPersonFlowItem, EnrichedPlaceFlowItem } from '../../models';

@Component({
  selector: 'app-flow-item',
  templateUrl: './flow-item.component.html',
  styleUrls: ['./flow-item.component.scss']
})
export class FlowItemComponent {
  @Input() item: EnrichedFlowItem;
  @Output() remove = new EventEmitter<string>();

  faTimes = faTimes;
  faChevronDown = faChevronDown;
  faChevronRight = faChevronRight;
  faGripVertical = faGripVertical;
  faMeteor = faMeteor;
  faUsers = faUsers;
  faCompass = faCompass;

  expanded = false;

  constructor(
    private router: Router,
  ) {}

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

  hasEntity(): boolean {
    return !!(this.item as any).entity;
  }
}
