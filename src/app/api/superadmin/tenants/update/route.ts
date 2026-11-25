import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { invalidateTenantCatalogCache } from '@/lib/catalog-db';
import { purgeCloudflareCache } from '@/lib/cloudflare';

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

  return roles?.some((r) => r.role === 'superadmin') || false;
}

export async function POST(req: NextRequest) {
  const isSuper = await checkSuperAdmin();
  if (!isSuper) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { tenant_id, status, plan_id } = body;

    if (!tenant_id || typeof tenant_id !== 'string') {
      return NextResponse.json({ error: 'tenant_id es requerido' }, { status: 400 });
    }

    const updatePayload: { status?: string; plan_id?: string; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) {
      if (!['active', 'suspended', 'trial'].includes(status)) {
        return NextResponse.json({ error: 'Estado de tienda inválido' }, { status: 400 });
      }
      updatePayload.status = status;
    }

    if (plan_id !== undefined) {
      if (typeof plan_id !== 'string' || !plan_id.trim()) {
        return NextResponse.json({ error: 'plan_id inválido' }, { status: 400 });
      }
      updatePayload.plan_id = plan_id.trim();
    }

    const adminSupabase = createAdminClient();
    const { data: updatedTenant, error } = await adminSupabase
      .from('tenants')
      .update(updatePayload)
      .eq('id', tenant_id)
      .select('id, subdomain, custom_domain, status, plan_id')
      .single();

    if (error || !updatedTenant) {
      console.error('[SuperAdmin Tenant Update] Error:', error);
      return NextResponse.json({ error: 'No se pudo actualizar la tienda' }, { status: 500 });
    }

    // Invalidar inmediatamente en memoria RAM y purgar Cloudflare si existe subdominio
    invalidateTenantCatalogCache(updatedTenant.id);
    if (updatedTenant.subdomain) {
      invalidateTenantCatalogCache(updatedTenant.subdomain);
      await purgeCloudflareCache({
        subdomain: updatedTenant.subdomain,
        purgeAll: true,
      });
    }
    if (updatedTenant.custom_domain) {
      invalidateTenantCatalogCache(updatedTenant.custom_domain);
    }

    return NextResponse.json({ success: true, tenant: updatedTenant });
  } catch (err) {
    console.error('[SuperAdmin Tenant Update] Excepción:', err);
    return NextResponse.json({ error: 'Error interno al actualizar tienda' }, { status: 500 });
  }
}
