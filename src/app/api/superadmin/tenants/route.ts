import { NextResponse } from 'next/server';
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

export async function GET() {
  const isSuper = await checkSuperAdmin();
  if (!isSuper) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  const adminSupabase = createAdminClient();

  // 1. Obtener todos los tenants con sus planes y google_integrations
  const { data: dbTenants, error: tenantsError } = await adminSupabase
    .from('tenants')
    .select(`
      *,
      subscription_plans (*),
      google_integrations (google_email, is_connected, last_synced_at)
    `)
    .order('created_at', { ascending: false });

  if (tenantsError) {
    return NextResponse.json({ error: tenantsError.message }, { status: 500 });
  }

  // 2. Obtener los owners de cada tenant
  const { data: ownerUsers } = await adminSupabase
    .from('tenant_users')
    .select('tenant_id, user_id')
    .eq('role', 'owner');

  // 3. Mapear user_id a email de auth.users
  const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
  const authUserMap = new Map((authUsers?.users || []).map((u) => [u.id, u.email]));

  const tenantOwnerEmailMap = new Map<string, string>();
  for (const ou of ownerUsers || []) {
    const email = authUserMap.get(ou.user_id);
    if (email) {
      tenantOwnerEmailMap.set(ou.tenant_id, email);
    }
  }

  // Combinar información
  const enrichedTenants = (dbTenants || []).map((t: any) => {
    const authEmail = tenantOwnerEmailMap.get(t.id);
    const googleEmail = t.google_integrations?.google_email;
    const resolvedEmail = authEmail || googleEmail || 'Sin correo asociado';

    return {
      ...t,
      owner_email: resolvedEmail,
      google_email: googleEmail,
      auth_email: authEmail,
    };
  });

  return NextResponse.json({ tenants: enrichedTenants });
}
