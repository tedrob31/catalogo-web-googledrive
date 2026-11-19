import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getOAuth2Client } from '@/lib/google-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptToken } from '@/lib/token-crypto';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const tenantId = searchParams.get('state');
  const error = searchParams.get('error');

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'c4talogo.com';
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/auth/google/callback`;

  if (error || !code || !tenantId) {
    console.error('Error en Google OAuth Callback:', error || 'Faltan parámetros');
    return NextResponse.redirect(`${appUrl}/dashboard?tab=drive&error=${encodeURIComponent(error || 'missing_params')}`);
  }

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
      return NextResponse.redirect(`${appUrl}/dashboard?tab=drive&error=db_error`);
    }

    return NextResponse.redirect(`${appUrl}/dashboard?tab=drive&connected=true`);
  } catch (err) {
    console.error('Error procesando callback de Google:', err);
    const mensaje = err instanceof Error ? err.message : 'unknown';
    return NextResponse.redirect(`${appUrl}/dashboard?tab=drive&error=${encodeURIComponent(mensaje)}`);
  }
}
