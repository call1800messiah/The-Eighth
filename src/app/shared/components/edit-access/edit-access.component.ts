import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import type { PopoverChild } from '../../models/popover-child';
import type { User } from '../../../core/models/user';
import type { EditAccessProps } from '../../models/edit-access-props';
import { UserService } from '../../../core/services/user.service';
import { ApiService } from '../../../core/services/api.service';
import { RealtimeService } from '../../../core/services/supabase-realtime.service';
import { getEntityType } from '../../utils/entity-type';



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
    private realtime: RealtimeService,
    private userService: UserService,
  ) {
    this.userService.getUsers().subscribe(users => {
      this.users = users;
    });
  }

  ngOnInit(): void {
    this.api.from('document_access' as any)
      .select('user_id')
      .eq('entity_type', getEntityType(this.props.collection))
      .eq('entity_id', this.props.documentId)
      .then(({ data, error }) => {
        const accessUserIds = (data || []).map((row: any) => row.user_id);
        this.selected = this.users.reduce((all, user) => {
          // GMs and the owner always have access via RLS, not stored in document_access
          all[user.id] = user.isGM || user.id === this.props.ownerId || accessUserIds.includes(user.id);
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
      .eq('entity_type', getEntityType(this.props.collection))
      .eq('entity_id', this.props.documentId);

    // Insert new access entries (exclude GMs - they have access via RLS)
    const gmIds = new Set(this.users.filter(u => u.isGM).map(u => u.id));
    const selectedUserIds = Object.entries(this.selected)
      .filter(([id, selected]) => selected && !gmIds.has(id) && id !== this.props.ownerId)
      .map(([id]) => id);

    if (selectedUserIds.length > 0) {
      const rows = selectedUserIds.map(userId => ({
        entity_type: getEntityType(this.props.collection),
        entity_id: this.props.documentId,
        user_id: userId,
      }));
      await this.api.from('document_access' as any).insert(rows);
    }

    // Broadcast so other clients (including users who lost access) re-fetch
    this.realtime.broadcastAccessChange(getEntityType(this.props.collection));

    this.dismissPopover.emit(true);
  }


  allowAccessForAll() {
    Object.keys(this.selected).forEach((id) => {
      this.selected[id] = true;
    });
  }
}
