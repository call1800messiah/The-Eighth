import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';

import { PopoverChild } from '../../../shared/models/popover-child';
import { AuthService } from '../../../core/services/auth.service';
import { InventoryService } from '../../services/inventory.service';
import { InventoryItem } from '../../models/inventory-item';



@Component({
  selector: 'app-edit-item',
  templateUrl: './edit-item.component.html',
  styleUrls: ['./edit-item.component.scss']
})
export class EditItemComponent implements OnInit, OnDestroy, PopoverChild {
  @Input() props: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  itemForm = new FormGroup({
    amount: new FormControl(1),
    character: new FormControl(''),
    name: new FormControl(''),
    isPrivate: new FormControl(false),
  });
  userID: string;
  private subscription = new Subscription();

  constructor(
    private auth: AuthService,
    private inventory: InventoryService,
  ) {
    this.subscription.add(
      this.auth.user$.subscribe((user) => {
        this.userID = user.id;
      })
    );
  }

  ngOnInit(): void {
    if (this.props.id) {
      const item = this.props as InventoryItem;
      this.itemForm.patchValue(item);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  save() {
    const item: InventoryItem = {
      ...this.itemForm.value,
    };
    if (this.props.id) {
      item.owner = this.props.owner;
    } else {
      item.owner = this.userID;
    }
    this.inventory.store(item, this.props.id).then(() => {
      this.dismissPopover.emit(true);
    });
  }
}
