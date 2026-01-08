import { Component, OnInit } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Quest } from '../../../quests';
import type { Person } from '../../../people';
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
  activeTab: 'quest' | 'person' | 'place' = 'quest';
  searchText$ = new BehaviorSubject<string>('');

  quests$: Observable<Quest[]>;
  people$: Observable<Person[]>;
  places$: Observable<Place[]>;
  filteredQuests$: Observable<Quest[]>;
  filteredPeople$: Observable<Person[]>;
  filteredPlaces$: Observable<Place[]>;

  selectedItems: string[] = [];

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
    this.filteredQuests$ = combineLatest([
      this.quests$,
      this.searchText$
    ]).pipe(
      map(([quests, searchText]) => this.filterBySearch(quests, searchText.toLowerCase(), 'name'))
    );

    this.filteredPeople$ = combineLatest([
      this.people$,
      this.searchText$
    ]).pipe(
      map(([people, searchText]) => this.filterBySearch(people, searchText.toLowerCase(), 'name'))
    );

    this.filteredPlaces$ = combineLatest([
      this.places$,
      this.searchText$
    ]).pipe(
      map(([places, searchText]) => this.filterBySearch(places, searchText.toLowerCase(), 'name'))
    );
  }

  private filterBySearch(items: any[], searchText: string, field: string): any[] {
    if (!searchText || searchText.trim() === '') {
      return items;
    }
    return items.filter(item =>
      item[field]?.toLowerCase().includes(searchText)
    );
  }

  switchTab(tab: 'quest' | 'person' | 'place'): void {
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

    // Build all items first
    const itemsToAdd = this.selectedItems.map(id => {
      if (this.activeTab === 'quest') {
        return { type: 'quest' as const, questId: id };
      } else if (this.activeTab === 'person') {
        return { type: 'person' as const, personId: id };
      } else if (this.activeTab === 'place') {
        return { type: 'place' as const, placeId: id };
      }
      return null;
    }).filter(item => item !== null);

    // Add all items in a single Firebase write
    await this.flowService.addItems(itemsToAdd);
    this.close();
  }

  close(): void {
    this.popover.dismissPopover();
  }
}
