import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateGoogleAuthUrl } from '@/lib/google-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_TTL_MS,
  createSignedOAuthState,
  getOAuthStateSecret,
  resolveSafeAppOrigin,
} from '@/lib/oauth-state';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const rl = checkRateLimit(`oauth_google:${user.id}`, 20, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos de vinculación. Intenta de nuevo en unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  // Obtener el tenant del usuario
  const { data: membership } = await supabase
    .from('tenant_users')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || !['owner', 'admin', 'superadmin'].includes(membership.role)) {
    return NextResponse.json({ error: 'No tienes permisos de administración sobre este tenant' }, { status: 403 });
  }

  const appOrigin = resolveSafeAppOrigin({
    appUrlEnv: process.env.NEXT_PUBLIC_APP_URL,
    forwardedHost: request.headers.get('x-forwarded-host'),
    host: request.headers.get('host'),
    forwardedProto: request.headers.get('x-forwarded-proto'),
    baseDomain: process.env.NEXT_PUBLIC_BASE_DOMAIN,
  });

  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${appOrigin}/api/auth/google/callback`;

  const { state, nonce } = createSignedOAuthState({
    tenantId: membership.tenant_id,
    userId: user.id,
    secret: getOAuthStateSecret(),
  });

  const url = generateGoogleAuthUrl(state, redirectUri);
  const response = NextResponse.redirect(url);

  response.cookies.set(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: appOrigin.startsWith('https://'),
    path: '/',
    maxAge: Math.floor(OAUTH_STATE_TTL_MS / 1000),
  });

  return response;
}
