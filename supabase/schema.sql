-- Esquema consolidado de la base del proyecto Supabase `catalogo`.
--
-- GENERADO desde la base viva (no escrito a mano): lo derivable del catalogo sale de las
-- funciones autoritativas de PostgreSQL (pg_get_functiondef, pg_get_constraintdef,
-- pg_get_indexdef, pg_get_triggerdef).
--
-- Es un SNAPSHOT, no una migracion: describe como esta la base y se aplica sobre una base
-- vacia para reconstruirla. Los cambios nuevos van como migracion registrada en migrations/.
--
-- ORDEN, y no es casual:
--   1. FUNCIONES antes que POLICIES: 16 de las 24 policies llaman a
--      private.has_tenant_access() o private.is_superadmin(), y PostgreSQL resuelve la funcion
--      AL CREAR la policy (si no existe, 42883). Comprobado.
--   2. ENTRE FUNCIONES, orden topologico: private.has_tenant_access es LANGUAGE sql y llama a
--      private.is_superadmin, y las funciones sql resuelven sus referencias al crearse
--      (comprobado: 42883). El orden se calculo desde los cuerpos, porque pg_depend no
--      registra esa dependencia.
--   3. TRIGGERS al final: dependen de sus funciones.
--
-- Las sentencias derivadas del catalogo conservan la forma en MAYUSCULAS de PostgreSQL; las
-- plantillas escritas a mano van en minusculas.
--
-- Verificado contra el catalogo: 11 tablas, 98 columnas (0 faltantes, 0 de mas), 32
-- constraints, 11 indices, 24 policies, 10 funciones y 2 triggers, y las relaciones de orden.
-- NO verificado: el archivo completo aplicado contra una base vacia.

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "pg_stat_statements";
create extension if not exists "supabase_vault";

create schema if not exists private;
grant usage, create on schema private to postgres;
grant usage on schema private to authenticated;
grant usage on schema private to service_role;

create table public.albums (
  id uuid default gen_random_uuid() not null,
  tenant_id uuid not null,
  drive_folder_id text not null,
  name text not null,
  slug text not null,
  parent_id uuid,
  path text default ''::text not null,
  order_index integer default 0 not null,
  cover_photo_r2_key text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.google_integrations (
  tenant_id uuid not null,
  google_email text,
  catalog_folder_id text,
  catalog_folder_name text,
  cover_folder_id text,
  cover_folder_name text,
  last_synced_at timestamp with time zone,
  updated_at timestamp with time zone default now() not null,
  refresh_token text,
  access_token text,
  token_expires_at timestamp with time zone,
  is_connected boolean generated always as (((refresh_token IS NOT NULL) AND (refresh_token <> ''::text))) stored
);

create table public.photos (
  id uuid default gen_random_uuid() not null,
  tenant_id uuid not null,
  album_id uuid not null,
  drive_file_id text not null,
  name text not null,
  r2_key text not null,
  mime_type text default 'image/jpeg'::text not null,
  size_bytes bigint default 0 not null,
  width integer,
  height integer,
  drive_modified_time timestamp with time zone,
  order_index integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  md5_checksum text
);

create table public.platform_whitelist (
  email text not null,
  created_at timestamp with time zone default now() not null
);

create table public.subscription_plans (
  id uuid default gen_random_uuid() not null,
  name text not null,
  slug text not null,
  max_photos integer default 500 not null,
  max_storage_mb integer default 1024 not null,
  price_monthly numeric(10,2) default 0.00 not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null
);

create table public.sync_logs (
  id uuid default gen_random_uuid() not null,
  tenant_id uuid not null,
  status text default 'pending'::text not null,
  total_albums integer default 0,
  total_photos integer default 0,
  items_processed integer default 0,
  error_message text,
  started_at timestamp with time zone default now() not null,
  completed_at timestamp with time zone
);

create table public.system_settings (
  key text not null,
  value jsonb default '{}'::jsonb not null,
  updated_at timestamp with time zone default now() not null
);

create table public.tenant_configs (
  tenant_id uuid not null,
  title text default 'Mi Catálogo'::text not null,
  subtitle text,
  whatsapp text,
  logo_url text,
  favicon_url text,
  primary_color text default '#111827'::text not null,
  theme text default 'light'::text not null,
  social_links jsonb default '{}'::jsonb not null,
  seo_metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  settings jsonb default '{}'::jsonb not null
);

create table public.tenant_page_metrics (
  id uuid default gen_random_uuid() not null,
  tenant_id uuid not null,
  date date not null,
  path text default '/'::text not null,
  title text default 'Catálogo Principal'::text not null,
  views_count integer default 1 not null,
  whatsapp_clicks integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.tenant_users (
  id uuid default gen_random_uuid() not null,
  tenant_id uuid not null,
  user_id uuid not null,
  role text default 'owner'::text not null,
  created_at timestamp with time zone default now() not null
);

create table public.tenants (
  id uuid default gen_random_uuid() not null,
  plan_id uuid,
  name text not null,
  subdomain text not null,
  custom_domain text,
  status text default 'active'::text not null,
  current_photos_count integer default 0 not null,
  current_storage_bytes bigint default 0 not null,
  subscription_ends_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  custom_domain_enabled boolean default false
);

alter table public.albums add constraint albums_pkey PRIMARY KEY (id);
alter table public.albums add constraint uq_albums_tenant_drive_folder UNIQUE (tenant_id, drive_folder_id);
alter table public.albums add constraint albums_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES albums(id) ON DELETE CASCADE;
alter table public.albums add constraint albums_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table public.google_integrations add constraint google_integrations_pkey PRIMARY KEY (tenant_id);
alter table public.google_integrations add constraint google_integrations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table public.photos add constraint photos_pkey PRIMARY KEY (id);
alter table public.photos add constraint photos_album_id_fkey FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE;
alter table public.photos add constraint photos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table public.platform_whitelist add constraint platform_whitelist_pkey PRIMARY KEY (email);
alter table public.subscription_plans add constraint subscription_plans_pkey PRIMARY KEY (id);
alter table public.subscription_plans add constraint subscription_plans_slug_key UNIQUE (slug);
alter table public.sync_logs add constraint sync_logs_pkey PRIMARY KEY (id);
alter table public.sync_logs add constraint sync_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table public.sync_logs add constraint sync_logs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'syncing'::text, 'completed'::text, 'failed'::text])));
alter table public.system_settings add constraint system_settings_pkey PRIMARY KEY (key);
alter table public.tenant_configs add constraint tenant_configs_pkey PRIMARY KEY (tenant_id);
alter table public.tenant_configs add constraint tenant_configs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table public.tenant_page_metrics add constraint tenant_page_metrics_pkey PRIMARY KEY (id);
alter table public.tenant_page_metrics add constraint unique_tenant_date_path UNIQUE (tenant_id, date, path);
alter table public.tenant_page_metrics add constraint tenant_page_metrics_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table public.tenant_users add constraint tenant_users_pkey PRIMARY KEY (id);
alter table public.tenant_users add constraint tenant_users_tenant_id_user_id_key UNIQUE (tenant_id, user_id);
alter table public.tenant_users add constraint tenant_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table public.tenant_users add constraint tenant_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.tenant_users add constraint tenant_users_role_check CHECK ((role = ANY (ARRAY['superadmin'::text, 'owner'::text, 'admin'::text])));
alter table public.tenants add constraint tenants_pkey PRIMARY KEY (id);
alter table public.tenants add constraint tenants_custom_domain_key UNIQUE (custom_domain);
alter table public.tenants add constraint tenants_subdomain_key UNIQUE (subdomain);
alter table public.tenants add constraint tenants_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL;
alter table public.tenants add constraint subdomain_format CHECK ((subdomain ~* '^[a-z0-9-]+$'::text));
alter table public.tenants add constraint tenants_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'trial'::text])));

CREATE INDEX idx_albums_tenant_parent ON public.albums USING btree (tenant_id, parent_id);
CREATE INDEX idx_albums_tenant_slug ON public.albums USING btree (tenant_id, slug);
CREATE INDEX idx_photos_tenant_album ON public.photos USING btree (tenant_id, album_id);
CREATE INDEX idx_photos_tenant_drive_id ON public.photos USING btree (tenant_id, drive_file_id);
CREATE UNIQUE INDEX idx_photos_tenant_drive_unique ON public.photos USING btree (tenant_id, drive_file_id);
CREATE INDEX idx_sync_logs_tenant_started ON public.sync_logs USING btree (tenant_id, started_at DESC);
CREATE INDEX idx_tenant_page_metrics_lookup ON public.tenant_page_metrics USING btree (tenant_id, date DESC);
CREATE INDEX idx_tenant_users_tenant_id ON public.tenant_users USING btree (tenant_id);
CREATE INDEX idx_tenant_users_user_id ON public.tenant_users USING btree (user_id);
CREATE INDEX idx_tenants_custom_domain ON public.tenants USING btree (custom_domain);
CREATE INDEX idx_tenants_subdomain ON public.tenants USING btree (subdomain);

alter table public.albums enable row level security;
revoke all on table public.albums from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.albums to postgres;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.albums to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.albums to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.albums to service_role;
alter table public.google_integrations enable row level security;
revoke all on table public.google_integrations from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.google_integrations to postgres;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.google_integrations to service_role;
alter table public.photos enable row level security;
revoke all on table public.photos from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.photos to postgres;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.photos to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.photos to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.photos to service_role;
alter table public.platform_whitelist enable row level security;
revoke all on table public.platform_whitelist from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.platform_whitelist to postgres;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.platform_whitelist to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.platform_whitelist to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.platform_whitelist to service_role;
alter table public.subscription_plans enable row level security;
revoke all on table public.subscription_plans from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.subscription_plans to postgres;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.subscription_plans to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.subscription_plans to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.subscription_plans to service_role;
alter table public.sync_logs enable row level security;
revoke all on table public.sync_logs from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.sync_logs to postgres;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.sync_logs to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.sync_logs to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.sync_logs to service_role;
alter table public.system_settings enable row level security;
revoke all on table public.system_settings from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.system_settings to postgres;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.system_settings to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.system_settings to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.system_settings to service_role;
alter table public.tenant_configs enable row level security;
revoke all on table public.tenant_configs from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.tenant_configs to postgres;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.tenant_configs to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.tenant_configs to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.tenant_configs to service_role;
alter table public.tenant_page_metrics enable row level security;
revoke all on table public.tenant_page_metrics from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.tenant_page_metrics to postgres;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.tenant_page_metrics to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.tenant_page_metrics to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.tenant_page_metrics to service_role;
alter table public.tenant_users enable row level security;
revoke all on table public.tenant_users from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.tenant_users to postgres;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.tenant_users to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.tenant_users to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.tenant_users to service_role;
alter table public.tenants enable row level security;
revoke all on table public.tenants from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.tenants to postgres;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.tenants to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.tenants to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public.tenants to service_role;

grant select (tenant_id) on table public.google_integrations to authenticated;
grant select (google_email) on table public.google_integrations to authenticated;
grant select (catalog_folder_id) on table public.google_integrations to authenticated;
grant select (catalog_folder_name) on table public.google_integrations to authenticated;
grant select (cover_folder_id) on table public.google_integrations to authenticated;
grant select (cover_folder_name) on table public.google_integrations to authenticated;
grant select (last_synced_at) on table public.google_integrations to authenticated;
grant select (updated_at) on table public.google_integrations to authenticated;
grant select (is_connected) on table public.google_integrations to authenticated;

-- DATOS SEMILLA
-- Sin esto, una base reconstruida desde este archivo NO funciona: handle_new_user lee
-- system_settings.closed_beta_enabled y, si la fila falta, asume true y devuelve sin crear el
-- tenant; y sin subscription_plans no hay plan por defecto para las tiendas nuevas.
-- (Hallazgo R4-002 de la review nativa.)
--
-- platform_whitelist se deja VACIA a proposito: en la base viva tiene emails reales y este
-- repositorio es publico. La carga el operador (ver supabase/README.md).
insert into public.system_settings (key, value) values
  ('active_landing', to_jsonb('minimal'::text)),
  ('closed_beta_enabled', to_jsonb(true));

insert into public.subscription_plans (id, name, slug, max_photos, max_storage_mb, price_monthly, is_active) values
  ('16c794e5-e761-4a08-a331-f05e54448c85', 'Básico',  'free',        300,   512,    0.00, true),
  ('55bde727-8fd6-442c-8b58-dd8703531712', 'Premium', 'enterprise', 15000, 20480,  99.00, true),
  ('7729f397-d590-4d11-8b40-504f37f4f1a2', 'Pro',     'pro',         2000,  4096,  19.99, true);

-- Funciones en orden topologico: ver el encabezado. Las que se llaman entre si van primero.
CREATE OR REPLACE FUNCTION private.create_unique_photos_index()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY tenant_id, drive_file_id 
      ORDER BY id ASC
    ) AS rnum
    FROM public.photos
  )
  DELETE FROM public.photos
  WHERE id IN (SELECT id FROM duplicates WHERE rnum > 1);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_tenant_drive_unique 
  ON public.photos (tenant_id, drive_file_id);

  RETURN 'Index created successfully';
END;
$function$
;
revoke all on function private.create_unique_photos_index() from public, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.deduplicate_photos()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  deleted_count INT;
BEGIN
  WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY tenant_id, drive_file_id 
      ORDER BY id ASC
    ) AS rnum
    FROM public.photos
  )
  DELETE FROM public.photos
  WHERE id IN (SELECT id FROM duplicates WHERE rnum > 1);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$
;
revoke all on function private.deduplicate_photos() from public, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.get_user_tenant_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
  SELECT tenant_id FROM public.tenant_users
  WHERE user_id = auth.uid();
$function$
;
revoke all on function private.get_user_tenant_ids() from public, anon, authenticated, service_role;
grant execute on function private.get_user_tenant_ids() to public;
grant execute on function private.get_user_tenant_ids() to postgres;
grant execute on function private.get_user_tenant_ids() to authenticated;
grant execute on function private.get_user_tenant_ids() to service_role;

CREATE OR REPLACE FUNCTION private.is_superadmin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid() AND role = 'superadmin'
  );
$function$
;
revoke all on function private.is_superadmin() from public, anon, authenticated, service_role;
grant execute on function private.is_superadmin() to public;
grant execute on function private.is_superadmin() to postgres;
grant execute on function private.is_superadmin() to authenticated;
grant execute on function private.is_superadmin() to service_role;

CREATE OR REPLACE FUNCTION public.handle_auto_superadmin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.email IN ('hardted31@gmail.com', 'teddy.robles.cc@gmail.com') THEN
    UPDATE public.tenant_users
    SET role = 'superadmin'
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$
;
revoke all on function public.handle_auto_superadmin() from public, anon, authenticated, service_role;
grant execute on function public.handle_auto_superadmin() to public;
grant execute on function public.handle_auto_superadmin() to postgres;
grant execute on function public.handle_auto_superadmin() to anon;
grant execute on function public.handle_auto_superadmin() to authenticated;
grant execute on function public.handle_auto_superadmin() to service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  default_plan_id UUID;
  existing_tenant_id UUID;
  new_tenant_id UUID;
  base_subdomain TEXT;
  subdomain_candidate TEXT;
  counter INT := 0;
  is_closed_beta BOOLEAN := true;
  beta_setting JSONB;
  is_whitelisted BOOLEAN := false;
BEGIN
  -- 1. Verificar si ya existe una tienda creada previamente para este mismo email
  -- (Evita duplicar tiendas si el usuario se registró primero con email/password y luego con Google, o viceversa)
  SELECT tu.tenant_id INTO existing_tenant_id
  FROM public.tenant_users tu
  JOIN auth.users u ON u.id = tu.user_id
  WHERE lower(u.email) = lower(new.email) AND tu.role = 'owner'
  LIMIT 1;

  IF existing_tenant_id IS NOT NULL THEN
    -- Asociar el nuevo user_id a la misma tienda existente con rol owner
    INSERT INTO public.tenant_users (tenant_id, user_id, role)
    VALUES (existing_tenant_id, new.id, 'owner')
    ON CONFLICT (tenant_id, user_id) DO NOTHING;

    RETURN new;
  END IF;

  -- 2. Verificar si la fase de prueba cerrada (closed beta) está activa
  SELECT value INTO beta_setting
  FROM public.system_settings
  WHERE key = 'closed_beta_enabled';

  IF beta_setting IS NOT NULL AND beta_setting = 'false'::jsonb THEN
    is_closed_beta := false;
  ELSE
    is_closed_beta := true;
  END IF;

  -- 3. Si la fase de prueba está activa, verificar si el correo está en la lista blanca
  IF is_closed_beta THEN
    SELECT EXISTS (
      SELECT 1 FROM public.platform_whitelist
      WHERE lower(email) = lower(new.email)
    ) INTO is_whitelisted;

    -- Si NO está en la lista blanca, NO crear tienda
    IF NOT is_whitelisted THEN
      -- Se registra el usuario en auth pero sin crearle tienda en la plataforma
      RETURN new;
    END IF;
  END IF;

  -- 4. Si la beta está apagada O si el correo SÍ está en la lista blanca, crear la tienda
  SELECT id INTO default_plan_id FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;

  base_subdomain := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9]', '', 'g'));
  IF length(base_subdomain) < 3 THEN
    base_subdomain := 'tienda' || substring(new.id::text from 1 for 4);
  END IF;

  subdomain_candidate := base_subdomain;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE subdomain = subdomain_candidate) LOOP
    counter := counter + 1;
    subdomain_candidate := base_subdomain || counter::text;
  END LOOP;

  INSERT INTO public.tenants (plan_id, name, subdomain, status)
  VALUES (
    default_plan_id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    subdomain_candidate,
    'active'
  )
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.tenant_users (tenant_id, user_id, role)
  VALUES (new_tenant_id, new.id, 'owner');

  INSERT INTO public.tenant_configs (tenant_id, title)
  VALUES (new_tenant_id, COALESCE(new.raw_user_meta_data->>'full_name', 'Mi Catálogo'));

  INSERT INTO public.google_integrations (tenant_id, google_email)
  VALUES (new_tenant_id, new.email);

  RETURN new;
END;
$function$
;
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;
grant execute on function public.handle_new_user() to postgres;
grant execute on function public.handle_new_user() to service_role;

CREATE OR REPLACE FUNCTION public.increment_page_metric(p_tenant_id uuid, p_date date, p_path text, p_title text, p_views integer, p_whatsapp integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.tenant_page_metrics (
        tenant_id, date, path, title, views_count, whatsapp_clicks, updated_at
    )
    VALUES (
        p_tenant_id, p_date, p_path, p_title, p_views, p_whatsapp, now()
    )
    ON CONFLICT (tenant_id, date, path)
    DO UPDATE SET
        views_count = tenant_page_metrics.views_count + EXCLUDED.views_count,
        whatsapp_clicks = tenant_page_metrics.whatsapp_clicks + EXCLUDED.whatsapp_clicks,
        title = CASE WHEN EXCLUDED.title <> 'Catálogo' AND EXCLUDED.title <> 'Catálogo Principal' THEN EXCLUDED.title ELSE tenant_page_metrics.title END,
        updated_at = now();
END;
$function$
;
revoke all on function public.increment_page_metric(uuid, date, text, text, integer, integer) from public, anon, authenticated, service_role;
grant execute on function public.increment_page_metric(uuid, date, text, text, integer, integer) to postgres;
grant execute on function public.increment_page_metric(uuid, date, text, text, integer, integer) to service_role;

CREATE OR REPLACE FUNCTION public.increment_page_metrics_batch(p_metrics jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF p_metrics IS NULL OR jsonb_array_length(p_metrics) = 0 THEN
        RETURN;
    END IF;

    INSERT INTO public.tenant_page_metrics (
        tenant_id, date, path, title, views_count, whatsapp_clicks, updated_at
    )
    SELECT
        (m->>'tenant_id')::UUID,
        (m->>'date')::DATE,
        m->>'path',
        m->>'title',
        COALESCE((m->>'views')::INT, 0),
        COALESCE((m->>'whatsapp')::INT, 0),
        now()
    FROM jsonb_array_elements(p_metrics) AS m
    ON CONFLICT (tenant_id, date, path)
    DO UPDATE SET
        views_count = tenant_page_metrics.views_count + EXCLUDED.views_count,
        whatsapp_clicks = tenant_page_metrics.whatsapp_clicks + EXCLUDED.whatsapp_clicks,
        title = CASE 
            WHEN EXCLUDED.title <> 'Catálogo' AND EXCLUDED.title <> 'Catálogo Principal' 
            THEN EXCLUDED.title 
            ELSE tenant_page_metrics.title 
        END,
        updated_at = now();
END;
$function$
;
revoke all on function public.increment_page_metrics_batch(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.increment_page_metrics_batch(jsonb) to postgres;
grant execute on function public.increment_page_metrics_batch(jsonb) to service_role;

CREATE OR REPLACE FUNCTION private.has_tenant_access(target_tenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
  SELECT private.is_superadmin() OR EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid() AND tenant_id = target_tenant_id
  );
$function$
;
revoke all on function private.has_tenant_access(uuid) from public, anon, authenticated, service_role;
grant execute on function private.has_tenant_access(uuid) to public;
grant execute on function private.has_tenant_access(uuid) to postgres;
grant execute on function private.has_tenant_access(uuid) to authenticated;
grant execute on function private.has_tenant_access(uuid) to service_role;

CREATE OR REPLACE FUNCTION public.get_tenant_analytics_summary(p_tenant_id uuid, p_start_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
    v_total_views BIGINT := 0;
    v_total_whatsapp BIGINT := 0;
    v_daily_trend JSONB;
    v_top_content JSONB;
    v_top_page TEXT := 'Ninguna aún';
BEGIN

    -- Autorizacion: quien llama con identidad de usuario debe pertenecer al tenant
    -- (o ser superadmin). Las llamadas server-side con service_role no traen JWT de
    -- usuario y ya fueron autorizadas en la capa de aplicacion.
    IF auth.uid() IS NOT NULL AND NOT private.has_tenant_access(p_tenant_id) THEN
        RAISE EXCEPTION 'not authorized for tenant %', p_tenant_id USING ERRCODE = '42501';
    END IF;

    -- 1. Totales generales
    SELECT 
        COALESCE(SUM(views_count), 0),
        COALESCE(SUM(whatsapp_clicks), 0)
    INTO 
        v_total_views,
        v_total_whatsapp
    FROM public.tenant_page_metrics
    WHERE tenant_id = p_tenant_id AND date >= p_start_date;

    -- 2. Tendencia diaria agregada por fecha (orden cronológico)
    SELECT COALESCE(jsonb_agg(d ORDER BY (d->>'date') ASC), '[]'::jsonb)
    INTO v_daily_trend
    FROM (
        SELECT jsonb_build_object(
            'date', date::text,
            'views', COALESCE(SUM(views_count), 0),
            'whatsapp', COALESCE(SUM(whatsapp_clicks), 0)
        ) AS d
        FROM public.tenant_page_metrics
        WHERE tenant_id = p_tenant_id AND date >= p_start_date
        GROUP BY date
    ) sub;

    -- 3. Top 15 contenidos más visitados
    SELECT COALESCE(jsonb_agg(c), '[]'::jsonb)
    INTO v_top_content
    FROM (
        SELECT jsonb_build_object(
            'path', path,
            'title', MAX(title),
            'views', COALESCE(SUM(views_count), 0),
            'whatsapp', COALESCE(SUM(whatsapp_clicks), 0)
        ) AS c
        FROM public.tenant_page_metrics
        WHERE tenant_id = p_tenant_id AND date >= p_start_date
        GROUP BY path
        ORDER BY SUM(views_count) DESC
        LIMIT 15
    ) sub;

    -- Extraer el título de la página más visitada
    IF jsonb_array_length(v_top_content) > 0 THEN
        v_top_page := COALESCE(v_top_content->0->>'title', 'Ninguna aún');
    END IF;

    v_result := jsonb_build_object(
        'total_views', v_total_views,
        'total_whatsapp', v_total_whatsapp,
        'daily_trend', v_daily_trend,
        'top_content', v_top_content,
        'top_page', v_top_page
    );

    RETURN v_result;
END;
$function$
;
revoke all on function public.get_tenant_analytics_summary(uuid, date) from public, anon, authenticated, service_role;
grant execute on function public.get_tenant_analytics_summary(uuid, date) to postgres;
grant execute on function public.get_tenant_analytics_summary(uuid, date) to service_role;

-- Policies DESPUES de las funciones: resuelven sus llamadas al crearse.
create policy "Public read albums for active tenants" on public.albums for select to public using ((EXISTS ( SELECT 1
   FROM tenants t
  WHERE ((t.id = albums.tenant_id) AND (t.status = 'active'::text)))));
create policy "Tenant members manage own albums" on public.albums for all to public using (private.has_tenant_access(tenant_id));
create policy "Tenant members manage google integrations" on public.google_integrations for all to public using (private.has_tenant_access(tenant_id));
create policy "Public read photos for active tenants" on public.photos for select to public using ((EXISTS ( SELECT 1
   FROM tenants t
  WHERE ((t.id = photos.tenant_id) AND (t.status = 'active'::text)))));
create policy "Tenant members manage own photos" on public.photos for all to public using (private.has_tenant_access(tenant_id));
create policy "Public read whitelist" on public.platform_whitelist for select to public using (true);
create policy "Superadmin manage whitelist" on public.platform_whitelist for all to public using (private.is_superadmin());
create policy "Public read subscription plans" on public.subscription_plans for select to public using (true);
create policy "Superadmin manage subscription plans" on public.subscription_plans for all to public using (private.is_superadmin());
create policy "Tenant members manage own sync logs" on public.sync_logs for all to public using (private.has_tenant_access(tenant_id));
create policy "Public read system settings" on public.system_settings for select to public using (true);
create policy "Superadmin manage system settings" on public.system_settings for all to public using (private.is_superadmin());
create policy "Public read active tenant configs" on public.tenant_configs for select to public using ((EXISTS ( SELECT 1
   FROM tenants t
  WHERE ((t.id = tenant_configs.tenant_id) AND (t.status = 'active'::text)))));
create policy "Superadmin manage all configs" on public.tenant_configs for all to public using (private.is_superadmin());
create policy "Tenant members insert own config" on public.tenant_configs for insert to public with check (private.has_tenant_access(tenant_id));
create policy "Tenant members update own config" on public.tenant_configs for update to public using (private.has_tenant_access(tenant_id));
create policy "service_role_manage_metrics" on public.tenant_page_metrics for all to service_role using (true) with check (true);
create policy "tenant_owners_view_metrics" on public.tenant_page_metrics for select to authenticated using (private.has_tenant_access(tenant_id));
create policy "Members view own tenant membership" on public.tenant_users for select to public using (private.has_tenant_access(tenant_id));
create policy "Superadmin manage all tenant users" on public.tenant_users for all to public using (private.is_superadmin());
create policy "Public read active tenants" on public.tenants for select to public using ((status = 'active'::text));
create policy "Superadmin manage all tenants" on public.tenants for all to public using (private.is_superadmin());
create policy "Tenant members select own tenant" on public.tenants for select to public using (private.has_tenant_access(id));
create policy "Tenant owners update own tenant" on public.tenants for update to public using (private.has_tenant_access(id));

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER tr_auto_superadmin AFTER INSERT OR UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_auto_superadmin();
