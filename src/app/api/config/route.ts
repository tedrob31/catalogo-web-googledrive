import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import {
  purgeCloudflareCache,
  registerCustomHostnameInCloudflare,
  removeCustomHostnameFromCloudflare,
} from '@/lib/cloudflare';
import { invalidateTenantCatalogCache } from '@/lib/catalog-db';

// GET: Obtener la configuración visual y de marca del tenant actual
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('tenant_users')
      .select('tenant_id, tenants ( name, subdomain, custom_domain, custom_domain_enabled )')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Sin tenant asignado' }, { status: 403 });
    }

    const { data: config, error } = await supabase
      .from('tenant_configs')
      .select('*')
      .eq('tenant_id', membership.tenant_id)
      .single();

    if (error || !config) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 });
    }

    const rawSettings = (config.settings as Record<string, any>) || {};

    const fullConfig = {
      siteTitle: config.title,
      siteDescription: config.subtitle || '',
      whatsappNumber: config.whatsapp || '',
      logoUrl: config.logo_url || '',
      favicon: config.favicon_url || '',
      primaryColor: config.primary_color,
      theme: config.theme,
      secondaryColor: rawSettings.secondary_color || '#ffffff',
      textColor: rawSettings.text_color || '',
      backgroundImage: rawSettings.background_image || '',
      gridColumns: rawSettings.grid_columns || 5,
      mobileGridColumns: rawSettings.mobile_grid_columns || 2,
      hideAlbumTitles: rawSettings.hide_album_titles || false,
      cardBorderWidth: rawSettings.card_border_width || 1,
      cardBorderColor: rawSettings.card_border_color || '',
      seasonalEffect: rawSettings.seasonal_effect || 'none',
      seasonalCustomIcon: rawSettings.seasonal_custom_icon || '',
      seasonalDuration: rawSettings.seasonal_duration || 0,
      clickEffect: rawSettings.click_effect || 'none',
      folderCovers: rawSettings.folder_covers || {},
      ogImage: rawSettings.og_image || '',
      forceGlobalOgImage: Boolean(rawSettings.force_global_og_image),
      custom_domain: (membership.tenants as any)?.custom_domain || '',
      custom_domain_enabled: Boolean((membership.tenants as any)?.custom_domain_enabled),
    };

    return NextResponse.json(fullConfig);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Guardar configuración visual y efectos en Supabase por tenant
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('tenant_users')
      .select('tenant_id, role, tenants ( name, subdomain, custom_domain, custom_domain_enabled )')
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin', 'superadmin'].includes(membership.role)) {
      return NextResponse.json({ error: 'No tienes permisos de edición' }, { status: 403 });
    }

    const body = await request.json();
    const tenantId = membership.tenant_id;
    const tenantInfo = membership.tenants as {
      name: string;
      subdomain: string;
      custom_domain: string | null;
      custom_domain_enabled: boolean;
    } | null;

    // 1. Obtener settings actuales para no sobreescribir bloques de storefront u otras propiedades
    const adminClient = createAdminClient();
    const { data: currentConfig } = await adminClient
      .from('tenant_configs')
      .select('settings')
      .eq('tenant_id', tenantId)
      .single();

    const existingSettings = (currentConfig?.settings as Record<string, any>) || {};

    // 2. Si se solicitó cambio de subdominio o nombre comercial, validar y actualizar tenants
    let activeSubdomain = tenantInfo?.subdomain || '';
    if (body.subdomain !== undefined && body.subdomain !== null) {
      const cleanSub = String(body.subdomain).toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
      const reserved = ['app', 'api', 'www', 'admin', 'dashboard', 'cdn', 'static', 'mail', 'superadmin'];
      if (reserved.includes(cleanSub)) {
        return NextResponse.json(
          { error: `El subdominio "${cleanSub}" está reservado por el sistema. Por favor elige otro.` },
          { status: 400 }
        );
      }
      if (cleanSub.length < 3) {
        return NextResponse.json(
          { error: 'El subdominio debe tener al menos 3 caracteres.' },
          { status: 400 }
        );
      }

      if (cleanSub !== tenantInfo?.subdomain) {
        const { data: existingTenant } = await adminClient
          .from('tenants')
          .select('id')
          .eq('subdomain', cleanSub)
          .neq('id', tenantId)
          .maybeSingle();

        if (existingTenant) {
          return NextResponse.json(
            { error: `El subdominio "${cleanSub}" ya está ocupado por otra tienda. Por favor elige un subdominio diferente.` },
            { status: 400 }
          );
        }
        activeSubdomain = cleanSub;
      }
    }

    // 2.1 Procesar Custom Domain (si está habilitado para este tenant)
    let updatedCustomDomain: string | null | undefined = undefined;
    const requestedCustomDomain = body.custom_domain !== undefined ? body.custom_domain : body.customDomain;
    if (requestedCustomDomain !== undefined) {
      const isEnabled = Boolean(tenantInfo?.custom_domain_enabled);
      const rawDomain = String(requestedCustomDomain || '').trim();

      if (rawDomain !== '') {
        if (!isEnabled) {
          return NextResponse.json(
            { error: 'Tu tienda aún no tiene habilitada la función de Dominio Personalizado. Contacta al soporte para activarla.' },
            { status: 403 }
          );
        }

        // Sanitizar
        let cleanDomain = rawDomain.toLowerCase().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].replace(/[^a-z0-9.-]/g, '');
        if (!cleanDomain.includes('.') || cleanDomain.length < 4) {
          return NextResponse.json(
            { error: 'El dominio ingresado no es válido (ej: tiendajuan.com o catalogo.tiendajuan.com)' },
            { status: 400 }
          );
        }

        const baseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN || 'c4talogo.com').toLowerCase();
        if (cleanDomain === baseDomain || cleanDomain.endsWith(`.${baseDomain}`)) {
          return NextResponse.json(
            { error: `No puedes ingresar ${baseDomain} como dominio propio.` },
            { status: 400 }
          );
        }

        // Validar unicidad
        const { data: existingDomainTenant } = await adminClient
          .from('tenants')
          .select('id, name')
          .eq('custom_domain', cleanDomain)
          .neq('id', tenantId)
          .maybeSingle();

        if (existingDomainTenant) {
          return NextResponse.json(
            { error: `El dominio "${cleanDomain}" ya está registrado en otra tienda.` },
            { status: 400 }
          );
        }

        updatedCustomDomain = cleanDomain;
      } else {
        // Permitir borrar el dominio si el usuario lo vacía
        updatedCustomDomain = null;
      }
    }

    const tenantUpdateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    let needsTenantUpdate = false;

    if (body.name !== undefined && body.name !== tenantInfo?.name) {
      tenantUpdateData.name = body.name;
      needsTenantUpdate = true;
    }
    if (activeSubdomain !== tenantInfo?.subdomain) {
      tenantUpdateData.subdomain = activeSubdomain;
      needsTenantUpdate = true;
    }
    if (updatedCustomDomain !== undefined && updatedCustomDomain !== tenantInfo?.custom_domain) {
      tenantUpdateData.custom_domain = updatedCustomDomain;
      needsTenantUpdate = true;
    }

    if (needsTenantUpdate) {
      const { error: tUpdateErr } = await adminClient
        .from('tenants')
        .update(tenantUpdateData as any)
        .eq('id', tenantId);

      if (tUpdateErr) {
        console.error('Error actualizando tabla tenants en Supabase:', tUpdateErr);
        return NextResponse.json({ error: tUpdateErr.message }, { status: 500 });
      }

      // Sincronizar automáticamente con Cloudflare for SaaS (Custom Hostnames)
      if (updatedCustomDomain !== undefined && updatedCustomDomain !== tenantInfo?.custom_domain) {
        if (updatedCustomDomain) {
          // Desvincular el dominio anterior si existía
          if (tenantInfo?.custom_domain && tenantInfo.custom_domain !== updatedCustomDomain) {
            removeCustomHostnameFromCloudflare(tenantInfo.custom_domain).catch((e) =>
              console.error('[Cloudflare for SaaS] Error desvinculando host anterior:', e)
            );
          }
          // Registrar el nuevo dominio en Cloudflare for SaaS
          registerCustomHostnameInCloudflare(updatedCustomDomain).catch((e) =>
            console.error('[Cloudflare for SaaS] Error registrando custom hostname:', e)
          );
        } else if (tenantInfo?.custom_domain) {
          // Si el usuario eliminó su dominio personalizado, removerlo de Cloudflare
          removeCustomHostnameFromCloudflare(tenantInfo.custom_domain).catch((e) =>
            console.error('[Cloudflare for SaaS] Error desvinculando host:', e)
          );
        }
      }
    }

    // 3. Empaquetar configuraciones visuales avanzadas en settings JSONB
    const settingsPayload = {
      ...existingSettings,
      secondary_color: body.secondaryColor !== undefined ? body.secondaryColor : (existingSettings.secondary_color || '#ffffff'),
      text_color: body.textColor !== undefined ? body.textColor : (existingSettings.text_color || ''),
      background_image: body.backgroundImage !== undefined ? body.backgroundImage : (existingSettings.background_image || ''),
      grid_columns: Number(body.gridColumns) || existingSettings.grid_columns || 5,
      mobile_grid_columns: Number(body.mobileGridColumns) || existingSettings.mobile_grid_columns || 2,
      hide_album_titles: body.hideAlbumTitles !== undefined ? Boolean(body.hideAlbumTitles) : Boolean(existingSettings.hide_album_titles),
      card_border_width: body.cardBorderWidth !== undefined ? Number(body.cardBorderWidth) : (existingSettings.card_border_width ?? 1),
      card_border_color: body.cardBorderColor !== undefined ? body.cardBorderColor : (existingSettings.card_border_color || ''),
      seasonal_effect: body.seasonalEffect !== undefined ? body.seasonalEffect : (existingSettings.seasonal_effect || 'none'),
      seasonal_custom_icon: body.seasonalCustomIcon !== undefined ? body.seasonalCustomIcon : (existingSettings.seasonal_custom_icon || ''),
      seasonal_duration: body.seasonalDuration !== undefined ? Number(body.seasonalDuration) : (existingSettings.seasonal_duration || 0),
      click_effect: body.clickEffect !== undefined ? body.clickEffect : (existingSettings.click_effect || 'none'),
      folder_covers: body.folderCovers !== undefined ? body.folderCovers : (existingSettings.folder_covers || {}),
      og_image: body.ogImage !== undefined ? body.ogImage : (existingSettings.og_image || ''),
      force_global_og_image: body.forceGlobalOgImage !== undefined ? Boolean(body.forceGlobalOgImage) : Boolean(existingSettings.force_global_og_image),
    };

    const { error: updateError } = await adminClient
      .from('tenant_configs')
      .update({
        title: body.siteTitle || body.name || tenantInfo?.name || 'Mi Catálogo',
        subtitle: body.siteDescription || null,
        whatsapp: body.whatsappNumber || null,
        logo_url: body.logoUrl || null,
        favicon_url: body.favicon || null,
        primary_color: body.primaryColor || '#111827',
        theme: body.theme || 'light',
        settings: settingsPayload,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Error actualizando tenant_configs en Supabase:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Revalidar caché en memoria RAM e ISR de Next.js
    invalidateTenantCatalogCache(tenantId);
    revalidatePath('/', 'layout');

    // Purgar el subdominio del inquilino por Hostname en Cloudflare para reflejar cambios de diseño
    if (activeSubdomain) {
      await purgeCloudflareCache({
        subdomain: activeSubdomain,
        purgeAll: true,
      });
    }

    return NextResponse.json({ success: true, message: 'Configuración guardada exitosamente en Supabase' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
