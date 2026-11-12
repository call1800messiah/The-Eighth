import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy, inject } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Quest } from '../../../quests';
import type { Person } from '../../../people';
import type { Place } from '../../../places/models/place';
import type { Note } from '../../../notes/models/note';
import { FlowService } from '../../services/flow.service';
import { QuestsService } from '../../../quests/services/quests.service';
import { PeopleService } from '../../../people/services/people.service';
import { PlaceService } from '../../../places/services/place.service';
import { NotesService } from '../../../notes/services/notes.service';
import { PopoverChild } from '../../../shared';
import { filterBySearch } from '../../../shared/utils/search';
import { markdownToPlainText } from '../../../shared/markdown/mentions';

export interface AddFlowItemProps {
  flowId: string;
}

@Component({
  selector: 'app-add-flow-item',
  templateUrl: './add-flow-item.component.html',
  styleUrls: ['./add-flow-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class AddFlowItemComponent implements OnInit, PopoverChild {
  private flowService = inject(FlowService);
  private questsService = inject(QuestsService);
  private peopleService = inject(PeopleService);
  private placesService = inject(PlaceService);
  private notesService = inject(NotesService);

  @Input() props: AddFlowItemProps;
  @Output() dismissPopover = new EventEmitter<boolean>();

  activeTab = 'quest';
  searchText$ = new BehaviorSubject<string>('');

  quests$: Observable<Quest[]>;
  people$: Observable<Person[]>;
  places$: Observable<Place[]>;
  notes$: Observable<Note[]>;
  filteredQuests$: Observable<Quest[]>;
  filteredPeople$: Observable<Person[]>;
  filteredPlaces$: Observable<Place[]>;
  filteredNotes$: Observable<Note[]>;

  selectedItems: string[] = [];
  preview = (text: string) => markdownToPlainText(text).slice(0, 35);

  ngOnInit(): void {
    this.quests$ = this.questsService.getQuests();
    this.people$ = this.peopleService.getPeople();
    this.places$ = this.placesService.getPlaces();
    this.notes$ = this.notesService.getNotes();

    // Setup filtered observables
    this.filteredQuests$ = combineLatest([
      this.quests$,
      this.searchText$
    ]).pipe(
      map(([quests, searchText]) => filterBySearch(quests, searchText, ['name']))
    );

    this.filteredPeople$ = combineLatest([
      this.people$,
      this.searchText$
    ]).pipe(
      map(([people, searchText]) => filterBySearch(people, searchText, ['name']))
    );

    this.filteredPlaces$ = combineLatest([
      this.places$,
      this.searchText$
    ]).pipe(
      map(([places, searchText]) => filterBySearch(places, searchText, ['name']))
    );

    this.filteredNotes$ = combineLatest([
      this.notes$,
      this.searchText$
    ]).pipe(
      map(([notes, searchText]) => filterBySearch(notes, searchText, ['title', 'content', 'category']))
    );
  }

  onTabChange(tabId: string): void {
    this.activeTab = tabId;
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
      } else if (this.activeTab === 'note') {
        return { type: 'note' as const, noteId: id };
      }
      return null;
    }).filter(item => item !== null);

    // Add all items in a single write
    await this.flowService.addItems(this.props.flowId, itemsToAdd);
    this.dismissPopover.emit(true);
  }
}
