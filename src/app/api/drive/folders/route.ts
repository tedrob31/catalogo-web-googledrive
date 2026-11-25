import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { searchDriveFolders } from '@/lib/google-auth';
import { checkRateLimit } from '@/lib/rate-limit';

// GET: Buscar o listar carpetas de Google Drive del tenant autenticado
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const rl = checkRateLimit(`drive_folders:${user.id}`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas consultas a Google Drive. Espera un momento.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  const { data: membership } = await supabase
    .from('tenant_users')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'No tienes un tenant asignado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || undefined;

  try {
    const folders = await searchDriveFolders(membership.tenant_id, q);
    return NextResponse.json({ folders });
  } catch (error: unknown) {
    console.error('Error buscando carpetas en Drive:', error);
    const rawMsg = error instanceof Error ? error.message : String(error || '');
    const isAuthExpired =
      rawMsg.includes('invalid_grant') ||
      rawMsg.includes('expired') ||
      rawMsg.includes('revoked') ||
      rawMsg.includes('falta el refresh_token');
    if (isAuthExpired) {
      return NextResponse.json({ error: 'AUTH_EXPIRED' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al conectar con Google Drive' }, { status: 500 });
  }
}

// POST: Guardar las carpetas seleccionadas (Catálogo y Portadas)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from('tenant_users')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || !['owner', 'admin', 'superadmin'].includes(membership.role)) {
    return NextResponse.json({ error: 'No tienes permisos de edición' }, { status: 403 });
  }

  const body = await request.json();
  const { catalog_folder_id, catalog_folder_name, cover_folder_id, cover_folder_name } = body;

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from('google_integrations')
    .update({
      catalog_folder_id,
      catalog_folder_name,
      cover_folder_id,
      cover_folder_name,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', membership.tenant_id)
    .select('tenant_id, google_email, catalog_folder_id, catalog_folder_name, cover_folder_id, cover_folder_name, last_synced_at, is_connected')
    .single();

  if (error) {
    console.error('[Drive Folders POST] Error guardando carpetas:', error);
    return NextResponse.json({ error: 'Error al guardar las carpetas seleccionadas' }, { status: 500 });
  }

  return NextResponse.json({ success: true, integration: data });
}
