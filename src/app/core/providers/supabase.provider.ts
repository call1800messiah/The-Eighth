import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../types/supabase';
import { environment } from '../../../environments/environment';

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient<Database>>('SupabaseClient');

function supabaseClientFactory(): SupabaseClient<Database> {
  const config = environment.tenantData[environment.tenant].supabase;
  const url = config.url || window.location.origin;
  return createClient<Database>(url, config.anonKey, {
    auth: {
      storageKey: `sb-${environment.tenant}-auth-token`,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // No `lock` option: since auth-js 2.107 refreshes are coordinated
      // without the Web Locks API (no more NavigatorLockAcquireTimeoutError
      // across tabs), and passing one is deprecated.
    },
  });
}

export const supabaseProvider = {
  provide: SUPABASE_CLIENT,
  useFactory: supabaseClientFactory,
};
