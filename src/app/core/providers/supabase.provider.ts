import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../types/supabase';
import { environment } from '../../../environments/environment';

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient<Database>>('SupabaseClient');

function supabaseClientFactory(): SupabaseClient<Database> {
  const config = environment.tenantData[environment.tenant].supabase;
  return createClient<Database>(config.url, config.anonKey);
}

export const supabaseProvider = {
  provide: SUPABASE_CLIENT,
  useFactory: supabaseClientFactory,
};
