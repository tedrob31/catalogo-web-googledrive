-- ==============================================================================
-- SAAS MULTI-TENANT ARCHITECTURE: c4talogo.com
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. SUBSCRIPTION PLANS
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

-- Seed Initial Plans
INSERT INTO public.subscription_plans (name, slug, max_photos, max_storage_mb, price_monthly)
VALUES 
    ('Gratuito', 'free', 300, 512, 0.00),
    ('Pro', 'pro', 2000, 4096, 19.99),
    ('Enterprise', 'enterprise', 10000, 20480, 49.99)
ON CONFLICT (slug) DO NOTHING;

-- 3. TENANTS
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

-- 4. TENANT USERS (Multi-Tenant Members & Roles)
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

-- 5. SECURITY DEFINER HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_superadmin()
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

CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM public.tenant_users
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_access(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.is_superadmin() OR EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid() AND tenant_id = target_tenant_id
  );
$$;

-- 6. TENANT CONFIGS
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

-- 7. GOOGLE INTEGRATIONS (Per-Tenant Drive Settings)
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
    last_synced_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. ALBUMS
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

-- 9. PHOTOS
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
    drive_file_id TEXT NOT NULL,
    name TEXT NOT NULL,
    r2_key TEXT NOT NULL,
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

-- 10. SYNC LOGS
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

-- 11. AUTH TRIGGER (AUTO PROVISION TENANT ON SIGNUP)
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

  -- Generar un subdominio inicial basado en el correo o metadata
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

  -- Asociar el usuario como owner
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

-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- SUBSCRIPTION PLANS: Public read, Superadmin write
CREATE POLICY "Public read subscription plans" ON public.subscription_plans
  FOR SELECT USING (true);

CREATE POLICY "Superadmin manage subscription plans" ON public.subscription_plans
  FOR ALL USING (public.is_superadmin());

-- TENANTS:
-- Public can select active tenants (needed for storefront resolution by subdomain/custom_domain)
CREATE POLICY "Public read active tenants" ON public.tenants
  FOR SELECT USING (status = 'active');

-- Authenticated tenant members can select/update their tenant
CREATE POLICY "Tenant members select own tenant" ON public.tenants
  FOR SELECT USING (public.has_tenant_access(id));

CREATE POLICY "Tenant owners update own tenant" ON public.tenants
  FOR UPDATE USING (public.has_tenant_access(id));

CREATE POLICY "Superadmin manage all tenants" ON public.tenants
  FOR ALL USING (public.is_superadmin());

-- TENANT USERS:
CREATE POLICY "Members view own tenant membership" ON public.tenant_users
  FOR SELECT USING (public.has_tenant_access(tenant_id));

CREATE POLICY "Superadmin manage all tenant users" ON public.tenant_users
  FOR ALL USING (public.is_superadmin());

-- TENANT CONFIGS:
-- Public read if tenant is active
CREATE POLICY "Public read active tenant configs" ON public.tenant_configs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_configs.tenant_id AND t.status = 'active')
  );

CREATE POLICY "Tenant members update own config" ON public.tenant_configs
  FOR UPDATE USING (public.has_tenant_access(tenant_id));

CREATE POLICY "Tenant members insert own config" ON public.tenant_configs
  FOR INSERT WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY "Superadmin manage all configs" ON public.tenant_configs
  FOR ALL USING (public.is_superadmin());

-- GOOGLE INTEGRATIONS:
-- 100% PRIVATE (Never accessible by public anon)
CREATE POLICY "Tenant members manage google integrations" ON public.google_integrations
  FOR ALL USING (public.has_tenant_access(tenant_id));

-- ALBUMS:
-- Public read if tenant is active
CREATE POLICY "Public read albums for active tenants" ON public.albums
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = albums.tenant_id AND t.status = 'active')
  );

CREATE POLICY "Tenant members manage own albums" ON public.albums
  FOR ALL USING (public.has_tenant_access(tenant_id));

-- PHOTOS:
-- Public read if tenant is active
CREATE POLICY "Public read photos for active tenants" ON public.photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = photos.tenant_id AND t.status = 'active')
  );

CREATE POLICY "Tenant members manage own photos" ON public.photos
  FOR ALL USING (public.has_tenant_access(tenant_id));

-- SYNC LOGS:
CREATE POLICY "Tenant members manage own sync logs" ON public.sync_logs
  FOR ALL USING (public.has_tenant_access(tenant_id));
