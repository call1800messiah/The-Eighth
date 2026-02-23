import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter, pairwise } from 'rxjs/operators';

import type { AccessControlledItem } from '../../../core/models/access-controlled-item';
import type { AuthUser } from '../../../auth/models/auth-user';
import type { User } from '../../../core/models/user';
import { ApiService } from '../../../core/services/api.service';
import { UserService } from '../../../core/services/user.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditAccessComponent } from '../edit-access/edit-access.component';
import { AuthService } from '../../../core/services/auth.service';
import { RealtimeService } from '../../../core/services/supabase-realtime.service';
import { getEntityType } from '../../utils/entity-type';



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
    private api: ApiService,
    private auth: AuthService,
    private popover: PopoverService,
    private realtime: RealtimeService,
    private userService: UserService,
  ) {
    this.user = this.auth.user;
  }

  ngOnInit(): void {
    this.subscription.add(
      this.userService.getUsers().subscribe((users) => {
        this.users = users;
        this.fetchAccessState();
      })
    );

    this.subscription.add(
      this.popover.isPopoverVisible$.pipe(
        pairwise(),
        filter(([prev, curr]) => prev === true && curr === false),
      ).subscribe(() => {
        this.fetchAccessState();
      })
    );

    // Re-fetch whenever document_access changes on any client
    this.subscription.add(
      this.realtime.watch<any>('document_access').subscribe(() => {
        this.fetchAccessState();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes.item.previousValue || changes.item.previousValue.id !== changes.item.currentValue.id) {
      this.fetchAccessState();
    }
  }

  editAccess(event: MouseEvent) {
    event.stopImmediatePropagation();
    this.popover.showPopover('Zugriff regeln', EditAccessComponent, {
      collection: this.item.collection,
      documentId: this.item.id,
      ownerId: this.item.owner,
    });
  }

  private async fetchAccessState(): Promise<void> {
    if (!this.item || this.users.length === 0) {
      return;
    }

    const { data, error } = await this.api.from('document_access' as any)
      .select('user_id')
      .eq('entity_type', getEntityType(this.item.collection))
      .eq('entity_id', this.item.id) as { data: any; error: any };

    if (error) {
      this.accessState = 'none';
      this.usersWithAccess = [];
      return;
    }

    const explicitAccessUserIds: string[] = (data || []).map((row: any) => row.user_id);

    // GMs and owner always have access (via RLS), not stored in document_access
    const allAccessUserIds = new Set(explicitAccessUserIds);
    this.users.forEach(u => {
      if (u.isGM || u.id === this.item.owner) {
        allAccessUserIds.add(u.id);
      }
    });

    let accessByThirdParty = explicitAccessUserIds.some(
      id => this.users.find(u => u.id === id && !u.isGM && u.id !== this.item.owner)
    );

    this.usersWithAccess = [...allAccessUserIds]
      .map(id => this.users.find(u => u.id === id)?.name || '')
      .filter(name => name !== '')
      .sort();

    const nonGmNonOwnerUsers = this.users.filter(u => !u.isGM && u.id !== this.item.owner);
    const allHaveAccess = nonGmNonOwnerUsers.length > 0 &&
      nonGmNonOwnerUsers.every(u => explicitAccessUserIds.includes(u.id));

    if (allHaveAccess) {
      this.accessState = 'all';
    } else if (accessByThirdParty) {
      this.accessState = 'some';
    } else {
      this.accessState = 'none';
    }
  }
}
