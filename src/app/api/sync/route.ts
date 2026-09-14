import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runTenantSync } from '@/lib/multitenant-sync';

// POST: Iniciar sincronización asíncrona en segundo plano (Evita Timeout 524 de Cloudflare)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener tenant del usuario
    const { data: membership } = await supabase
      .from('tenant_users')
      .select('tenant_id, role, tenants ( name, subdomain, status )')
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin', 'superadmin'].includes(membership.role)) {
      return NextResponse.json({ error: 'No tienes permisos de sincronización' }, { status: 403 });
    }

    const tenantId = membership.tenant_id;
    const adminClient = createAdminClient();

    // 1. Verificar si ya hay una sincronización activa reciente (últimos 15 minutos)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: activeSync } = await adminClient
      .from('sync_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'syncing')
      .gt('started_at', fifteenMinsAgo)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (activeSync) {
      return NextResponse.json({
        success: true,
        status: 'already_running',
        logId: activeSync.id,
        message: 'Ya hay una sincronización en curso para este catálogo',
      });
    }

    // 2. Registrar el nuevo Job en sync_logs (Supabase)
    const { data: newLog, error: logError } = await adminClient
      .from('sync_logs')
      .insert({
        tenant_id: tenantId,
        status: 'syncing',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (logError || !newLog) {
      return NextResponse.json({ error: 'Error al registrar el job de sincronización' }, { status: 500 });
    }

    const logId = newLog.id;

    // 3. Ejecutar en segundo plano desacoplado (Background Promise)
    // No usamos await aquí para responder en ~50ms a Cloudflare y evitar el timeout 524
    runTenantSync(tenantId, logId).catch((err) => {
      console.error(`[Background Sync Error - Tenant ${tenantId}]:`, err);
    });

    // 4. Retornar inmediatamente al cliente
    return NextResponse.json({
      success: true,
      status: 'started',
      logId,
      message: 'Sincronización iniciada en segundo plano con éxito',
    });
  } catch (error: any) {
    console.error('[Sync API] Error iniciando job:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al iniciar sincronización' },
      { status: 500 }
    );
  }
}

// GET: Consultar el estado actual del job de sincronización (Polling)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Sin tenant asignado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('logId');

    const adminClient = createAdminClient();
    let query = adminClient
      .from('sync_logs')
      .select('*')
      .eq('tenant_id', membership.tenant_id);

    if (logId) {
      query = query.eq('id', logId);
    } else {
      query = query.order('started_at', { ascending: false }).limit(1);
    }

    const { data: log, error } = await query.single();

    if (error || !log) {
      return NextResponse.json({ error: 'No se encontró registro de sincronización' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      log: {
        id: log.id,
        status: log.status,
        total_albums: log.total_albums || 0,
        total_photos: log.total_photos || 0,
        items_processed: log.items_processed || 0,
        error_message: log.error_message,
        started_at: log.started_at,
        completed_at: log.completed_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
