-- Migracion: harden_page_metrics_grants
--
-- PROBLEMA
--   public.increment_page_metric(...) y public.increment_page_metrics_batch(jsonb) son
--   SECURITY DEFINER con EXECUTE para PUBLIC/anon/authenticated. Ninguna verifica que
--   quien llama tenga acceso al tenant que envian: la primera lo recibe en p_tenant_id
--   y la segunda lo lee de (m->>'tenant_id') dentro del JSONB. Cualquier visitante con
--   la anon key podia inflar las metricas de cualquier inquilino via
--   POST /rest/v1/rpc/increment_page_metric.
--   Ademas increment_page_metric es SECURITY DEFINER sin search_path fijado.
--
-- CAMBIO
--   1. Exposicion minima: revoca PUBLIC/anon/authenticated y deja solo service_role.
--      Ninguna necesita acceso publico: el unico consumidor es src/lib/analytics-buffer.ts,
--      que las invoca con createAdminClient() (service_role) desde el servidor. El
--      navegador nunca llama RPCs; pasa por POST /api/analytics/track.
--   2. Fija search_path = public en increment_page_metric. Su cuerpo solo referencia
--      public.tenant_page_metrics y built-ins, asi que fijarlo no cambia su semantica.
--
-- FUERA DE ALCANCE (a proposito)
--   Esto NO cierra la inflacion de metricas de punta a punta: src/app/api/analytics/track
--   todavia toma tenant_id del cuerpo del request. Ese es un cambio de runtime en la app
--   y va por separado.
--
-- ROLLBACK
--   GRANT EXECUTE ON FUNCTION public.increment_page_metric(uuid, date, text, text, integer, integer) TO PUBLIC, anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.increment_page_metrics_batch(jsonb) TO PUBLIC, anon, authenticated;
--   ALTER FUNCTION public.increment_page_metric(uuid, date, text, text, integer, integer) RESET search_path;

REVOKE ALL ON FUNCTION public.increment_page_metric(uuid, date, text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_page_metrics_batch(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_page_metric(uuid, date, text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_page_metrics_batch(jsonb) TO service_role;
ALTER FUNCTION public.increment_page_metric(uuid, date, text, text, integer, integer) SET search_path = public;
