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
    this.api.getItemFromCollection(`${this.props.collection}/${this.props.documentId}`).subscribe((item: any) => {
      this.selected = this.users.reduce((all, user) => {
        all[user.id] = item.payload.data()?.access?.indexOf(user.id) !== -1;
        return all;
      }, {});
    });
  }



  accessChanged(event, user: User) {
    this.selected[user.id] = event.target.checked;
  }


  save() {
    this.api.updateDocumentInCollection(this.props.documentId, this.props.collection, {
      access: Object.entries(this.selected).filter(([, selected]) => selected).map(([id]) => id)
    }).then(() => {
      this.dismissPopover.emit(true);
    });
  }


  allowAccessForAll() {
    Object.keys(this.selected).forEach((id) => {
      this.selected[id] = true;
    });
  }
}
