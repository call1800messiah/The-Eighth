import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { InventoryItem } from '../models/inventory-item';
import { DataService } from '../../core/services/data.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';



@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  public static readonly collection = 'inventory';
  private inventory$: BehaviorSubject<InventoryItem[]>;

  constructor(
    private data: DataService,
    private realtime: RealtimeService,
  ) {}



  getInventory(): Observable<InventoryItem[]> {
    if (!this.inventory$) {
      this.inventory$ = new BehaviorSubject([]);
      this.realtime.watch<any>(
        'inventory',
        undefined,
        'inventory',
      ).pipe(
        map(InventoryService.transformInventory),
      ).subscribe(inventory => {
        this.inventory$.next(inventory);
      });
    }
    return this.inventory$;
  }


  store(item: Partial<InventoryItem>, itemId?: string) {
    return this.data.store(item, InventoryService.collection, itemId);
  }



  private static transformInventory(rows: any[]): InventoryItem[] {
    return rows.map(row => ({
      id: row.id,
      amount: row.amount,
      character: row.character,
      isPrivate: false,
      name: row.name,
      owner: row.owner_id,
    }));
  }
}
