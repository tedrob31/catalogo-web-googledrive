import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getOAuth2Client } from '@/lib/google-auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptToken } from '@/lib/token-crypto';
import {
  OAUTH_STATE_COOKIE,
  getOAuthStateSecret,
  resolveSafeAppOrigin,
  verifySignedOAuthState,
} from '@/lib/oauth-state';

function redirectWithClearedCookie(targetUrl: string): NextResponse {
  const res = NextResponse.redirect(targetUrl);
  res.cookies.delete({ name: OAUTH_STATE_COOKIE, path: '/' });
  return res;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const rawState = searchParams.get('state');
  const oauthError = searchParams.get('error');
  const cookieNonce = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  const appOrigin = resolveSafeAppOrigin({
    appUrlEnv: process.env.NEXT_PUBLIC_APP_URL,
    forwardedHost: request.headers.get('x-forwarded-host'),
    host: request.headers.get('host'),
    forwardedProto: request.headers.get('x-forwarded-proto'),
    baseDomain: process.env.NEXT_PUBLIC_BASE_DOMAIN,
  });
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${appOrigin}/api/auth/google/callback`;

  if (oauthError || !code || !rawState) {
    console.error('[Google OAuth Callback] Autorización rechazada o parámetros incompletos:', oauthError || 'missing_params');
    return redirectWithClearedCookie(`${appOrigin}/dashboard?tab=drive&error=oauth_denied`);
  }

  let verified: { tenantId: string; userId: string } | null = null;
  try {
    verified = verifySignedOAuthState({
      state: rawState,
      cookieNonce,
      secret: getOAuthStateSecret(),
    });
  } catch (secretErr) {
    console.error('[Google OAuth Callback] Error validando secreto OAuth:', secretErr);
    return redirectWithClearedCookie(`${appOrigin}/dashboard?tab=drive&error=oauth_config_error`);
  }

  if (!verified) {
    console.warn('[Google OAuth Callback] Estado OAuth inválido, expirado o cookie CSRF ausente.');
    return redirectWithClearedCookie(`${appOrigin}/dashboard?tab=drive&error=invalid_oauth_state`);
  }

  // Verificar que exista una sesión activa y pertenezca al mismo usuario y tenant del state firmado
  const userSupabase = await createClient();
  const { data: { user } } = await userSupabase.auth.getUser();

  if (!user || user.id !== verified.userId) {
    console.warn('[Google OAuth Callback] Usuario no autenticado o no coincide con el state OAuth.');
    return redirectWithClearedCookie(`${appOrigin}/dashboard?tab=drive&error=session_mismatch`);
  }

  const { data: membership } = await userSupabase
    .from('tenant_users')
    .select('role')
    .eq('tenant_id', verified.tenantId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || !['owner', 'admin', 'superadmin'].includes(membership.role)) {
    console.warn('[Google OAuth Callback] El usuario autenticado no tiene permisos sobre el tenant del state.');
    return redirectWithClearedCookie(`${appOrigin}/dashboard?tab=drive&error=forbidden`);
  }

  const tenantId = verified.tenantId;

  try {
    const oauth2Client = getOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    let googleEmail: string | null = null;
    if (tokens.id_token) {
      try {
        const ticket = await oauth2Client.verifyIdToken({
          idToken: tokens.id_token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        googleEmail = ticket.getPayload()?.email || null;
      } catch (tokenErr) {
        console.warn('No se pudo verificar id_token:', tokenErr);
      }
    }

    // Fallback: Si no viene id_token, consultar directamente a la API de Drive
    if (!googleEmail) {
      try {
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        const about = await drive.about.get({ fields: 'user' });
        googleEmail = about.data.user?.emailAddress || null;
      } catch (aboutErr) {
        console.warn('No se pudo consultar drive.about.get:', aboutErr);
      }
    }

    const supabase = createAdminClient();

    // Se guardan cifrados (AES-256-GCM): la base nunca recibe el token en claro.
    const updatePayload: {
      token_expires_at: string | null;
      updated_at: string;
      access_token?: string;
      refresh_token?: string;
      google_email?: string | null;
    } = {
      token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (tokens.access_token) {
      updatePayload.access_token = encryptToken(tokens.access_token);
    }

    if (tokens.refresh_token) {
      updatePayload.refresh_token = encryptToken(tokens.refresh_token);
    }

    if (googleEmail) {
      updatePayload.google_email = googleEmail;
    }

    const { error: dbError } = await supabase
      .from('google_integrations')
      .upsert({
        tenant_id: tenantId,
        ...updatePayload,
      });

    if (dbError) {
      console.error('Error guardando tokens en Supabase:', dbError);
      return redirectWithClearedCookie(`${appOrigin}/dashboard?tab=drive&error=db_error`);
    }

    return redirectWithClearedCookie(`${appOrigin}/dashboard?tab=drive&connected=true`);
  } catch (err) {
    console.error('Error procesando callback de Google:', err);
    return redirectWithClearedCookie(`${appOrigin}/dashboard?tab=drive&error=oauth_exchange_failed`);
  }
}
