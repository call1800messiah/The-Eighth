import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { InventoryItem } from '../models/inventory-item';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { AuthUser } from '../../auth/models/auth-user';



@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  public static readonly collection = 'inventory';
  private inventory$: BehaviorSubject<InventoryItem[]>;
  private user: AuthUser;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private data: DataService,
  ) {
    this.user = this.auth.user;
  }



  getInventory(): Observable<InventoryItem[]> {
    if (!this.inventory$) {
      this.inventory$ = new BehaviorSubject([]);
      this.api.getDataFromCollection(
        InventoryService.collection,
        (ref) => ref
          .where('access', 'array-contains', this.user.id)
      ).pipe(
        map(this.transformInventory)
      ).subscribe((inventory) => {
        this.inventory$.next(inventory);
      });
    }
    return this.inventory$;
  }


  store(item: Partial<InventoryItem>, itemId?: string) {
    return this.data.store(item, InventoryService.collection, itemId);
  }



  private transformInventory(inventory: any[]): InventoryItem[] {
    return inventory.reduce((all, entry) => {
      const itemData = entry.payload.doc.data();
      const item = {
        id: entry.payload.doc.id,
        amount: itemData.amount,
        character: itemData.character,
        isPrivate: itemData.isPrivate,
        name: itemData.name,
        owner: itemData.owner,
      };
      all.push(item);
      return all;
    }, []);
  }
}
