import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function checkSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: roles } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('user_id', user.id);

  return roles?.some((r: any) => r.role === 'superadmin') || false;
}

// GET: Obtener lista blanca y estado de closed_beta_enabled
export async function GET() {
  const isSuper = await checkSuperAdmin();
  if (!isSuper) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  const adminSupabase = createAdminClient();

  // 1. Obtener correos de la lista blanca
  const { data: whitelistRows, error: wlError } = await adminSupabase
    .from('platform_whitelist' as any)
    .select('*')
    .order('created_at', { ascending: false });

  if (wlError) {
    console.error('Error fetching platform_whitelist:', wlError);
  }

  // 2. Obtener estado de closed_beta_enabled
  const { data: betaSetting }: any = await adminSupabase
    .from('system_settings' as any)
    .select('value')
    .eq('key', 'closed_beta_enabled')
    .maybeSingle();

  const isClosedBeta = betaSetting?.value !== false && betaSetting?.value !== 'false';

  // 3. Obtener correos con tiendas activas para saber si ya crearon tienda
  const { data: activeOwners } = await adminSupabase
    .from('tenant_users')
    .select('tenant_id, tenants (name, subdomain, status)')
    .eq('role', 'owner');

  const { data: allUsers } = await adminSupabase.auth.admin.listUsers();
  const userMap = new Map((allUsers?.users || []).map((u) => [u.id, u.email?.toLowerCase()]));

  const activeEmailSet = new Set<string>();
  for (const row of activeOwners || []) {
    const email = userMap.get((row as any).user_id);
    if (email) activeEmailSet.add(email);
  }

  const items = (whitelistRows || []).map((w: any) => ({
    email: w.email,
    created_at: w.created_at,
    has_active_store: activeEmailSet.has(w.email?.toLowerCase()),
  }));

  return NextResponse.json({
    whitelist: items,
    closed_beta_enabled: isClosedBeta,
  });
}

// POST: Agregar un correo a la lista blanca
export async function POST(req: NextRequest) {
  const isSuper = await checkSuperAdmin();
  if (!isSuper) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Correo electrónico requerido' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json({ error: 'Formato de correo inválido' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from('platform_whitelist' as any)
      .insert({ email: cleanEmail });

    if (error && !error.message.includes('duplicate key')) {
      throw error;
    }

    return NextResponse.json({ success: true, email: cleanEmail });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al agregar a la lista blanca' }, { status: 500 });
  }
}

// DELETE: Quitar un correo de la lista blanca
export async function DELETE(req: NextRequest) {
  const isSuper = await checkSuperAdmin();
  if (!isSuper) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Correo requerido' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from('platform_whitelist' as any)
      .delete()
      .eq('email', cleanEmail);

    if (error) throw error;

    return NextResponse.json({ success: true, removed: cleanEmail });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al eliminar de la lista blanca' }, { status: 500 });
  }
}

// PATCH: Alternar closed_beta_enabled (true / false)
export async function PATCH(req: NextRequest) {
  const isSuper = await checkSuperAdmin();
  if (!isSuper) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  try {
    const { closed_beta_enabled } = await req.json();
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from('system_settings' as any)
      .upsert({
        key: 'closed_beta_enabled',
        value: Boolean(closed_beta_enabled),
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    return NextResponse.json({ success: true, closed_beta_enabled: Boolean(closed_beta_enabled) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error actualizando modo beta' }, { status: 500 });
  }
}
