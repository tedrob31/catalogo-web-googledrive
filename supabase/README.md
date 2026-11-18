# Estado del esquema de Supabase

**La fuente de verdad es el historial de migraciones del proyecto vivo, no esta carpeta.**

Los archivos de `migrations/` se escribieron a mano en distintos momentos y **no** forman un
conjunto reproducible: no coinciden con el historial registrado en la base. Reconciliar antes
de usar cualquier comando que aplique migraciones.

## No correr `supabase db push`

Tal cual está, la CLI compara esta carpeta con el historial del proyecto y trata de aplicar
las migraciones locales que no encuentra registradas: cinco archivos se reintentarían (varios
sobre objetos que ya existen) y siete entradas del historial no tienen archivo local. El
resultado es, en el mejor caso, un error; en el peor, un estado divergente que nadie puede
reproducir.

## Historial vivo (9 entradas) contra los archivos locales (7)

| Versión (viva) | Nombre | ¿Archivo local? |
| :--- | :--- | :--- |
| `20260912001753` | `saas_multitenant_core` | ✗ — local `20260911_saas_multitenant_core.sql`, versión distinta |
| `20260912001907` | `add_tokens_to_google_integrations` | ✗ — no existe |
| `20260912003247` | `harden_security_definer_functions` | ✗ — no existe |
| `20260912003333` | `fix_public_execute_grant` | ✗ — no existe |
| `20260912135605` | `add_settings_jsonb_to_tenant_configs` | ✗ — no existe |
| `20261104210127` | `add_increment_page_metrics_batch` | ✗ — no existe |
| `20261104221010` | `add_get_tenant_analytics_summary` | ✗ — no existe |
| `20261118214001` | `harden_get_tenant_analytics_summary` | ✅ coincide |
| `20261118215844` | `harden_page_metrics_grants` | ✅ coincide |

Archivos locales **sin** contraparte viva: `20260912_security_hardening.sql`,
`20260918_superadmin_provision.sql`, `20260929_fix_duplicate_tenant_on_auth.sql`,
`20261024_oauth_token_hardening.sql`. Sus cambios (por ejemplo el trigger
`handle_auto_superadmin` y la tabla `platform_whitelist`) **sí existen en la base**, pero se
aplicaron de forma ad-hoc y no quedaron registrados en ese camino. Por eso nunca se
detectó que el endurecimiento se había perdido.

## Qué es y qué no es `AUDIT_SCHEMA.sql`

Es un **snapshot parcial escrito a mano**, no el DDL completo de la base:

- Documenta **9** tablas; en `public` hay **11**. Faltan `platform_whitelist` y
  `system_settings`, que existen en la base y el código usa (`src/lib/system-settings.ts`,
  rutas de superadmin y `api/tenant/auto-provision`), pero no aparecen en ningún artefacto SQL
  del repo.
- No lo aplica ningún runner: es documentación, y `ARCHITECTURE.md` / `GEMINI.md` lo
  referencian como fuente de auditoría.
- Llegó a documentar una versión **vulnerable** de `get_tenant_analytics_summary` con
  `GRANT EXECUTE ... TO anon, authenticated, service_role`. Ya está alineado con la base, pero
  el episodio muestra el riesgo: un documento de auditoría desactualizado **arma** la
  vulnerabilidad que dice describir.

## Reconciliación pendiente (cómo hacerlo bien)

1. Generar el DDL real desde la base (`pg_get_functiondef`, `pg_policies`,
   `information_schema.columns`, `pg_indexes`) y reemplazar `AUDIT_SCHEMA.sql` por eso, en
   lugar de seguir agregando a mano.
2. Capturar `platform_whitelist`, `system_settings` y los objetos que hoy solo viven en la
   base como migraciones registradas, para que el repo pueda reconstruir la base.
3. A partir de ahí, `migrations/` pasa a ser la fuente de verdad y `db push` deja de ser
   peligroso.

Hasta entonces: los cambios de base se aplican como migración registrada (`apply_migration`),
que es lo que hacen las dos entradas nuevas de la tabla.

## Verificación manual end-to-end de la resolución de tenant

`tests/tenant-host.test.mjs` cubre el parser de Host y dos invariantes estáticos, pero no
puede probar la ruta completa: para eso hacen falta un servidor y la base. Procedimiento, el
mismo que se usó para verificar el fix contra producción:

1. `POST` a `/api/analytics/track/` — **con barra final**; sin ella Next responde `308` y no
   registra nada — con el `Host` de un inquilino real y un cuerpo que declare el `tenant_id`
   de **otro** inquilino.
2. El buffer en RAM vacía a los 80 registros distintos, o a los 60 segundos.
3. Consultar `tenant_page_metrics`: la fila debe quedar bajo el inquilino del **Host**, no
   bajo el del cuerpo.
4. Repetir con el `Host` del dominio raíz (`c4talogo.com`): no debe registrarse ninguna fila.
5. Borrar las filas de prueba (`path LIKE '/__verify_%'`) y confirmar que el total vuelve al
   valor previo.
