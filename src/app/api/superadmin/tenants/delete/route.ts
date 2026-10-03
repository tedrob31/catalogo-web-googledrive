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

    // 1b. Obtener el usuario owner y su email para limpiar la lista blanca y auth
    const { data: ownerUsers } = await adminSupabase
      .from('tenant_users')
      .select('user_id, role')
      .eq('tenant_id', tenant.id);

    const { data: googleIntegration } = await adminSupabase
      .from('google_integrations')
      .select('google_email')
      .eq('tenant_id', tenant.id)
      .maybeSingle();

    const emailsToUnwhitelist = new Set<string>();
    if (googleIntegration?.google_email) {
      emailsToUnwhitelist.add(googleIntegration.google_email.toLowerCase().trim());
    }

    const userIdsToDelete: string[] = [];
    for (const ou of ownerUsers || []) {
      const { data: authUserData } = await adminSupabase.auth.admin.getUserById(ou.user_id);
      if (authUserData?.user?.email) {
        emailsToUnwhitelist.add(authUserData.user.email.toLowerCase().trim());
      }

      // Proteger cuentas que tengan rol superadmin
      const { data: userAllRoles } = await adminSupabase
        .from('tenant_users')
        .select('role')
        .eq('user_id', ou.user_id);

      const isSuperUser = userAllRoles?.some((r: any) => r.role === 'superadmin');
      if (!isSuperUser) {
        userIdsToDelete.push(ou.user_id);
      }
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

    // 5. Eliminar el correo de platform_whitelist para que si vuelve a ingresar NO se recree la tienda
    for (const email of emailsToUnwhitelist) {
      await adminSupabase
        .from('platform_whitelist' as any)
        .delete()
        .eq('email', email);
    }

    // 6. Eliminar usuario de auth.users si no es superadmin
    for (const uid of userIdsToDelete) {
      try {
        await adminSupabase.auth.admin.deleteUser(uid);
      } catch (e) {
        console.warn(`[Delete Tenant] No se pudo eliminar usuario auth ${uid}:`, e);
      }
    }

    console.log(
      `[SuperAdmin] Tienda '${tenant.subdomain}' (${tenant.id}) dada de baja exitosamente. ` +
      `Objetos R2 borrados: ${deletedR2Count}. Correos desautorizados: ${Array.from(emailsToUnwhitelist).join(', ')}`
    );

    return NextResponse.json({
      success: true,
      message: `La tienda '${tenant.name}' (${tenant.subdomain}) fue dada de baja con éxito. Se eliminaron ${deletedR2Count} archivos de Cloudflare R2 y se revocó la autorización en la fase de prueba.`,
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
