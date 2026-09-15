import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';

function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  if (url.includes('/auth/v1')) {
    url = url.split('/auth/v1')[0];
  }
  return url.replace(/\/+$/, '');
}

export async function createClient() {
  const cookieStore = await cookies();
  const env = process.env;
  const url = env['NEXT_PUBLIC_SUPABASE_URL'] || env['SUPABASE_URL'] || 'https://placeholder.supabase.co';
  const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || env['SUPABASE_ANON_KEY'] || 'placeholder-anon-key';

  return createServerClient<Database>(
    sanitizeSupabaseUrl(url),
    anonKey.trim(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignorado en contexto de Server Component
          }
        },
      },
    }
  );
}
