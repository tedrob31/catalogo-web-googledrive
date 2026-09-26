import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { invalidateTenantCatalogCache } from '@/lib/catalog-db';
import { purgeCloudflareCache } from '@/lib/cloudflare';

// GET: Obtener los bloques de Storefront del tenant actual
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Sin tenant asignado' }, { status: 403 });
    }

    const { data: config, error } = await supabase
      .from('tenant_configs')
      .select('settings')
      .eq('tenant_id', membership.tenant_id)
      .single();

    if (error || !config) {
      return NextResponse.json({ enabled: false, blocks: [] });
    }

    const settings = (config.settings as Record<string, any>) || {};
    return NextResponse.json(settings.storefront || { enabled: false, blocks: [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Guardar los bloques de Storefront en Supabase para el tenant actual
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('tenant_users')
      .select('tenant_id, role, tenants ( subdomain )')
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin', 'superadmin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Sin permisos de edición' }, { status: 403 });
    }

    const body = await request.json();
    const tenantId = membership.tenant_id;
    const adminClient = createAdminClient();

    // Obtener settings actuales
    const { data: currentConfig } = await adminClient
      .from('tenant_configs')
      .select('settings')
      .eq('tenant_id', tenantId)
      .single();

    const settings = (currentConfig?.settings as Record<string, any>) || {};
    settings.storefront = body;

    const { error: updateError } = await adminClient
      .from('tenant_configs')
      .update({
        settings,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    invalidateTenantCatalogCache(tenantId);
    revalidatePath('/', 'layout');

    const activeSubdomain = (membership.tenants as any)?.subdomain;
    if (activeSubdomain) {
      await purgeCloudflareCache({
        subdomain: activeSubdomain,
        purgeAll: true,
      });
    }

    return NextResponse.json({ success: true, message: 'Storefront guardado en Supabase' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
