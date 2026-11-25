import { createClient, User } from '@supabase/supabase-js';
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

/**
 * Recorre todas las páginas de `auth.admin.listUsers` (Supabase devuelve máx. 50 por defecto).
 * Evita truncamiento silencioso al superar los primeros 50 o 1,000 usuarios registrados.
 */
export async function listAllAuthUsers(
  adminSupabase: ReturnType<typeof createAdminClient>
): Promise<User[]> {
  const allUsers: User[] = [];
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error(`[Admin Auth] Error listando usuarios (página ${page}):`, error);
      break;
    }

    const batch = data?.users || [];
    allUsers.push(...batch);

    if (batch.length < perPage) {
      break;
    }
    page += 1;
  }

  return allUsers;
}
