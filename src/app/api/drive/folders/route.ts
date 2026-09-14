import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchDriveFolders } from '@/lib/google-auth';

// GET: Buscar o listar carpetas de Google Drive del tenant autenticado
export async function GET(request: NextRequest) {
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

  if (!membership) {
    return NextResponse.json({ error: 'No tienes un tenant asignado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || undefined;

  try {
    const folders = await searchDriveFolders(membership.tenant_id, q);
    return NextResponse.json({ folders });
  } catch (error: any) {
    console.error('Error buscando carpetas en Drive:', error);
    return NextResponse.json({ error: error.message || 'Error al conectar con Google Drive' }, { status: 500 });
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

  const { data, error } = await supabase
    .from('google_integrations')
    .update({
      catalog_folder_id,
      catalog_folder_name,
      cover_folder_id,
      cover_folder_name,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', membership.tenant_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, integration: data });
}
