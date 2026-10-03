import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const userEmail = (user.email || '').toLowerCase().trim();

    // 1. Verificar si el usuario ya tiene una tienda asignada en tenant_users
    const { data: directMembership } = await adminSupabase
      .from('tenant_users')
      .select('tenant_id, role, tenants (*, subscription_plans (*))')
      .eq('user_id', user.id)
      .maybeSingle();

    if (directMembership && directMembership.tenants) {
      return NextResponse.json({
        authorized: true,
        provisioned: false,
        tenant: directMembership.tenants,
      });
    }

    // 2. Si no tiene tienda con este user_id, buscar si este mismo correo ya es dueño de una tienda
    // (Por ejemplo si se registró con contraseña antes y ahora entra por Google, o viceversa)
    if (userEmail) {
      const { data: userList } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
      const matchingUids = (userList?.users || [])
        .filter((u) => u.email?.toLowerCase().trim() === userEmail)
        .map((u) => u.id);

      if (matchingUids.length > 0) {
        const { data: existingByEmail } = await adminSupabase
          .from('tenant_users')
          .select('tenant_id, role, tenants (*, subscription_plans (*))')
          .in('user_id', matchingUids)
          .eq('role', 'owner')
          .limit(1)
          .maybeSingle();

        if (existingByEmail && existingByEmail.tenants) {
          // Vincular este user.id a esa misma tienda existente
          await adminSupabase.from('tenant_users').upsert(
            {
              tenant_id: existingByEmail.tenant_id,
              user_id: user.id,
              role: 'owner',
            },
            { onConflict: 'tenant_id,user_id' }
          );

          return NextResponse.json({
            authorized: true,
            provisioned: false,
            tenant: existingByEmail.tenants,
          });
        }
      }
    }

    // 3. El usuario NO tiene ninguna tienda actualmente.
    // Verificar si está autorizado para que se le cree una tienda automáticamente.
    const { data: betaSetting }: any = await adminSupabase
      .from('system_settings' as any)
      .select('value')
      .eq('key', 'closed_beta_enabled')
      .maybeSingle();

    const isClosedBeta = betaSetting?.value !== false && betaSetting?.value !== 'false';

    if (isClosedBeta) {
      const { data: whitelistEntry } = await adminSupabase
        .from('platform_whitelist' as any)
        .select('email')
        .eq('email', userEmail)
        .maybeSingle();

      if (!whitelistEntry) {
        // En fase beta y NO está en la lista blanca: denegar creación automática
        return NextResponse.json({
          authorized: false,
          reason: 'not_whitelisted',
          email: userEmail,
        });
      }
    }

    // 4. El usuario está AUTORIZADO (está en la lista blanca o la beta está abierta).
    // Auto-aprovisionar una tienda nueva desde cero.
    const { data: defaultPlan } = await adminSupabase
      .from('subscription_plans')
      .select('id')
      .eq('slug', 'free')
      .limit(1)
      .maybeSingle();

    // Generar nombre de tienda y subdominio alfanumérico único
    const fullName = (
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      userEmail.split('@')[0] ||
      'Mi Tienda'
    ).trim();

    let baseSub = userEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (baseSub.length < 3) {
      baseSub = `tienda${user.id.substring(0, 4)}`;
    }

    let candidateSub = baseSub;
    let counter = 0;
    while (true) {
      const { data: conflict } = await adminSupabase
        .from('tenants')
        .select('id')
        .eq('subdomain', candidateSub)
        .maybeSingle();

      if (!conflict) break;
      counter++;
      candidateSub = `${baseSub}${counter}`;
    }

    // Crear el tenant
    const { data: newTenant, error: createError } = await adminSupabase
      .from('tenants')
      .insert({
        plan_id: defaultPlan?.id || null,
        name: fullName,
        subdomain: candidateSub,
        status: 'active',
      })
      .select('*, subscription_plans (*)')
      .single();

    if (createError || !newTenant) {
      throw new Error(createError?.message || 'Error al auto-aprovisionar tienda');
    }

    // Asignar rol owner
    await adminSupabase.from('tenant_users').insert({
      tenant_id: newTenant.id,
      user_id: user.id,
      role: 'owner',
    });

    // Si es superadmin privilegiado, actualizar rol
    if (['hardted31@gmail.com', 'tedrob31@gmail.com'].includes(userEmail)) {
      await adminSupabase
        .from('tenant_users')
        .update({ role: 'superadmin' })
        .eq('tenant_id', newTenant.id)
        .eq('user_id', user.id);
    }

    // Configuración inicial de tienda
    await adminSupabase.from('tenant_configs').insert({
      tenant_id: newTenant.id,
      title: fullName,
      subtitle: 'Catálogo Oficial',
      primary_color: '#111827',
      theme: 'light',
    });

    // Integración de Google inicial
    await adminSupabase.from('google_integrations').insert({
      tenant_id: newTenant.id,
      google_email: userEmail,
    });

    console.log(
      `[Auto-Provision] Tienda '${candidateSub}' auto-creada exitosamente para ${userEmail} (${user.id})`
    );

    return NextResponse.json({
      authorized: true,
      provisioned: true,
      tenant: newTenant,
    });
  } catch (error: any) {
    console.error('[Auto-Provision Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Error en auto-aprovisionamiento de tienda' },
      { status: 500 }
    );
  }
}
