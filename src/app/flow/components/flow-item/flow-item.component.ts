import { Component, Input, Output, EventEmitter, ViewChild, ViewContainerRef, ComponentRef, OnDestroy } from '@angular/core';
import { faTimes, faChevronDown, faChevronRight, faGripVertical, faMeteor, faUsers, faCompass, faStickyNote } from '@fortawesome/free-solid-svg-icons';

import type { EnrichedFlowItem, EnrichedQuestFlowItem, EnrichedPersonFlowItem, EnrichedPlaceFlowItem, EnrichedNoteFlowItem } from '../../models';
import { QuestComponent } from '../../../quests/components/quest/quest.component';
import { PersonComponent } from '../../../people/components/person/person.component';
import { PlaceComponent } from '../../../places/components/place/place.component';
import { NoteComponent } from '../../../notes/components/note/note.component';
import { AuthService } from '../../../core/services/auth.service';
import { AuthUser } from '../../../auth/models/auth-user';

@Component({
  selector: 'app-flow-item',
  templateUrl: './flow-item.component.html',
  styleUrls: ['./flow-item.component.scss']
})
export class FlowItemComponent implements OnDestroy {
  @Input() item: EnrichedFlowItem;
  @Input() dragEnabled: boolean = true;
  @Output() remove = new EventEmitter<string>();
  @ViewChild('detailContainer', { read: ViewContainerRef }) detailContainer: ViewContainerRef;

  faTimes = faTimes;
  faChevronDown = faChevronDown;
  faChevronRight = faChevronRight;
  faGripVertical = faGripVertical;
  faMeteor = faMeteor;
  faUsers = faUsers;
  faCompass = faCompass;
  faStickyNote = faStickyNote;

  expanded = false;
  user: AuthUser;
  private componentRef: ComponentRef<any> | null = null;

  constructor(
    private auth: AuthService
  ) {
    this.user = this.auth.user;
  }

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
      case 'note':
        component = NoteComponent;
        entityId = (this.item as EnrichedNoteFlowItem).noteId;
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

  removeItem(): void {
    this.remove.emit(this.item.id);
  }

  getEntityName(): string {
    const entity = (this.item as any).entity;
    if (!entity) {
      return 'Unbekanntes Element';
    }
    return entity.name || entity.title || 'Unbenannt';
  }

  hasEntity(): boolean {
    return !!(this.item as any).entity;
  }
}
