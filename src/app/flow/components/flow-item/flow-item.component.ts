import { Component, Input, Output, EventEmitter, ViewChild, ViewContainerRef, ComponentRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { faTimes, faChevronDown, faChevronRight, faGripVertical, faMeteor, faUsers, faCompass } from '@fortawesome/free-solid-svg-icons';

import type { EnrichedFlowItem, EnrichedQuestFlowItem, EnrichedPersonFlowItem, EnrichedPlaceFlowItem } from '../../models';
import { QuestComponent } from '../../../quests/components/quest/quest.component';
import { PersonComponent } from '../../../people/components/person/person.component';
import { PlaceComponent } from '../../../places/components/place/place.component';

@Component({
  selector: 'app-flow-item',
  templateUrl: './flow-item.component.html',
  styleUrls: ['./flow-item.component.scss']
})
export class FlowItemComponent implements OnDestroy {
  @Input() item: EnrichedFlowItem;
  @Output() remove = new EventEmitter<string>();
  @ViewChild('detailContainer', { read: ViewContainerRef }) detailContainer: ViewContainerRef;

  faTimes = faTimes;
  faChevronDown = faChevronDown;
  faChevronRight = faChevronRight;
  faGripVertical = faGripVertical;
  faMeteor = faMeteor;
  faUsers = faUsers;
  faCompass = faCompass;

  expanded = false;
  private componentRef: ComponentRef<any> | null = null;

  constructor(
    private router: Router,
  ) {}

  ngOnDestroy(): void {
    this.destroyDetailComponent();
  }

  toggleExpand(): void {
    this.expanded = !this.expanded;

    if (this.expanded && this.hasEntity()) {
      // Dynamically load the detail component
      setTimeout(() => this.loadDetailComponent(), 0);
    } else {
      // Destroy the detail component
      this.destroyDetailComponent();
    }
  }

  private loadDetailComponent(): void {
    if (!this.detailContainer || this.componentRef) {
      return;
    }

    let component: any;
    let entityId: string;

    switch (this.item.type) {
      case 'quest':
        component = QuestComponent;
        entityId = (this.item as EnrichedQuestFlowItem).questId;
        break;
      case 'person':
        component = PersonComponent;
        entityId = (this.item as EnrichedPersonFlowItem).personId;
        break;
      case 'place':
        component = PlaceComponent;
        entityId = (this.item as EnrichedPlaceFlowItem).placeId;
        break;
      default:
        return;
    }

    // Clear the container
    this.detailContainer.clear();

    // Create the component
    this.componentRef = this.detailContainer.createComponent(component);

    // Set the entityId input
    this.componentRef.setInput('entityId', entityId);
  }

  private destroyDetailComponent(): void {
    if (this.componentRef) {
      this.componentRef.destroy();
      this.componentRef = null;
    }
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
