-- ==============================================================================
-- 2026-09-12 SECURITY HARDENING & LINTER COMPLIANCE
-- ==============================================================================

-- 1. Add is_connected calculated column to google_integrations (Client does not need raw tokens)
ALTER TABLE public.google_integrations 
ADD COLUMN IF NOT EXISTS is_connected BOOLEAN 
GENERATED ALWAYS AS (refresh_token IS NOT NULL AND refresh_token <> '') STORED;

-- 2. Create private schema for RLS SECURITY DEFINER helper functions
-- (Prevents PostgREST from exposing internal security definer functions via /rpc/)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
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
SET search_path = public, private
STABLE
AS $$
  SELECT tenant_id FROM public.tenant_users
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.has_tenant_access(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
STABLE
AS $$
  SELECT private.is_superadmin() OR EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid() AND tenant_id = target_tenant_id
  );
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated, service_role;

-- 3. Update all RLS policies to use private schema functions
DROP POLICY IF EXISTS "Superadmin manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Superadmin manage subscription plans" ON public.subscription_plans
  FOR ALL USING (private.is_superadmin());

DROP POLICY IF EXISTS "Tenant members select own tenant" ON public.tenants;
CREATE POLICY "Tenant members select own tenant" ON public.tenants
  FOR SELECT USING (private.has_tenant_access(id));

DROP POLICY IF EXISTS "Tenant owners update own tenant" ON public.tenants;
CREATE POLICY "Tenant owners update own tenant" ON public.tenants
  FOR UPDATE USING (private.has_tenant_access(id));

DROP POLICY IF EXISTS "Superadmin manage all tenants" ON public.tenants;
CREATE POLICY "Superadmin manage all tenants" ON public.tenants
  FOR ALL USING (private.is_superadmin());

DROP POLICY IF EXISTS "Members view own tenant membership" ON public.tenant_users;
CREATE POLICY "Members view own tenant membership" ON public.tenant_users
  FOR SELECT USING (private.has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "Superadmin manage all tenant users" ON public.tenant_users;
CREATE POLICY "Superadmin manage all tenant users" ON public.tenant_users
  FOR ALL USING (private.is_superadmin());

DROP POLICY IF EXISTS "Tenant members update own config" ON public.tenant_configs;
CREATE POLICY "Tenant members update own config" ON public.tenant_configs
  FOR UPDATE USING (private.has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "Tenant members insert own config" ON public.tenant_configs;
CREATE POLICY "Tenant members insert own config" ON public.tenant_configs
  FOR INSERT WITH CHECK (private.has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "Superadmin manage all configs" ON public.tenant_configs;
CREATE POLICY "Superadmin manage all configs" ON public.tenant_configs
  FOR ALL USING (private.is_superadmin());

DROP POLICY IF EXISTS "Tenant members manage google integrations" ON public.google_integrations;
CREATE POLICY "Tenant members manage google integrations" ON public.google_integrations
  FOR ALL USING (private.has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "Tenant members manage own albums" ON public.albums;
CREATE POLICY "Tenant members manage own albums" ON public.albums
  FOR ALL USING (private.has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "Tenant members manage own photos" ON public.photos;
CREATE POLICY "Tenant members manage own photos" ON public.photos
  FOR ALL USING (private.has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "Tenant members manage own sync logs" ON public.sync_logs;
CREATE POLICY "Tenant members manage own sync logs" ON public.sync_logs
  FOR ALL USING (private.has_tenant_access(tenant_id));

-- 4. Drop legacy functions from public schema
DROP FUNCTION IF EXISTS public.has_tenant_access(UUID);
DROP FUNCTION IF EXISTS public.get_user_tenant_ids();
DROP FUNCTION IF EXISTS public.is_superadmin();
