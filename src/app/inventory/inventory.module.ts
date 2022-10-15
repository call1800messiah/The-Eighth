import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ListComponent } from './components/list/list.component';
import { SharedModule } from '../shared/shared.module';
import { EditItemComponent } from './components/edit-item/edit-item.component';
import { InventoryRoutingModule } from './inventory-routing.module';



@NgModule({
  declarations: [
    ListComponent,
    EditItemComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    InventoryRoutingModule,
  ],
})
export class InventoryModule { }
