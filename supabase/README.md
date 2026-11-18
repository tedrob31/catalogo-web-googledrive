# Esquema de Supabase: qué es la fuente de verdad

## `schema.sql` — el esquema consolidado

Snapshot **generado desde la base viva**, no escrito a mano. Describe las 11 tablas de
`public`, sus 98 columnas, 32 constraints, 11 índices, las 24 policies, las 10 funciones de
`public` y `private`, los 2 triggers sobre `auth.users`, los grants y las extensiones.

Aplicado sobre una base vacía, reconstruye el esquema. Todo lo que se puede derivar del
catálogo usa las funciones autoritativas de PostgreSQL (`pg_get_functiondef`,
`pg_get_constraintdef`, `pg_get_indexdef`, `pg_get_triggerdef`).

**Por qué generado y no escrito a mano**: `AUDIT_SCHEMA.sql` (que este archivo reemplaza) era
un snapshot manual y llegó a documentar una versión **vulnerable** de
`get_tenant_analytics_summary`, con `GRANT EXECUTE ... TO anon, authenticated, service_role`.
Un documento de auditoría desactualizado **arma** la vulnerabilidad que dice describir.

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
```

Sólo las dos últimas tienen archivo local, y esa correspondencia exacta es la que hace seguro
a `db push`. Las siete primeras no se reconstruyeron: sólo se conoce su efecto neto, no el DDL
original, y tres cambios reales ni siquiera están registrados (ver
`migrations-archive/README.md`).

## Verificación pendiente

`schema.sql` no se aplicó contra una base completa: no hay un entorno aislado en este repo.
Lo que sí está verificado:

- **Cobertura**: cada objeto vivo (tablas, columnas, constraints, índices, policies, funciones,
  triggers) aparece en el archivo, contado contra el catálogo.
- **Plantillas**: las sentencias escritas a mano (`create table`, `alter table add constraint`,
  `create index`, `create policy`, `revoke`/`grant` de tabla, columna y función) se ejercitaron
  en una transacción con `ROLLBACK`, con residuo cero comprobado.

La prueba de extremo a extremo es crear una **branch** de Supabase (`create_branch` vía MCP),
aplicar `schema.sql` ahí, comparar el esquema resultante con el vivo y borrar la branch. No se
hizo: una branch tiene costo y es una decisión del dueño del proyecto.

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
