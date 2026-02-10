import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { User } from '../models/user';
import { RealtimeService } from './supabase-realtime.service';

interface UserRow {
  id: string;
  name: string;
  view_banner: boolean;
  view_name: boolean;
  view_title: boolean;
  user_roles: { role: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private users$: Observable<User[]>;

  constructor(
    private realtime: RealtimeService,
  ) {}


  private static transformUsers(rows: UserRow[]): User[] {
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      isGM: row.user_roles?.some(r => r.role === 'gm') ?? false,
      viewBanner: row.view_banner,
      viewName: row.view_name,
      viewTitle: row.view_title,
    }));
  }


  getUsers(): Observable<User[]> {
    if (!this.users$) {
      this.users$ = this.realtime.watch<UserRow>(
        'users',
        query => query.select('*, user_roles(role)'),
        'users',
      ).pipe(
        map(UserService.transformUsers),
      );
    }

    return this.users$;
  }
}
