-- ==============================================================================
-- 2026-10-24 OAUTH TOKEN PROTECTION & COLUMN-LEVEL ACCESS RESTRICTION
-- ==============================================================================
-- Protege los tokens de Google OAuth (refresh_token, access_token) contra
-- accesos directos desde el cliente/navegador (OWASP ASVS 8.3 & CASA AL1).
-- Solo el backend seguro (service_role) puede leer o escribir tokens.
-- Los miembros autenticados solo pueden consultar columnas de estado no sensibles.

-- 1. Revocar permisos de tabla amplios para anon y authenticated
REVOKE ALL ON public.google_integrations FROM anon;
REVOKE ALL ON public.google_integrations FROM authenticated;

-- 2. Conceder únicamente SELECT sobre columnas públicas seguras al rol authenticated
GRANT SELECT (
  tenant_id,
  google_email,
  catalog_folder_id,
  catalog_folder_name,
  cover_folder_id,
  cover_folder_name,
  last_synced_at,
  updated_at,
  is_connected
) ON public.google_integrations TO authenticated;

-- 3. Asegurar que service_role retenga todos los permisos para las API routes del backend
GRANT ALL ON public.google_integrations TO service_role;

-- 4. Actualizar la política RLS para permitir únicamente SELECT a los miembros del inquilino
DROP POLICY IF EXISTS "Tenant members manage google integrations" ON public.google_integrations;
DROP POLICY IF EXISTS "Tenant members select google integrations" ON public.google_integrations;

CREATE POLICY "Tenant members select google integrations" ON public.google_integrations
  FOR SELECT
  TO authenticated
  USING (private.has_tenant_access(tenant_id));
