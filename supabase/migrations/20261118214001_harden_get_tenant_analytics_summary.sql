-- Migracion: harden_get_tenant_analytics_summary
--
-- PROBLEMA
--   public.get_tenant_analytics_summary(p_tenant_id uuid, p_start_date date) era
--   SECURITY DEFINER con EXECUTE para PUBLIC/anon/authenticated. Su cuerpo filtra
--   public.tenant_page_metrics unicamente por el parametro p_tenant_id, sin verificar
--   que quien llama tenga acceso a ese tenant. Como SECURITY DEFINER corre como el
--   owner y saltea RLS, cualquier visitante con la anon key podia leer las metricas
--   de cualquier inquilino via POST /rest/v1/rpc/get_tenant_analytics_summary.
--   La policy tenant_owners_view_metrics sobre tenant_page_metrics existe y esta bien
--   escrita: esta funcion la esquivaba.
--
-- CAMBIO
--   1. Exposicion minima: revoca PUBLIC/anon/authenticated y deja solo service_role.
--      El unico consumidor real es src/app/api/analytics/route.ts, que la invoca con
--      el cliente admin (service_role) despues de resolver el tenant desde la sesion.
--   2. Defensa en profundidad: si quien llama trae identidad de usuario (auth.uid() no
--      es null) debe pertenecer al tenant o ser superadmin. Fue una recaida: el mismo
--      bug ya se habia arreglado en harden_security_definer_functions y
--      fix_public_execute_grant, y 20261104221010 lo reintrodujo. Con el guard adentro,
--      ampliar el grant no reinstala la fuga en silencio.
--
-- ROLLBACK
--   1. Quitar el bloque IF auth.uid() ... END IF; de esta migracion y reaplicarla.
--   2. Reponer la exposicion previa:
--        GRANT EXECUTE ON FUNCTION public.get_tenant_analytics_summary(uuid, date)
--          TO PUBLIC, anon, authenticated;
--   La definicion previa completa esta en la migracion 20261104221010.

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
$function$;

REVOKE ALL ON FUNCTION public.get_tenant_analytics_summary(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_analytics_summary(uuid, date) TO service_role;
