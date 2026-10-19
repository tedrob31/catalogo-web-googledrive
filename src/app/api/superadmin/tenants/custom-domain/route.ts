import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

export function sanitizeCustomDomain(raw: string): string {
  let domain = raw.trim().toLowerCase();
  // Eliminar protocolo si fue ingresado por error
  domain = domain.replace(/^https?:\/\//i, '');
  // Eliminar barras finales o rutas
  domain = domain.split('/')[0];
  // Eliminar puertos si hubiera
  domain = domain.split(':')[0];
  // Eliminar caracteres inválidos
  domain = domain.replace(/[^a-z0-9.-]/g, '');
  return domain;
}

export async function POST(req: NextRequest) {
  try {
    const isSuper = await checkSuperAdmin();
    if (!isSuper) {
      return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { tenant_id, custom_domain_enabled, custom_domain } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id es requerido' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    let cleanDomain: string | null = null;
    if (custom_domain !== undefined && custom_domain !== null && String(custom_domain).trim() !== '') {
      cleanDomain = sanitizeCustomDomain(String(custom_domain));

      // Validar longitud y estructura
      if (!cleanDomain.includes('.') || cleanDomain.length < 4) {
        return NextResponse.json(
          { error: 'El dominio ingresado no es válido (ej: tiendajuan.com o catalogo.tiendajuan.com)' },
          { status: 400 }
        );
      }

      // Restricción de dominios propios de la plataforma
      const baseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN || 'c4talogo.com').toLowerCase();
      if (cleanDomain === baseDomain || cleanDomain.endsWith(`.${baseDomain}`)) {
        return NextResponse.json(
          { error: `No puedes usar ${baseDomain} como dominio personalizado. Usa los subdominios estándar para eso.` },
          { status: 400 }
        );
      }

      // Validar unicidad
      const { data: existing } = await adminSupabase
        .from('tenants')
        .select('id, name')
        .eq('custom_domain', cleanDomain)
        .neq('id', tenant_id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: `El dominio "${cleanDomain}" ya está asignado a otra tienda (${existing.name}).` },
          { status: 400 }
        );
      }
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (custom_domain_enabled !== undefined) {
      updatePayload.custom_domain_enabled = Boolean(custom_domain_enabled);
      // Si se deshabilita, opcionalmente se puede mantener el dominio guardado o conservarlo
    }

    if (custom_domain !== undefined) {
      updatePayload.custom_domain = cleanDomain;
    }

    const { data: updatedTenant, error: updateErr } = await adminSupabase
      .from('tenants')
      .update(updatePayload as any)
      .eq('id', tenant_id)
      .select('id, name, subdomain, custom_domain, custom_domain_enabled')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Invalidar caché en RAM del catálogo para que tome el nuevo host de inmediato
    invalidateTenantCatalogCache(tenant_id);

    return NextResponse.json({
      success: true,
      tenant: updatedTenant,
    });
  } catch (err: any) {
    console.error('[Custom Domain Superadmin Error]:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
