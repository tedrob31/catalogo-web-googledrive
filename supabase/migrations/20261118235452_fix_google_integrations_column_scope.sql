-- Migracion: fix_google_integrations_column_scope
--
-- PROBLEMA (hallazgo R1-001 de la review nativa, severity CRITICAL)
--   public.google_integrations tenia un grant DE TABLA a authenticated
--   (authenticated=rwm: select, update, maintain). La migracion
--   20261024_oauth_token_hardening.sql quiso restringirlo con REVOKE ALL seguido de
--   GRANT SELECT (columnas), pero un grant DE TABLA no lo restringe un grant de columna:
--   el de tabla ya cubre TODAS las columnas, incluidas refresh_token y access_token.
--   Con la policy "Tenant members manage google integrations" (USING
--   private.has_tenant_access(tenant_id)), cualquier miembro autenticado de un tenant podia
--   leer y sobrescribir los tokens de Google de ese tenant via PostgREST. Habia 5 filas con
--   refresh_token real.
--
-- CAMBIO
--   Revoca los privilegios de tabla de authenticated y reafirma los grants de columna que la
--   intencion original queria dejar. Verificado con has_column_privilege, dentro de una
--   transaccion con ROLLBACK:
--     refresh_token / access_token -> false
--     google_email / is_connected  -> true
--   El dashboard lee desde el navegador (cliente anonimo con sesion = authenticated):
--     tenant_id, google_email, catalog_folder_id, catalog_folder_name, cover_folder_id,
--     cover_folder_name, last_synced_at, is_connected
--   que son un subconjunto estricto de las columnas concedidas: el dashboard sigue andando.
--   service_role queda intacto (la app escribe con el cliente admin).
--
-- ROLLBACK
--   grant select, update, maintain on table public.google_integrations to authenticated;

revoke select, update, maintain on table public.google_integrations from authenticated;

grant select (tenant_id, google_email, catalog_folder_id, catalog_folder_name,
              cover_folder_id, cover_folder_name, last_synced_at, updated_at, is_connected)
  on table public.google_integrations to authenticated;
