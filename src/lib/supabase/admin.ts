import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  if (url.includes('/auth/v1')) {
    url = url.split('/auth/v1')[0];
  }
  return url.replace(/\/+$/, '');
}

export function createAdminClient() {
  const env = process.env;
  const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || env['SUPABASE_URL'] || 'https://placeholder.supabase.co';
  const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || 'placeholder-service-role-key';

  return createClient<Database>(sanitizeSupabaseUrl(supabaseUrl), supabaseKey.trim(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
