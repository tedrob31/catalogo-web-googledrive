ALTER TABLE public.tenant_page_metrics
  ADD COLUMN IF NOT EXISTS unique_visitors integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_page_metric(
    p_tenant_id uuid,
    p_date date,
    p_path text,
    p_title text,
    p_views integer,
    p_whatsapp integer,
    p_unique_visitors integer DEFAULT 0
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.tenant_page_metrics (
        tenant_id, date, path, title, views_count, unique_visitors, whatsapp_clicks, updated_at
    )
    VALUES (
        p_tenant_id,
        p_date,
        p_path,
        p_title,
        GREATEST(COALESCE(p_views, 0), 0),
        GREATEST(COALESCE(p_unique_visitors, 0), 0),
        GREATEST(COALESCE(p_whatsapp, 0), 0),
        now()
    )
    ON CONFLICT (tenant_id, date, path)
    DO UPDATE SET
        views_count = tenant_page_metrics.views_count + EXCLUDED.views_count,
        unique_visitors = tenant_page_metrics.unique_visitors + EXCLUDED.unique_visitors,
        whatsapp_clicks = tenant_page_metrics.whatsapp_clicks + EXCLUDED.whatsapp_clicks,
        title = CASE
            WHEN EXCLUDED.title <> 'Catálogo' AND EXCLUDED.title <> 'Catálogo Principal'
            THEN EXCLUDED.title
            ELSE tenant_page_metrics.title
        END,
        updated_at = now();
END;
$function$;

REVOKE ALL ON FUNCTION public.increment_page_metric(uuid, date, text, text, integer, integer, integer) FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_page_metric(uuid, date, text, text, integer, integer, integer) TO postgres;
GRANT EXECUTE ON FUNCTION public.increment_page_metric(uuid, date, text, text, integer, integer, integer) TO service_role;

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
        tenant_id, date, path, title, views_count, unique_visitors, whatsapp_clicks, updated_at
    )
    SELECT
        (m->>'tenant_id')::UUID,
        (m->>'date')::DATE,
        m->>'path',
        m->>'title',
        GREATEST(COALESCE((m->>'views')::INT, 0), 0),
        GREATEST(COALESCE((m->>'unique_visitors')::INT, 0), 0),
        GREATEST(COALESCE((m->>'whatsapp')::INT, 0), 0),
        now()
    FROM jsonb_array_elements(p_metrics) AS m
    ON CONFLICT (tenant_id, date, path)
    DO UPDATE SET
        views_count = tenant_page_metrics.views_count + EXCLUDED.views_count,
        unique_visitors = tenant_page_metrics.unique_visitors + EXCLUDED.unique_visitors,
        whatsapp_clicks = tenant_page_metrics.whatsapp_clicks + EXCLUDED.whatsapp_clicks,
        title = CASE
            WHEN EXCLUDED.title <> 'Catálogo' AND EXCLUDED.title <> 'Catálogo Principal'
            THEN EXCLUDED.title
            ELSE tenant_page_metrics.title
        END,
        updated_at = now();
END;
$function$;

REVOKE ALL ON FUNCTION public.increment_page_metrics_batch(jsonb) FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_page_metrics_batch(jsonb) TO postgres;
GRANT EXECUTE ON FUNCTION public.increment_page_metrics_batch(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.get_tenant_analytics_summary(p_tenant_id uuid, p_start_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
    v_total_unique_visitors BIGINT := 0;
    v_total_views BIGINT := 0;
    v_total_category_views BIGINT := 0;
    v_total_whatsapp BIGINT := 0;
    v_daily_trend JSONB;
    v_top_content JSONB;
    v_top_page TEXT := 'Ninguna aún';
BEGIN

    IF auth.uid() IS NOT NULL AND NOT private.has_tenant_access(p_tenant_id) THEN
        RAISE EXCEPTION 'not authorized for tenant %', p_tenant_id USING ERRCODE = '42501';
    END IF;

    SELECT
        COALESCE(SUM(unique_visitors), 0),
        COALESCE(SUM(views_count), 0),
        COALESCE(SUM(views_count) FILTER (WHERE path <> '/'), 0),
        COALESCE(SUM(whatsapp_clicks), 0)
    INTO
        v_total_unique_visitors,
        v_total_views,
        v_total_category_views,
        v_total_whatsapp
    FROM public.tenant_page_metrics
    WHERE tenant_id = p_tenant_id AND date >= p_start_date;

    SELECT COALESCE(jsonb_agg(d ORDER BY (d->>'date') ASC), '[]'::jsonb)
    INTO v_daily_trend
    FROM (
        SELECT jsonb_build_object(
            'date', date::text,
            'unique_visitors', COALESCE(SUM(unique_visitors), 0),
            'views', COALESCE(SUM(views_count), 0),
            'whatsapp', COALESCE(SUM(whatsapp_clicks), 0)
        ) AS d
        FROM public.tenant_page_metrics
        WHERE tenant_id = p_tenant_id AND date >= p_start_date
        GROUP BY date
    ) sub;

    SELECT COALESCE(jsonb_agg(c), '[]'::jsonb)
    INTO v_top_content
    FROM (
        SELECT jsonb_build_object(
            'path', path,
            'title', MAX(title),
            'views', COALESCE(SUM(views_count), 0),
            'unique_visitors', COALESCE(SUM(unique_visitors), 0),
            'whatsapp', COALESCE(SUM(whatsapp_clicks), 0)
        ) AS c
        FROM public.tenant_page_metrics
        WHERE tenant_id = p_tenant_id AND date >= p_start_date
        GROUP BY path
        ORDER BY SUM(views_count) DESC, SUM(whatsapp_clicks) DESC
        LIMIT 15
    ) sub;

    SELECT COALESCE(MAX(sub.title), 'Ninguna aún')
    INTO v_top_page
    FROM (
        SELECT MAX(title) AS title
        FROM public.tenant_page_metrics
        WHERE tenant_id = p_tenant_id AND date >= p_start_date AND path <> '/'
        GROUP BY path
        ORDER BY SUM(views_count) DESC, SUM(whatsapp_clicks) DESC
        LIMIT 1
    ) sub;

    IF v_top_page = 'Ninguna aún' AND jsonb_array_length(v_top_content) > 0 THEN
        v_top_page := COALESCE(v_top_content->0->>'title', 'Ninguna aún');
    END IF;

    v_result := jsonb_build_object(
        'total_unique_visitors', v_total_unique_visitors,
        'total_views', v_total_views,
        'total_category_views', v_total_category_views,
        'total_whatsapp', v_total_whatsapp,
        'daily_trend', v_daily_trend,
        'top_content', v_top_content,
        'top_page', v_top_page
    );

    RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_tenant_analytics_summary(uuid, date) FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_tenant_analytics_summary(uuid, date) TO postgres;
GRANT EXECUTE ON FUNCTION public.get_tenant_analytics_summary(uuid, date) TO service_role;
