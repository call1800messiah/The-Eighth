import { Component, OnInit } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Quest } from '../../../quests/models/quest';
import type { Person } from '../../../people/models/person';
import type { Place } from '../../../places/models/place';
import { FlowService } from '../../services/flow.service';
import { QuestsService } from '../../../quests/services/quests.service';
import { PeopleService } from '../../../people/services/people.service';
import { PlaceService } from '../../../places/services/place.service';
import { PopoverService } from '../../../core/services/popover.service';

@Component({
  selector: 'app-add-flow-item',
  templateUrl: './add-flow-item.component.html',
  styleUrls: ['./add-flow-item.component.scss']
})
export class AddFlowItemComponent implements OnInit {
  activeTab: 'quest' | 'person' | 'place' | 'session' | 'note' = 'quest';
  searchText$ = new BehaviorSubject<string>('');

  quests$: Observable<Quest[]>;
  people$: Observable<Person[]>;
  places$: Observable<Place[]>;
  filteredQuests$: Observable<Quest[]>;
  filteredPeople$: Observable<Person[]>;
  filteredPlaces$: Observable<Place[]>;

  selectedItems: string[] = [];
  sessionDate: Date = new Date();
  noteContent = '';

  constructor(
    private flowService: FlowService,
    private questsService: QuestsService,
    private peopleService: PeopleService,
    private placesService: PlaceService,
    private popover: PopoverService
  ) {}

  ngOnInit(): void {
    this.quests$ = this.questsService.getQuests();
    this.people$ = this.peopleService.getPeople();
    this.places$ = this.placesService.getPlaces();

    // Setup filtered observables
    this.filteredQuests$ = this.searchText$.pipe(
      map(searchText => searchText.toLowerCase()),
      map(searchText => {
        return this.filterBySearch(this.quests$, searchText, 'name');
      })
    );

    this.filteredPeople$ = this.searchText$.pipe(
      map(searchText => searchText.toLowerCase()),
      map(searchText => {
        return this.filterBySearch(this.people$, searchText, 'name');
      })
    );

    this.filteredPlaces$ = this.searchText$.pipe(
      map(searchText => searchText.toLowerCase()),
      map(searchText => {
        return this.filterBySearch(this.places$, searchText, 'name');
      })
    );
  }

  private filterBySearch(source$: Observable<any[]>, searchText: string, field: string): any[] {
    // Note: This is a simplified filter. In a real app, you'd combine the observable properly.
    // For now, returning empty array as placeholder
    return [];
  }

  switchTab(tab: 'quest' | 'person' | 'place' | 'session' | 'note'): void {
    this.activeTab = tab;
    this.selectedItems = [];
    this.searchText$.next('');
  }

  onSearchChange(text: string): void {
    this.searchText$.next(text);
  }

  toggleSelection(id: string): void {
    const index = this.selectedItems.indexOf(id);
    if (index > -1) {
      this.selectedItems.splice(index, 1);
    } else {
      this.selectedItems.push(id);
    }
  }

  isSelected(id: string): boolean {
    return this.selectedItems.indexOf(id) > -1;
  }

  async addSelected(): Promise<void> {
    if (this.selectedItems.length === 0) {
      return;
    }

    const promises = this.selectedItems.map(id => {
      let itemData: any = {};
      if (this.activeTab === 'quest') {
        itemData = { type: 'quest', questId: id };
      } else if (this.activeTab === 'person') {
        itemData = { type: 'person', personId: id };
      } else if (this.activeTab === 'place') {
        itemData = { type: 'place', placeId: id };
      }
      return this.flowService.addItem(itemData);
    });

    await Promise.all(promises);
    this.close();
  }

  async addSessionMarker(): Promise<void> {
    await this.flowService.addItem({
      type: 'session-marker',
      date: this.sessionDate
    });
    this.close();
  }

  async addGeneralNote(): Promise<void> {
    if (!this.noteContent.trim()) {
      return;
    }

    await this.flowService.addItem({
      type: 'general-note',
      content: this.noteContent
    });
    this.close();
  }

  close(): void {
    this.popover.dismissPopover();
  }
}
