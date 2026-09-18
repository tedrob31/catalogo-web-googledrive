-- ==============================================================================
-- PROVISIÓN AUTOMÁTICA DE SUPERADMINISTRADOR
-- ==============================================================================

-- 1. Promover correos maestros a rol 'superadmin' en tenant_users
UPDATE public.tenant_users
SET role = 'superadmin'
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('hardted31@gmail.com', 'teddy.robles.cc@gmail.com')
);

-- 2. Función Trigger: Si el correo maestro se registra o actualiza, otorgarle superadmin automáticamente
CREATE OR REPLACE FUNCTION public.handle_auto_superadmin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IN ('hardted31@gmail.com', 'teddy.robles.cc@gmail.com') THEN
    UPDATE public.tenant_users
    SET role = 'superadmin'
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_superadmin ON auth.users;
CREATE TRIGGER tr_auto_superadmin
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auto_superadmin();
