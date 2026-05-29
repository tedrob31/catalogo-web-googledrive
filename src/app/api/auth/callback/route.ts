import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/modaadmin'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session) {
      const { provider_token, provider_refresh_token, user } = data.session;
      
      if (provider_refresh_token && user) {
        // Guardar o actualizar el token en la base de datos para uso asíncrono
        await supabase.from('user_google_tokens').upsert({
          user_id: user.id,
          email: user.email,
          access_token: provider_token,
          refresh_token: provider_refresh_token,
          updated_at: new Date().toISOString()
        });
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Si hay error, redirigimos al admin
  return NextResponse.redirect(`${origin}/modaadmin?error=auth_failed`)
}
