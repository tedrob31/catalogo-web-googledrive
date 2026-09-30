import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteTenantPrefixFromR2 } from '@/lib/r2';
import { invalidateTenantCatalogCache } from '@/lib/catalog-db';

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

export async function POST(req: NextRequest) {
  const isSuper = await checkSuperAdmin();
  if (!isSuper) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  try {
    const { tenant_id } = await req.json();

    if (!tenant_id) {
      return NextResponse.json({ error: 'Se requiere tenant_id' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // 1. Obtener datos de la tienda antes de borrarla
    const { data: tenant, error: fetchError } = await adminSupabase
      .from('tenants')
      .select('id, name, subdomain')
      .eq('id', tenant_id)
      .single();

    if (fetchError || !tenant) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 });
    }

    // 2. Limpieza física de Cloudflare R2 (fotos, miniaturas y portadas)
    const deletedR2Count = await deleteTenantPrefixFromR2(tenant.id);

    // 3. Invalidar caché en RAM del servidor
    invalidateTenantCatalogCache(tenant.id);
    invalidateTenantCatalogCache(tenant.subdomain);

    // 4. Eliminar el inquilino en Supabase (ON DELETE CASCADE borra álbumes, fotos, configs, integraciones y tenant_users)
    const { error: deleteTenantError } = await adminSupabase
      .from('tenants')
      .delete()
      .eq('id', tenant.id);

    if (deleteTenantError) {
      throw new Error(`Error eliminando tienda de Supabase: ${deleteTenantError.message}`);
    }

    console.log(`[SuperAdmin] Tienda '${tenant.subdomain}' (${tenant.id}) dada de baja exitosamente. Objetos R2 borrados: ${deletedR2Count}`);

    return NextResponse.json({
      success: true,
      message: `La tienda '${tenant.name}' (${tenant.subdomain}) fue dada de baja con éxito. Se eliminaron ${deletedR2Count} archivos de Cloudflare R2 y todos sus datos en Supabase.`,
      deletedR2Count,
    });
  } catch (error: any) {
    console.error('[Delete Tenant Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al dar de baja la tienda' },
      { status: 500 }
    );
  }
}
