import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateGoogleAuthUrl } from '@/lib/google-auth';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
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

  const url = generateGoogleAuthUrl(membership.tenant_id);
  return NextResponse.redirect(url);
}
