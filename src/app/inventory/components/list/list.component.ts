import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import { InventoryService } from '../../services/inventory.service';
import { InventoryItem } from '../../models/inventory-item';
import { PopoverService } from '../../../core/services/popover.service';
import { EditItemComponent } from '../edit-item/edit-item.component';



@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  faPlus = faPlus;
  filteredItems$: Observable<InventoryItem[]>;
  filterText: BehaviorSubject<string>;

  constructor(
    private inventory: InventoryService,
    private popover: PopoverService,
  ) {
    this.filterText = new BehaviorSubject<string>('');
    this.filteredItems$ = combineLatest([
      this.inventory.getInventory(),
      this.filterText,
    ]).pipe(
      map(this.filterItems)
    );
  }

  ngOnInit(): void {
  }


  onFilterChanged(text: string) {
    this.filterText.next(text);
  }


  showAddDialog() {
    this.popover.showPopover('Neuer Gegenstand', EditItemComponent);
  }


  showEditDialog(item: InventoryItem) {
    this.popover.showPopover('Gegenstand bearbeiten', EditItemComponent, item);
  }


  private filterItems(data): InventoryItem[] {
    const [items, text] = data;
    return items.filter((item: InventoryItem) => {
      return text === ''
        || item.name.toLowerCase().indexOf(text.toLowerCase()) !== -1
        || item.character.toLowerCase().indexOf(text.toLowerCase()) !== -1;
    });
  }
}
