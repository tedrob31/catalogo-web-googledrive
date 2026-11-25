-- Migracion: harden_trigger_functions_and_search_path
--
-- PROBLEMA (alertas del Security Advisor de Supabase en vivo del 2026-11-24)
--   1. public.handle_auto_superadmin() es SECURITY DEFINER (trigger de auth.users) y tenia
--      GRANT EXECUTE otorgado a PUBLIC, anon y authenticated (lints 0028 y 0029).
--   2. Cuatro funciones SECURITY DEFINER tenian search_path mutable (lint 0011):
--      public.handle_auto_superadmin(), public.handle_new_user(),
--      private.create_unique_photos_index() y private.deduplicate_photos().
--
-- CAMBIO
--   1. Revoca EXECUTE de PUBLIC, anon y authenticated sobre public.handle_auto_superadmin(),
--      manteniendo solo postgres y service_role.
--   2. Fija search_path explicito en las 4 funciones SECURITY DEFINER.
--
-- ROLLBACK
--   GRANT EXECUTE ON FUNCTION public.handle_auto_superadmin() TO PUBLIC, anon, authenticated;
--   ALTER FUNCTION public.handle_auto_superadmin() RESET search_path;
--   ALTER FUNCTION public.handle_new_user() RESET search_path;
--   ALTER FUNCTION private.create_unique_photos_index() RESET search_path;
--   ALTER FUNCTION private.deduplicate_photos() RESET search_path;

REVOKE ALL ON FUNCTION public.handle_auto_superadmin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_auto_superadmin() TO postgres, service_role;

ALTER FUNCTION public.handle_auto_superadmin() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;
ALTER FUNCTION private.create_unique_photos_index() SET search_path = public;
ALTER FUNCTION private.deduplicate_photos() SET search_path = public;
