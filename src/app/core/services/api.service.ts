import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SupabaseClient, User } from '@supabase/supabase-js';

import { SUPABASE_CLIENT } from '../providers/supabase.provider';
import type { Database } from '../../../types/supabase';

type TableName = keyof Database['public']['Tables'];
type FunctionName = keyof Database['public']['Functions'];

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private supabase = inject<SupabaseClient<Database>>(SUPABASE_CLIENT);



  from<T extends TableName>(table: T) {
    return this.supabase.from(table);
  }


  /**
   * Call a Postgres function. Prefer this over client-side writes when the
   * value must come from the database clock or be computed atomically.
   */
  rpc<F extends FunctionName>(fn: F, args?: Database['public']['Functions'][F]['Args']) {
    return this.supabase.rpc(fn, args as any);
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
