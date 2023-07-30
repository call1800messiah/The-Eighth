import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';

import type { AccessControlledItem } from '../../../core/models/access-controlled-item';
import type { AuthUser } from '../../../auth/models/auth-user';
import type { User } from '../../../core/models/user';
import { UserService } from '../../../core/services/user.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditAccessComponent } from '../edit-access/edit-access.component';
import { AuthService } from '../../../core/services/auth.service';



@Component({
  selector: 'app-access-indicator',
  templateUrl: './access-indicator.component.html',
  styleUrls: ['./access-indicator.component.scss']
})
export class AccessIndicatorComponent implements OnInit, OnDestroy, OnChanges {
  @Input() item: AccessControlledItem;
  accessState = 'none';
  user: AuthUser;
  usersWithAccess: string[] = [];
  private subscription = new Subscription();
  private users: User[] = [];

  constructor(
    private auth: AuthService,
    private popover: PopoverService,
    private userService: UserService,
  ) {
    this.user = this.auth.user;
  }

  ngOnInit(): void {
    this.subscription.add(
      this.userService.getUsers().subscribe((users) => {
        this.users = users;
        this.calculateAccessState();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes.item.previousValue || changes.item.previousValue.id !== changes.item.currentValue.id) {
      this.calculateAccessState();
    }
  }

  editAccess(event: MouseEvent) {
    event.stopImmediatePropagation();
    this.popover.showPopover('Zugriff regeln', EditAccessComponent, {
      collection: this.item.collection,
      documentId: this.item.id,
    });
  }

  private calculateAccessState(): void {
    let accessByThirdParty = false;
    this.usersWithAccess = this.item.access.map((id) => {
      const user = this.users.find((u) => {
        if (u.id === id) {
          if (!u.isGM && u.id !== this.item.owner) {
            accessByThirdParty = true;
          }
          return true;
        }
        return false;
      });
      return user ? user.name : '';
    }).sort();

    if (this.item.access.length === this.users.length) {
      this.accessState = 'all';
    } else if (accessByThirdParty) {
      this.accessState = 'some';
    } else {
      this.accessState = 'none';
    }
  }
}
