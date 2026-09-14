import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

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
      .select('tenant_id, tenants ( name, subdomain )')
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
      .select('tenant_id, role, tenants ( name, subdomain )')
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin', 'superadmin'].includes(membership.role)) {
      return NextResponse.json({ error: 'No tienes permisos de edición' }, { status: 403 });
    }

    const body = await request.json();
    const tenantId = membership.tenant_id;
    const tenantInfo = membership.tenants as { name: string; subdomain: string } | null;

    // 1. Obtener settings actuales para no sobreescribir bloques de storefront u otras propiedades
    const adminClient = createAdminClient();
    const { data: currentConfig } = await adminClient
      .from('tenant_configs')
      .select('settings')
      .eq('tenant_id', tenantId)
      .single();

    const existingSettings = (currentConfig?.settings as Record<string, any>) || {};

    // 2. Empaquetar configuraciones visuales avanzadas en settings JSONB
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
        title: body.siteTitle || tenantInfo?.name || 'Mi Catálogo',
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

    // Revalidar caché ISR de Next.js
    revalidatePath('/', 'layout');

    // Purgar caché en Cloudflare para el subdominio si está configurado
    const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'c4talogo.com';

    if (cfZoneId && cfToken && tenantInfo?.subdomain) {
      const tenantHostname = `${tenantInfo.subdomain}.${baseDomain}`;
      try {
        await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ hosts: [tenantHostname] }),
        });
      } catch (cfErr) {
        console.error('Error purgando Cloudflare en actualización de config:', cfErr);
      }
    }

    return NextResponse.json({ success: true, message: 'Configuración guardada exitosamente en Supabase' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
