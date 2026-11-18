# Reconciliación del esquema de Supabase

Hacer que el repo pueda reconstruir la base y que `db push` no pueda aplicar nada por
accidente, sin inventar DDL que no se aplicó.

## Specs

**S1** — "Reconciliar el esquema (repo reconstruible)": el repositorio debe poder
reconstruir la base de datos desde sus propios artefactos.

**S2** — El artefacto que describe el esquema se **genera desde la base viva**, no se escribe
a mano. Es la lección del episodio `AUDIT_SCHEMA.sql`: un documento de auditoría
desactualizado llegó a documentar una versión **vulnerable** de
`get_tenant_analytics_summary` con `GRANT EXECUTE ... TO anon, authenticated, service_role`.

**S3** — El artefacto debe incluir todo lo que hoy no está en **ningún** archivo del repo:
`platform_whitelist`, `system_settings`, `private.create_unique_photos_index` y
`private.deduplicate_photos`, además de las 24 policies y los 2 triggers.

**S4** — `supabase db push` no debe poder aplicar nada por accidente. Hoy es un riesgo
**latente**: no existe `supabase/config.toml` ni link, pero `supabase/migrations/` contiene 4
archivos sin contraparte en el historial vivo que se reintentarían sobre objetos existentes.

**S5** — Los cambios futuros de base se siguen aplicando **como migración registrada**
(`apply_migration`), que es como se aplicaron las dos entradas nuevas del historial.

**No-objetivos explícitos** (decididos, no omitidos):

- **No** reconstruir los 7 archivos baseline del historial vivo. Serían aproximaciones del
  efecto neto, no el DDL original, y el historial además es **incompleto**: 3 cambios reales
  (`20260918_superadmin_provision`, `20260929_fix_duplicate_tenant_on_auth`,
  `20261024_oauth_token_hardening`) se aplicaron ad-hoc y **nunca quedaron registrados**.
- **No** escribir en `supabase_migrations.schema_migrations`. Es el único registro de que un
  cambio se aplicó; reescribirlo destruye información de auditoría.

## Tasks

- **T1** (S2, S3) — Generar `supabase/schema.sql` desde la base viva: 11 tablas con columnas,
  tipos, defaults, PK/FK, índices, RLS y las 24 policies; las 11 funciones de `public` y
  `private` con su definición real (`pg_get_functiondef`), `SECURITY DEFINER` y `search_path`;
  los 2 triggers de `auth.users`; los grants; y las extensiones.
  *Ruta:* inline — los subagentes no tienen `codemode` ni el MCP, comprobado dos veces hoy.
- **T2** (S4) — Archivar `supabase/migrations/*` en `supabase/migrations-archive/` con un
  README que explique por qué cada archivo está ahí y que su efecto ya está en la base.
  Verificar antes que el efecto de los 4 archivos realmente exista en la base.
- **T3** (S1, S4, S5) — Reescribir `supabase/README.md`: `schema.sql` es la fuente de verdad,
  `migrations/` queda para cambios nuevos, `migrations-archive/` es histórico.
- **T4** (S1) — Verificar la cobertura del snapshot: cada objeto vivo (tabla, policy, función,
  trigger, índice) debe aparecer en `schema.sql`, contado contra el catálogo. Y que el archivo
  sea DDL válido y ordenado para poder aplicarse de cero.

## Log

**L1** (pedido original, textual): "ok bien, entonces ahora actualicemos esos ultimos datos
que dejaste anotado, para ya terminar. y luego ver nuevas mejoras e implementaciones."

**L2** (decisión del humano, textual): "Reconciliar el esquema (repo reconstruible)" —
"Capturar platform_whitelist, system_settings y los objetos que solo viven en la base, y
regenerar AUDIT_SCHEMA desde la base real. Es la causa raiz del drift que ya causo una
regresion de seguridad".

**L3** (decisión del humano, textual): "Dejarlos locales por ahora" — los commits `efe0658` y
`3a5b4dd` no se suben a `main`.

**L4** (evidencia, inventario vivo del 2026-11-18):
- 11 tablas en `public`, todas con RLS: albums(11 cols/2 pol/4 idx), google_integrations(12/1/1),
  photos(14/2/4), platform_whitelist(2/2/1), subscription_plans(8/2/2), sync_logs(9/1/2),
  system_settings(3/2/1), tenant_configs(13/4/1), tenant_page_metrics(9/2/3),
  tenant_users(5/2/4), tenants(12/4/5). Total **24 policies**.
- 11 funciones: `private.create_unique_photos_index`, `private.deduplicate_photos` (ambas sin
  `search_path`), `private.get_user_tenant_ids`, `private.has_tenant_access`,
  `private.is_superadmin`, `public.get_tenant_analytics_summary`,
  `public.handle_auto_superadmin`, `public.handle_new_user`, `public.increment_page_metric`,
  `public.increment_page_metrics_batch`. Todas `SECURITY DEFINER`.
- Triggers: `auth.users.on_auth_user_created`, `auth.users.tr_auto_superadmin`.
- Extensiones: pg_stat_statements, pgcrypto, plpgsql, supabase_vault, uuid-ossp.
- `AUDIT_SCHEMA.sql` documenta 9 tablas y 20 policies: le faltan las 2 tablas, 4 policies y
  2 funciones de arriba.

**L5** (evidencia, historial vivo, 9 entradas): `20260912001753 saas_multitenant_core`,
`20260912001907 add_tokens_to_google_integrations`, `20260912003247
harden_security_definer_functions`, `20260912003333 fix_public_execute_grant`,
`20260912135605 add_settings_jsonb_to_tenant_configs`, `20261104210127
add_increment_page_metrics_batch`, `20261104221010 add_get_tenant_analytics_summary`,
`20261118214001 harden_get_tenant_analytics_summary`, `20261118215844
harden_page_metrics_grants`.

**L6** (evidencia, T1 hecho): `supabase/schema.sql`, 33.968+ bytes generados desde el
catálogo. Cobertura verificada contra el catálogo: 11 bloques `create table`, **98 columnas
con 0 faltantes y 0 de más**, 32 constraints, 11 índices no pertenecientes a constraints,
24 policies, 10 funciones y 2 triggers, todos presentes. Las plantillas escritas a mano se
ejercitaron en una transacción con `ROLLBACK` contra un objeto descartable:
`PLANTILLAS OK`, con residuo cero comprobado (0 tablas, 0 funciones, 0 policies).

**L7** (evidencia, T2 hecho): los 5 archivos sin contraparte en el historial se verificaron
contra la base antes de archivarse. Cuatro están plenamente vivos;
`20260911_saas_multitenant_core.sql` está **superado** (sus funciones guard viven hoy en
`private`, no en `public`) y `20261024_oauth_token_hardening.sql` está **parcialmente** vivo
(el `REVOKE` a `anon` sobre `google_integrations` sí está aplicado, pero la policy que crea
fue consolidada en otra). Se movieron con `git mv` a `supabase/migrations-archive/`.

**L8** (decisión, T3): `migrations/` queda con exactamente los 2 archivos cuyas versiones
existen en el historial vivo, lo que hace que `supabase db push` sea un no-op. `schema.sql`
es la fuente de verdad del esquema; `migrations/` es la vía de los cambios nuevos.

**L9** (límite declarado): `schema.sql` **no** se aplicó contra una base completa. No hay
entorno aislado en el repo; la prueba de extremo a extremo es una branch de Supabase, que
tiene costo y quedó como decisión del dueño.
