-- ==============================================================================
-- C4TALOGO — ESQUEMA CONSOLIDADO Y AUDITADO DE BASE DE DATOS (SUPABASE POSTGRESQL)
-- Proyecto: eqnzuojbpbatwlgwfwmk (Producción)
-- Fecha de Auditoría: Septiembre 2026
-- ==============================================================================

-- 1. ESQUEMAS
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS private;

-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLAS BASE
-- ==============================================================================

-- 2.1 PLANES DE SUSCRIPCIÓN
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    max_photos INT NOT NULL DEFAULT 500,
    max_storage_mb INT NOT NULL DEFAULT 1024,
    price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Datos iniciales de planes
INSERT INTO public.subscription_plans (name, slug, max_photos, max_storage_mb, price_monthly)
VALUES 
    ('Gratuito', 'free', 300, 512, 0.00),
    ('Pro', 'pro', 2000, 4096, 19.99),
    ('Enterprise', 'enterprise', 10000, 20480, 49.99)
ON CONFLICT (slug) DO NOTHING;

-- 2.2 INQUILINOS (TENANTS)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    custom_domain TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
    current_photos_count INT NOT NULL DEFAULT 0,
    current_storage_bytes BIGINT NOT NULL DEFAULT 0,
    subscription_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subdomain_format CHECK (subdomain ~* '^[a-z0-9-]+$')
);

CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON public.tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON public.tenants(custom_domain);

-- 2.3 USUARIOS Y ROLES DE INQUILINO (TENANT USERS)
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('superadmin', 'owner', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);

-- 2.4 CONFIGURACIÓN DE TIENDA (TENANT CONFIGS)
CREATE TABLE IF NOT EXISTS public.tenant_configs (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Mi Catálogo',
    subtitle TEXT,
    whatsapp TEXT,
    logo_url TEXT,
    favicon_url TEXT,
    primary_color TEXT NOT NULL DEFAULT '#111827',
    theme TEXT NOT NULL DEFAULT 'light',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
    seo_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5 INTEGRACIÓN GOOGLE DRIVE (GOOGLE INTEGRATIONS)
CREATE TABLE IF NOT EXISTS public.google_integrations (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    google_email TEXT,
    refresh_token TEXT,
    access_token TEXT,
    token_expires_at TIMESTAMPTZ,
    catalog_folder_id TEXT,
    catalog_folder_name TEXT,
    cover_folder_id TEXT,
    cover_folder_name TEXT,
    is_connected BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.6 ÁLBUMES (ALBUMS)
CREATE TABLE IF NOT EXISTS public.albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    drive_folder_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    parent_id UUID REFERENCES public.albums(id) ON DELETE CASCADE,
    path TEXT NOT NULL DEFAULT '',
    order_index INT NOT NULL DEFAULT 0,
    cover_photo_r2_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_albums_tenant_slug ON public.albums(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_albums_tenant_parent ON public.albums(tenant_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_albums_tenant_order ON public.albums(tenant_id, order_index);

-- 2.7 FOTOS (PHOTOS)
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
    drive_file_id TEXT NOT NULL,
    name TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    md5_checksum TEXT,
    mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
    size_bytes BIGINT NOT NULL DEFAULT 0,
    width INT,
    height INT,
    drive_modified_time TIMESTAMPTZ,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photos_tenant_album ON public.photos(tenant_id, album_id);
CREATE INDEX IF NOT EXISTS idx_photos_tenant_drive_id ON public.photos(tenant_id, drive_file_id);
CREATE INDEX IF NOT EXISTS idx_photos_tenant_r2_key ON public.photos(tenant_id, r2_key);

-- 2.8 LOGS DE SINCRONIZACIÓN (SYNC LOGS)
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'completed', 'failed')),
    total_albums INT DEFAULT 0,
    total_photos INT DEFAULT 0,
    items_processed INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_tenant_started ON public.sync_logs(tenant_id, started_at DESC);

-- ==============================================================================
-- 3. FUNCIONES DE SEGURIDAD (ESQUEMA PRIVATE - HARDENED)
-- ==============================================================================

CREATE OR REPLACE FUNCTION private.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid() AND role = 'superadmin'
  );
$$;

CREATE OR REPLACE FUNCTION private.get_user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM public.tenant_users
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.has_tenant_access(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT private.is_superadmin() OR EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid() AND tenant_id = target_tenant_id
  );
$$;

-- Revocar ejecución pública de funciones internas
REVOKE EXECUTE ON FUNCTION private.is_superadmin FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.get_user_tenant_ids FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.has_tenant_access FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.is_superadmin TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_tenant_ids TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_tenant_access TO authenticated;

-- ==============================================================================
-- 4. TRIGGERS AUTOMÁTICOS
-- ==============================================================================

-- 4.1 PROVISIÓN AUTOMÁTICA DE TIENDA AL REGISTRARSE UN USUARIO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_plan_id UUID;
  new_tenant_id UUID;
  base_subdomain TEXT;
  subdomain_candidate TEXT;
  counter INT := 0;
BEGIN
  -- Obtener el plan gratuito por defecto
  SELECT id INTO default_plan_id FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;

  -- Generar subdominio inicial basado en el correo o nombre
  base_subdomain := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9]', '', 'g'));
  IF length(base_subdomain) < 3 THEN
    base_subdomain := 'tienda' || substring(new.id::text from 1 for 4);
  END IF;

  subdomain_candidate := base_subdomain;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE subdomain = subdomain_candidate) LOOP
    counter := counter + 1;
    subdomain_candidate := base_subdomain || counter::text;
  END LOOP;

  -- Crear el tenant inicial
  INSERT INTO public.tenants (plan_id, name, subdomain, status)
  VALUES (
    default_plan_id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    subdomain_candidate,
    'active'
  )
  RETURNING id INTO new_tenant_id;

  -- Asociar el usuario como owner de su tienda
  INSERT INTO public.tenant_users (tenant_id, user_id, role)
  VALUES (new_tenant_id, new.id, 'owner');

  -- Crear configuración inicial
  INSERT INTO public.tenant_configs (tenant_id, title)
  VALUES (new_tenant_id, COALESCE(new.raw_user_meta_data->>'full_name', 'Mi Catálogo'));

  -- Crear registro vacío en google_integrations
  INSERT INTO public.google_integrations (tenant_id, google_email)
  VALUES (new_tenant_id, new.email);

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4.2 ASIGNACIÓN AUTOMÁTICA DE SUPERADMIN PARA EMAILS PRIVILEGIADOS
CREATE OR REPLACE FUNCTION public.handle_auto_superadmin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF new.email IN ('hardted31@gmail.com', 'tedrob31@gmail.com') THEN
    UPDATE public.tenant_users
    SET role = 'superadmin'
    WHERE user_id = new.id;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS tr_auto_superadmin ON auth.users;
CREATE TRIGGER tr_auto_superadmin
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auto_superadmin();

-- ==============================================================================
-- 5. POLÍTICAS ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- 5.1 subscription_plans
CREATE POLICY "Public read subscription plans"
  ON public.subscription_plans FOR SELECT USING (true);

CREATE POLICY "Superadmin manage subscription plans"
  ON public.subscription_plans FOR ALL
  USING (private.is_superadmin());

-- 5.2 tenants
CREATE POLICY "Public read active tenants"
  ON public.tenants FOR SELECT
  USING (status = 'active');

CREATE POLICY "Tenant members select own tenant"
  ON public.tenants FOR SELECT
  USING (private.has_tenant_access(id));

CREATE POLICY "Tenant owners update own tenant"
  ON public.tenants FOR UPDATE
  USING (private.has_tenant_access(id));

CREATE POLICY "Superadmin manage all tenants"
  ON public.tenants FOR ALL
  USING (private.is_superadmin());

-- 5.3 tenant_users
CREATE POLICY "Members view own tenant membership"
  ON public.tenant_users FOR SELECT
  USING (private.has_tenant_access(tenant_id));

CREATE POLICY "Superadmin manage all tenant users"
  ON public.tenant_users FOR ALL
  USING (private.is_superadmin());

-- 5.4 tenant_configs
CREATE POLICY "Public read active tenant configs"
  ON public.tenant_configs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = tenant_configs.tenant_id AND t.status = 'active'
  ));

CREATE POLICY "Tenant members insert own config"
  ON public.tenant_configs FOR INSERT
  WITH CHECK (private.has_tenant_access(tenant_id));

CREATE POLICY "Tenant members update own config"
  ON public.tenant_configs FOR UPDATE
  USING (private.has_tenant_access(tenant_id));

CREATE POLICY "Superadmin manage all configs"
  ON public.tenant_configs FOR ALL
  USING (private.is_superadmin());

-- 5.5 google_integrations
CREATE POLICY "Tenant members manage google integrations"
  ON public.google_integrations FOR ALL
  USING (private.has_tenant_access(tenant_id));

-- 5.6 albums
CREATE POLICY "Public read albums for active tenants"
  ON public.albums FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = albums.tenant_id AND t.status = 'active'
  ));

CREATE POLICY "Tenant members manage own albums"
  ON public.albums FOR ALL
  USING (private.has_tenant_access(tenant_id));

-- 5.7 photos
CREATE POLICY "Public read photos for active tenants"
  ON public.photos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = photos.tenant_id AND t.status = 'active'
  ));

CREATE POLICY "Tenant members manage own photos"
  ON public.photos FOR ALL
  USING (private.has_tenant_access(tenant_id));

-- 5.8 sync_logs
CREATE POLICY "Tenant members manage own sync logs"
  ON public.sync_logs FOR ALL
  USING (private.has_tenant_access(tenant_id));
