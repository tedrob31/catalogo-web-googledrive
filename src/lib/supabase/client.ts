import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database.types';

function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  if (url.includes('/auth/v1')) {
    url = url.split('/auth/v1')[0];
  }
  return url.replace(/\/+$/, '');
}

export function createClient() {
  let url = '';
  let anonKey = '';

  // 1. Prioridad: Leer en el navegador las variables inyectadas en tiempo de ejecución por el servidor (Portainer/.env)
  if (typeof window !== 'undefined') {
    const runtimeEnv = (window as any).__ENV__;
    if (runtimeEnv?.NEXT_PUBLIC_SUPABASE_URL && !runtimeEnv.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder.supabase.co')) {
      url = runtimeEnv.NEXT_PUBLIC_SUPABASE_URL;
    }
    if (runtimeEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY && runtimeEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder-anon-key') {
      anonKey = runtimeEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
  }

  // 2. Si no están en window o estamos en SSR, leer de process.env dinámico
  if (!url) {
    const env = process.env;
    const dynamicUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || env['SUPABASE_URL'];
    if (dynamicUrl && !dynamicUrl.includes('placeholder.supabase.co')) {
      url = dynamicUrl;
    } else {
      url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    }
  }

  if (!anonKey) {
    const env = process.env;
    const dynamicKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || env['SUPABASE_ANON_KEY'];
    if (dynamicKey && dynamicKey !== 'placeholder-anon-key') {
      anonKey = dynamicKey;
    } else {
      anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
    }
  }

  return createBrowserClient<Database>(sanitizeSupabaseUrl(url), anonKey.trim());
}
