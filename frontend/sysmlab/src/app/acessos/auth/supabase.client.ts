import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../enviroments/enviroment';

export let supabase: SupabaseClient;

export function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }
  return supabase;
}
