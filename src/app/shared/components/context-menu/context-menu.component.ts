import { Component, Input, OnInit } from '@angular/core';

import type { Menu } from '../../models/menu';
import type { MenuAction } from '../../models/menu-action';
import { AuthUser } from '../../../auth/models/auth-user';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss']
})
export class ContextMenuComponent implements OnInit {
  @Input() menu: Menu;
  @Input() owner: string;
  actions: MenuAction[];
  user: AuthUser;

  constructor(
    private auth: AuthService,
  ) {
    this.user = this.auth.user;
  }

  ngOnInit(): void {
    this.actions = this.menu.actions.filter(item => {
      return !item.restricted || this.user.isGM || this.user.id === this.owner;
    }, {});
  }
}
