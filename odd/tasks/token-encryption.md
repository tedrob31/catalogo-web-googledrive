# Cifrado de los tokens de Drive

Cerrar el último ítem de seguridad de base antes de la auditoría ADA-CASA: los `refresh_token`
y `access_token` de Google viven hoy en texto plano en `public.google_integrations`.

## Specs

**S1** — Los tokens de Drive se guardan **cifrados en reposo** en la base. Hoy están en texto
plano en `google_integrations.refresh_token` y `.access_token`; sólo los protege el cifrado de
disco de Supabase, no uno a nivel de aplicación.

**S2** — El cifrado se hace **en la aplicación**, no en la base, y **sin agregar superficie
nueva**: no se crea ninguna función ni vista en `public`, ningún RPC, ningún grant. El motivo
es concreto: una función `SECURITY DEFINER` en `public` saltea RLS, que es exactamente la clase
de defecto que produjo dos hallazgos en esta sesión, y acá custodiaría tokens de Google.

**S3** — La clave se toma de `TOKEN_ENCRYPTION_KEY` (32 bytes en base64) y **nunca** se
versiona. Si falta, **falla al escribir** en lugar de degradar a texto plano en silencio.

**S4** — Compatibilidad con lo que ya está guardado: al leer, un valor **sin** el prefijo `v1:`
se trata como legado en texto plano y se devuelve tal cual. Al escribir, siempre cifrado. Así
la migración es progresiva: cada fila se cifra la próxima vez que se toca (un refresh de token
o una sincronización), sin una operación de reescritura masiva que pueda fallar a mitad de camino.

**S5** — Sin cambios de esquema: las columnas siguen siendo `text` y guardan `v1:<base64>`.

**S6** — Verificable sin credenciales de Google: ida y vuelta del cifrado, rechazo de un valor
manipulado (GCM detecta la alteración), tolerancia del legado, y que sin clave se rechace la
escritura.

**No-objetivo**: rotación de la clave. Cambiarla obliga a re-cifrar todo; queda documentado, no
implementado.

## Tasks

- [x] **T1** (S1, S2, S3, S4, S5) — `src/lib/token-crypto.ts`: `encryptToken`, `decryptToken`,
  `isEncrypted`, con AES-256-GCM y prefijo de versión.
- [x] **T2** (S1, S3) — Cablear los 4 consumidores: `auth/google/callback` (escribe),
  `auth/google/disconnect` (lee para revocar, anula), `lib/google-auth.ts` (lee para
  autenticar, escribe al renovar), `lib/multitenant-sync.ts` (anula al expirar).
- [x] **T3** (S6) — Prueba de ida y vuelta y de rechazo, agregada a `npm test`.
- [x] **T4** — Documentar el orden de despliegue: la variable debe existir en Portainer
  **antes** del redeploy.

## Despliegue: el orden importa

**1. Generar la clave** (no la generes en un chat ni la pegues en un archivo del repo):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**2. Cargarla en Portainer** como `TOKEN_ENCRYPTION_KEY` en el entorno del servicio, **antes**
del redeploy. Guardala en tu gestor de contraseñas: si se pierde, los tokens cifrados son
irrecuperables y cada inquilino tiene que reconectar Drive.

**3. Redeploy.**

**4. Verificar el flujo real de Drive** (conectar una cuenta y sincronizar). No se puede probar
desde el repo: requiere una cuenta de Google y el consentimiento OAuth.

### Qué pasa si se despliega sin la clave

Degrada de forma **visible**, no silenciosa:

- Leer un token heredado en texto plano: **funciona** (no necesita clave).
- Conectar Drive (callback OAuth): **falla con error 500 visible**, porque `encryptToken`
  lanza en lugar de guardar en claro.
- Renovación de token durante un sync: el error se registra y los tokens no se persisten, sin
tumbar el proceso.

### Migración progresiva

Las 5 filas que hoy tienen token en texto plano se cifran **la próxima vez que se escriben**:
un refresh de token o una sincronización. No hay una operación masiva que pueda fallar a mitad
de camino. Para confirmar que no quedó ninguna en claro:

```sql
select count(*) from public.google_integrations
where coalesce(refresh_token,'') not like 'v1:%'
   or coalesce(access_token,'')  not like 'v1:%';
```

(`0` = todas cifradas. Las que estén en `NULL` no cuentan como exposición.)

## Log

**L1** (pedido original, textual): "y las 3 cosas que no tocaste, entonces podemos inciarlas ?
porque tenia esa duda, si ni siquiera hemos arreglado la seguridad o para intentar dejarlo listo
para una prueba ADA-CASA, entonces para que seguir en produccion, si luego no resusltara, mejor
seria dejar las bases hechas, para luego ya ir agregando nuevas funcionalidades o diseños a partir
de la base ."

**L2** (decisión del humano, textual): eligió "Cifrar los tokens (Vault de Supabase)", y después
de conocer el costo de superficie eligió **"AES en Node (sin superficie nueva)"**.

**L3** (evidencia, reconocimiento): los tokens se leen y escriben en 4 archivos —
`src/app/api/auth/google/callback/route.ts`, `src/app/api/auth/google/disconnect/route.ts`,
`src/lib/google-auth.ts`, `src/lib/multitenant-sync.ts` — más `src/types/database.types.ts`
(tipos). Hay **5 filas** con `refresh_token` real. `service_role` es el único consumidor.

**L4** (evidencia, por qué no Vault): PostgREST sólo expone `public`, así que usar Vault
obligaría a crear 3 funciones `SECURITY DEFINER` en `public`. Vault está disponible
(`service_role` puede leer `vault.decrypted_secrets` y ejecutar `vault.create_secret`), pero
el costo de superficie decidió la elección.
