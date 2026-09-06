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
      // Bypass Web Locks API to avoid NavigatorLockAcquireTimeoutError when
      // multiple tabs contend on the same lock. With a unique storageKey per
      // tenant the token is isolated, so skipping the lock is safe here.
      lock: (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn(),
    },
  });
}

export const supabaseProvider = {
  provide: SUPABASE_CLIENT,
  useFactory: supabaseClientFactory,
};
