import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import type { PopoverChild } from '../../models/popover-child';
import type { User } from '../../../core/models/user';
import type { EditAccessProps } from '../../models/edit-access-props';
import { UserService } from '../../../core/services/user.service';
import { ApiService } from '../../../core/services/api.service';



@Component({
  selector: 'app-edit-access',
  templateUrl: './edit-access.component.html',
  styleUrls: ['./edit-access.component.scss']
})
export class EditAccessComponent implements OnInit, PopoverChild {
  @Input() props: EditAccessProps;
  @Output() dismissPopover = new EventEmitter<boolean>();
  selected: {[id: string]: boolean};
  users: User[];

  constructor(
    private api: ApiService,
    private userService: UserService,
  ) {
    this.userService.getUsers().subscribe(users => {
      this.users = users;
    });
  }

  ngOnInit(): void {
    this.api.from('document_access' as any)
      .select('user_id')
      .eq('entity_type', this.props.collection)
      .eq('entity_id', this.props.documentId)
      .then(({ data, error }) => {
        const accessUserIds = (data || []).map((row: any) => row.user_id);
        this.selected = this.users.reduce((all, user) => {
          all[user.id] = accessUserIds.includes(user.id);
          return all;
        }, {});
      });
  }



  accessChanged(event, user: User) {
    this.selected[user.id] = event.target.checked;
  }


  async save() {
    // Delete all existing access entries for this document
    await this.api.from('document_access' as any)
      .delete()
      .eq('entity_type', this.props.collection)
      .eq('entity_id', this.props.documentId);

    // Insert new access entries
    const selectedUserIds = Object.entries(this.selected)
      .filter(([, selected]) => selected)
      .map(([id]) => id);

    if (selectedUserIds.length > 0) {
      const rows = selectedUserIds.map(userId => ({
        entity_type: this.props.collection,
        entity_id: this.props.documentId,
        user_id: userId,
      }));
      await this.api.from('document_access' as any).insert(rows);
    }

    this.dismissPopover.emit(true);
  }


  allowAccessForAll() {
    Object.keys(this.selected).forEach((id) => {
      this.selected[id] = true;
    });
  }
}
