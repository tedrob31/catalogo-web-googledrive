import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

export function createAdminClient() {
  const env = process.env;
  const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || env['SUPABASE_URL'] || 'https://placeholder.supabase.co';
  const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || 'placeholder-service-role-key';

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
