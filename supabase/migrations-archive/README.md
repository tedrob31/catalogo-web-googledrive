# Archivo histórico de migraciones

Estos archivos **no se aplican**. Se movieron desde `supabase/migrations/` porque ninguna de
sus versiones existe en el historial de migraciones de la base, así que `supabase db push` las
habría reintentado sobre objetos que ya existen.

Su efecto **sí está en la base**: se aplicaron de forma ad-hoc (vía MCP o el SQL Editor) sin
quedar registrados. Eso es lo que causó el drift, y es por qué un endurecimiento de seguridad
se pudo perder sin que nadie lo notara: el mismo arreglo ya se había hecho una vez y volvió,
porque no era reproducible desde el repo.

| Archivo | Efecto en la base | Estado |
| :--- | :--- | :--- |
| `20260911_saas_multitenant_core.sql` | Las policies iniciales y las funciones guard | **Superado**: `public.is_superadmin`, `public.has_tenant_access` y `public.get_user_tenant_ids` se movieron al esquema `private` en `20260912_security_hardening.sql`. `public.handle_new_user` sigue vivo. |
| `20260912_security_hardening.sql` | Crea el esquema `private`, sus 3 funciones guard y 11 policies | **Vivo**: las 3 funciones y las 11 policies existen con esos nombres. |
| `20260918_superadmin_provision.sql` | `public.handle_auto_superadmin()` + trigger `tr_auto_superadmin` sobre `auth.users` | **Vivo**: ambos existen. |
| `20260929_fix_duplicate_tenant_on_auth.sql` | `public.handle_new_user()` | **Vivo**: existe. |
| `20261024_oauth_token_hardening.sql` | Revoca el acceso de `anon` a `google_integrations` y agrega una policy de lectura | **Parcial**: el ACL vivo de `google_integrations` no incluye `anon`, así que el `REVOKE` está aplicado; la policy `Tenant members select google integrations` que crea **no existe**, fue consolidada en `Tenant members manage google integrations`. |

Ninguno de esos tres cambios aparece en el historial de migraciones de la base
(`20260918_superadmin_provision`, `20260929_fix_duplicate_tenant_on_auth` y
`20261024_oauth_token_hardening` no están en él). El historial es, por lo tanto,
**incompleto como registro de auditoría**.

No se reescribió a propósito: es el único testimonio de que un cambio se aplicó. Fabricar
entradas —o archivos baseline que reconstruyan el efecto neto en lugar del DDL original—
habría repetido exactamente el vicio que causó el drift.
