import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SupabaseClient, User } from '@supabase/supabase-js';

import { SUPABASE_CLIENT } from '../providers/supabase.provider';
import type { Database } from '../../../types/supabase';

type TableName = keyof Database['public']['Tables'];

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(
    @Inject(SUPABASE_CLIENT) private supabase: SupabaseClient<Database>,
  ) {}


  from<T extends TableName>(table: T) {
    return this.supabase.from(table);
  }


  getAuthState(): Observable<User | null> {
    return new Observable(subscriber => {
      this.supabase.auth.getSession().then(({ data }) => {
        subscriber.next(data.session?.user ?? null);
      });

      const { data: { subscription } } = this.supabase.auth.onAuthStateChange((_event, session) => {
        subscriber.next(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    });
  }


  login(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }


  logout() {
    return this.supabase.auth.signOut();
  }


  get storage() {
    return this.supabase.storage;
  }
}
