import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function checkSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: roles } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('user_id', user.id);

  return roles?.some((r: any) => r.role === 'superadmin') || false;
}

export async function POST(req: NextRequest) {
  const isSuper = await checkSuperAdmin();
  if (!isSuper) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  try {
    const { name, subdomain, email, password, plan_id } = await req.json();

    if (!name || !subdomain || !email || !password) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios (nombre, subdominio, email, contraseña)' },
        { status: 400 }
      );
    }

    const cleanSubdomain = String(subdomain)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '');

    if (cleanSubdomain.length < 3) {
      return NextResponse.json(
        { error: 'El subdominio debe tener al menos 3 caracteres alfanuméricos' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const adminSupabase = createAdminClient();

    // 1. Verificar si el subdominio ya existe
    const { data: existingTenant } = await adminSupabase
      .from('tenants')
      .select('id')
      .eq('subdomain', cleanSubdomain)
      .maybeSingle();

    if (existingTenant) {
      return NextResponse.json(
        { error: `El subdominio '${cleanSubdomain}' ya está registrado. Elige otro.` },
        { status: 400 }
      );
    }

    // 2. Gestionar usuario en Supabase Auth
    let userId: string;

    // Buscar si el usuario ya existe en Auth
    const { data: userList } = await adminSupabase.auth.admin.listUsers();
    const existingUser = userList?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    if (existingUser) {
      userId = existingUser.id;
      // Actualizar contraseña si se proporcionó una nueva
      if (password) {
        await adminSupabase.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
        });
      }
    } else {
      // Crear nuevo usuario en Auth con email confirmado
      const { data: newUser, error: createAuthError } = await adminSupabase.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });

      if (createAuthError || !newUser?.user) {
        throw new Error(createAuthError?.message || 'Error creando usuario en Supabase Auth');
      }

      userId = newUser.user.id;
    }

    // 3. Crear el Tenant
    const { data: newTenant, error: createTenantError } = await adminSupabase
      .from('tenants')
      .insert({
        name: name.trim(),
        subdomain: cleanSubdomain,
        plan_id: plan_id || null,
        status: 'active',
      })
      .select()
      .single();

    if (createTenantError || !newTenant) {
      throw new Error(createTenantError?.message || 'Error creando el tenant en la base de datos');
    }

    // 4. Asignar rol de 'owner' en tenant_users
    await adminSupabase.from('tenant_users').insert({
      tenant_id: newTenant.id,
      user_id: userId,
      role: 'owner',
    });

    // 5. Crear configuración por defecto de la tienda
    await adminSupabase.from('tenant_configs').insert({
      tenant_id: newTenant.id,
      title: name.trim(),
      subtitle: 'Catálogo Oficial',
      primary_color: '#111827',
      theme: 'light',
    });

    // 6. Crear fila de integración de Google
    await adminSupabase.from('google_integrations').insert({
      tenant_id: newTenant.id,
      google_email: cleanEmail,
    });

    return NextResponse.json({
      success: true,
      tenant: newTenant,
      credentials: {
        email: cleanEmail,
        password,
        subdomain: cleanSubdomain,
        loginUrl: 'https://c4talogo.com/login',
      },
    });
  } catch (error: any) {
    console.error('[Create Tenant Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al crear la tienda e invitar al usuario' },
      { status: 500 }
    );
  }
}
