import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOAuth2Client } from '@/lib/google-auth';
import { invalidateTenantCatalogCache } from '@/lib/catalog-db';

/**
 * POST /api/auth/google/disconnect
 * Desvincula la cuenta de Google Drive del tenant:
 * 1. Revoca el token en los servidores de Google OAuth 2.0 (OWASP ASVS / CASA Requirement).
 * 2. Limpia los tokens y carpetas asociadas en la tabla google_integrations.
 * 3. Invalida la caché del catálogo en memoria.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar pertenencia y rol en el tenant
    const { data: membership } = await supabase
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin', 'superadmin'].includes(membership.role)) {
      return NextResponse.json({ error: 'No tienes permisos para desvincular Google Drive' }, { status: 403 });
    }

    const tenantId = membership.tenant_id;
    const adminSupabase = createAdminClient();

    // Obtener tokens actuales para revocación
    const { data: integration } = await adminSupabase
      .from('google_integrations')
      .select('refresh_token, access_token')
      .eq('tenant_id', tenantId)
      .single();

    const tokenToRevoke = integration?.refresh_token || integration?.access_token;

    // 1. Revocar token ante Google
    if (tokenToRevoke) {
      try {
        const oauth2Client = getOAuth2Client();
        await oauth2Client.revokeToken(tokenToRevoke);
        console.log(`[Google OAuth] Token revocado exitosamente ante Google para tenant ${tenantId}`);
      } catch (revokeErr: any) {
        // Si el usuario ya lo revocó en myaccount.google.com o expiró, registramos y continuamos
        console.warn(`[Google OAuth] Advertencia al revocar token en Google (continuando con limpieza local):`, revokeErr?.message || revokeErr);
      }
    }

    // 2. Limpiar datos de integración en la base de datos
    const { error: dbError } = await adminSupabase
      .from('google_integrations')
      .update({
        refresh_token: null,
        access_token: null,
        token_expires_at: null,
        google_email: null,
        catalog_folder_id: null,
        catalog_folder_name: null,
        cover_folder_id: null,
        cover_folder_name: null,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);

    if (dbError) {
      console.error('[Google OAuth] Error limpiando tokens en Supabase:', dbError);
      return NextResponse.json({ error: 'Error al limpiar tokens en la base de datos' }, { status: 500 });
    }

    // 3. Invalidar la memoria RAM del catálogo para este tenant
    try {
      invalidateTenantCatalogCache(tenantId);
    } catch (cacheErr) {
      console.warn('[Google OAuth] Error invalidando caché en RAM:', cacheErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Cuenta de Google Drive desvinculada y tokens revocados correctamente.',
    });
  } catch (err: any) {
    console.error('[Google OAuth] Error general en disconnect:', err);
    return NextResponse.json({ error: err.message || 'Error inesperado al desvincular cuenta' }, { status: 500 });
  }
}
