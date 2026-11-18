-- ==============================================================================
-- 2026-09-29 PREVENCIÓN DE TIENDAS DUPLICADAS POR MÚLTIPLES IDENTIDADES (GOOGLE + EMAIL)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_plan_id UUID;
  existing_tenant_id UUID;
  new_tenant_id UUID;
  base_subdomain TEXT;
  subdomain_candidate TEXT;
  counter INT := 0;
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

  -- 2. Si no existe ninguna tienda previa para este email, crearla normalmente
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
$$;
