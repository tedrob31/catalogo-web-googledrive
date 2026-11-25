# Esquema de Supabase: qué es la fuente de verdad

## `schema.sql` — el esquema consolidado

Snapshot **generado desde la base viva**, no escrito a mano. Describe las 11 tablas de
`public`, sus 98 columnas, 32 constraints, 11 índices, las 24 policies, las 10 funciones de
`public` y `private`, los 2 triggers sobre `auth.users`, los grants y las extensiones.

La intención es que, aplicado sobre una base vacía, reconstruya el esquema; **eso todavía no
está probado de punta a punta** — ver "Verificación" más abajo. Todo lo que se puede derivar
del catálogo usa las funciones autoritativas de PostgreSQL (`pg_get_functiondef`,
`pg_get_constraintdef`, `pg_get_indexdef`, `pg_get_triggerdef`).

**Por qué generado y no escrito a mano**: `AUDIT_SCHEMA.sql` (que este archivo reemplaza) era
un snapshot manual y llegó a documentar una versión **vulnerable** de
`get_tenant_analytics_summary`, con `GRANT EXECUTE ... TO anon, authenticated, service_role`.
Un documento de auditoría desactualizado **arma** la vulnerabilidad que dice describir.

## El orden de las sentencias importa, y no es casual

Dos restricciones que se descubrieron al preguntarse si el archivo se puede aplicar de cero.
Las dos están **comprobadas** contra PostgreSQL:

1. **Las funciones van antes que las policies.** 16 de las 24 policies llaman a
   `private.has_tenant_access()` o `private.is_superadmin()`, y PostgreSQL resuelve esa función
   **al crear la policy**: si todavía no existe, falla con `42883 function does not exist`.
2. **Entre funciones, el orden es topológico.** `private.has_tenant_access` es `LANGUAGE sql`
   y llama a `private.is_superadmin`; las funciones de lenguaje `sql` resuelven sus referencias
   al crearse (también `42883`, comprobado). El orden se calcula desde los **cuerpos**, porque
   `pg_depend` **no** registra esa dependencia.
3. Los triggers van al final: dependen de sus funciones.

Por eso el archivo se **genera con un orden topológico**, no alfabético. Si se reordena a mano
hay que respetar esas relaciones.

## `migrations/` — cambios nuevos, registrados

Los cambios de base se aplican **como migración registrada** (`apply_migration`), no con SQL
suelto. Hoy la carpeta contiene sólo las dos entradas que existen en el historial de la base,
así que `supabase db push` es un no-op: no hay nada que reintentar.

Un archivo local cuya versión no esté en el historial **sí** se reintentaría. No agregar
archivos acá sin aplicarlos por el camino registrado.

## `migrations-archive/` — histórico, no se aplica

Cinco archivos sin contraparte en el historial, ya aplicados ad-hoc. Ver su README para el
detalle de cada uno y su estado actual.

## Historial vivo (9 entradas)

```
20260912001753  saas_multitenant_core
20260912001907  add_tokens_to_google_integrations
20260912003247  harden_security_definer_functions
20260912003333  fix_public_execute_grant
20260912135605  add_settings_jsonb_to_tenant_configs
20261104210127  add_increment_page_metrics_batch
20261104221010  add_get_tenant_analytics_summary
20261118214001  harden_get_tenant_analytics_summary   <- migracion/archivo local
20261118215844  harden_page_metrics_grants            <- migracion/archivo local
20261118235452  fix_google_integrations_column_scope  <- migracion/archivo local
20261119162617  harden_platform_whitelist_anon        <- migracion/archivo local
20261124233517  harden_trigger_functions_and_search_path <- migracion/archivo local
```

Sólo las **cinco** últimas tienen archivo local, y esa correspondencia exacta es la que hace seguro
a `db push`. Las siete primeras no se reconstruyeron: sólo se conoce su efecto neto, no el DDL
original, y tres cambios reales ni siquiera están registrados (ver
`migrations-archive/README.md`).

## Verificación: qué está probado y qué falta

**Probado:**

- **Cobertura, contra el catálogo**: 11 tablas, 98 columnas (0 faltantes, 0 de más), 32
  constraints, 11 índices no pertenecientes a constraints, 24 policies, 10 funciones y 2
  triggers, todos presentes.
- **Plantillas**: las sentencias escritas a mano (`create table`, `alter table add constraint`,
  `create index`, `create policy`, `revoke`/`grant` de tabla, columna y función) se ejercitaron
  en una transacción con `ROLLBACK`, con residuo cero comprobado.
- **Relaciones de orden**: las tres del apartado anterior, cada una con su prueba.

**NO probado — y es la única deuda abierta de este archivo:** el `schema.sql` completo aplicado
sobre una base vacía, de punta a punta. Es el chequeo que habría atrapado los dos bugs de orden
que se encontraron razonando (uno de ellos vivió en el archivo hasta que alguien preguntó si
convenía verificarlo).

Ese chequeo necesita un entorno aislado, y **no hay ninguno disponible desde este repo** (ni
Docker ni un `psql` local). Las opciones:

- **Gratis, en tu VPS**: correr `schema.sql` contra un Postgres de descarte, por ejemplo
  `docker run --rm -d --name scratch-postgres -e POSTGRES_PASSWORD=x postgres:17` y después
  `docker exec -i scratch-postgres psql -U postgres -f - < supabase/schema.sql`. Sirve para
  comprobar que **aplica entero**; para comparar el esquema resultante con el vivo habría que
  crear antes los roles `anon`, `authenticated` y `service_role` y el esquema `auth` (los
  triggers viven en `auth.users`), porque este snapshot es específico de Supabase y **no**
  aplica sobre un Postgres pelado.
- **Con costo**: una branch de Supabase (`create_branch` vía MCP), aplicar ahí y borrarla.

Mientras eso no se corra, este archivo es una descripción **fiel** del esquema, pero no está
garantizado que se aplique de cero en una sola pasada.

## Verificación manual end-to-end de la resolución de tenant

`tests/tenant-host.test.mjs` cubre el parser de Host y dos invariantes estáticos, pero no puede
probar la ruta completa: para eso hacen falta un servidor y la base. Procedimiento, el mismo
que se usó para verificar el fix contra producción:

1. `POST` a `/api/analytics/track/` — **con barra final**; sin ella Next responde `308` y no
   registra nada — con el `Host` de un inquilino real y un cuerpo que declare el `tenant_id`
   de **otro** inquilino.
2. El buffer en RAM vacía a los 80 registros distintos, o a los 60 segundos.
3. Consultar `tenant_page_metrics`: la fila debe quedar bajo el inquilino del **Host**, no bajo
   el del cuerpo.
4. Repetir con el `Host` del dominio raíz (`c4talogo.com`): no debe registrarse ninguna fila.
5. Borrar las filas de prueba (`path LIKE '/__verify_%'`) y confirmar que el total vuelve al
   valor previo.
