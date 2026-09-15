import { NextRequest, NextResponse } from 'next/server';
import { getOAuth2Client } from '@/lib/google-auth';
import { createAdminClient } from '@/lib/supabase/admin';

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

    let googleEmail: string | null = null;
    if (tokens.id_token) {
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      googleEmail = ticket.getPayload()?.email || null;
    }

    const supabase = createAdminClient();

    const updatePayload: Record<string, any> = {
      access_token: tokens.access_token,
      token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (tokens.refresh_token) {
      updatePayload.refresh_token = tokens.refresh_token;
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
  } catch (err: any) {
    console.error('Error procesando callback de Google:', err);
    return NextResponse.redirect(`${appUrl}/dashboard?tab=drive&error=${encodeURIComponent(err.message || 'unknown')}`);
  }
}
