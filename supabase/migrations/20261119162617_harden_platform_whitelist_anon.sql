-- Migracion: harden_platform_whitelist_anon
--
-- PROBLEMA (advisory R1-001 de la review nativa)
--   public.platform_whitelist exponia 9 emails REALES a cualquiera con la anon key: la policy
--   "Public read whitelist" era FOR SELECT TO public USING (true) y anon tenia SELECT de tabla.
--   Comprobado simulando el rol: seteando role=anon, count(*) devolvia 9.
--   Ningun consumidor lo necesita: las 4 rutas que usan la tabla (superadmin/tenants/create,
--   superadmin/tenants/delete, superadmin/whitelist, tenant/auto-provision) la leen y la
--   escriben con createAdminClient() (service_role) desde el servidor.
--
-- CAMBIO
--   Revoca los privilegios de tabla de anon y elimina la policy de lectura publica.
--   service_role no se toca (saltea RLS), y la policy "Superadmin manage whitelist"
--   (USING private.is_superadmin()) queda intacta, asi que un superadmin sigue gestionandola
--   con su sesion.
--   Verificado antes de aplicar, dentro de una transaccion con ROLLBACK:
--     anon SELECT true->false · policies 2->1 · policies USING (true) 1->0 · service_role true
--
-- ROLLBACK
--   grant select, update on table public.platform_whitelist to anon;
--   create policy "Public read whitelist" on public.platform_whitelist for select to public using (true);
--   ADVERTENCIA: eso vuelve a PUBLICAR los 9 emails a cualquiera con la anon key. Solo si el
--   negocio decide exponerlos, y sabiendo que quedan indexables.

revoke select, update on table public.platform_whitelist from anon;
drop policy "Public read whitelist" on public.platform_whitelist;
