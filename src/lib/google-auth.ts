import { google } from 'googleapis';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptToken, decryptToken, isEncrypted } from '@/lib/token-crypto';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid',
];

export function getOAuth2Client(redirectUri?: string) {
  const env = process.env;
  const clientId = env['GOOGLE_CLIENT_ID'];
  const clientSecret = env['GOOGLE_CLIENT_SECRET'];
  const baseRedirect = redirectUri || env['GOOGLE_REDIRECT_URI'] || `${env['NEXT_PUBLIC_APP_URL'] || 'https://c4talogo.com'}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no están configurados en el entorno.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, baseRedirect);
}

export function generateGoogleAuthUrl(state: string, redirectUri?: string) {
  const oauth2Client = getOAuth2Client(redirectUri);

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
}

export async function getDriveClientForTenant(tenantId: string) {
  const supabase = createAdminClient();

  const { data: integration, error } = await supabase
    .from('google_integrations')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error || !integration || !integration.refresh_token) {
    throw new Error(`El inquilino no tiene una cuenta de Google Drive vinculada o falta el refresh_token.`);
  }

  // Los tokens viven cifrados en la base (AES-256-GCM); se descifran solo en memoria. Un valor
  // sin el prefijo de version es legado en texto plano y `decryptToken` lo devuelve tal cual.
  //
  // El refresh_token es imprescindible: si no se puede descifrar, no hay forma de sincronizar y
  // el error debe ser visible. El access_token es desechable: Google lo renueva a partir del
  // refresh, asi que si su cifrado esta dañado se descarta en vez de tumbar el sync.
  const refreshToken = decryptToken(integration.refresh_token);
  let accessToken: string | undefined;
  if (integration.access_token) {
    try {
      accessToken = decryptToken(integration.access_token);
    } catch (accessErr) {
      console.warn(
        `[Google Auth] El access_token del tenant ${tenantId} no se pudo descifrar; se descarta y se renueva con el refresh_token.`,
        accessErr
      );
    }
  }

  // Migracion oportunista: si la fila todavia tiene un token heredado en texto plano, se cifra
  // ahora. Sin esto la fila se cifraria recien cuando Google rote el token, y para un inquilino
  // inactivo eso puede no pasar nunca. Cualquier sincronizacion la migra.
  if (!isEncrypted(integration.refresh_token)) {
    try {
      const migracion: { refresh_token: string; updated_at: string; access_token?: string } = {
        refresh_token: encryptToken(refreshToken),
        updated_at: new Date().toISOString(),
      };
      if (accessToken) migracion.access_token = encryptToken(accessToken);
      await supabase.from('google_integrations').update(migracion).eq('tenant_id', tenantId);
    } catch (migracionErr) {
      // No bloquea el sync: se reintenta en la proxima.
      console.warn(`[Google Auth] No se pudo cifrar la fila heredada del tenant ${tenantId}:`, migracionErr);
    }
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    access_token: accessToken,
  });

  // Listener para actualizar access_token si Google lo renueva automáticamente.
  // Se re-cifra al escribir, asi que cada tenant migra a cifrado la proxima vez que sincroniza.
  // Va envuelto en try/catch: es asincrono y no debe tumbar el proceso si el guardado falla.
  oauth2Client.on('tokens', async (tokens) => {
    if (!tokens.access_token && !tokens.refresh_token) return;

    try {
      const nextAccess = tokens.access_token || accessToken;
      const nextRefresh = tokens.refresh_token || refreshToken;
      const encryptedAccess = nextAccess ? encryptToken(nextAccess) : undefined;
      const encryptedRefresh = nextRefresh ? encryptToken(nextRefresh) : undefined;

      await supabase
        .from('google_integrations')
        .update({
          ...(encryptedAccess ? { access_token: encryptedAccess } : {}),
          ...(encryptedRefresh ? { refresh_token: encryptedRefresh } : {}),
          token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);
    } catch (persistErr) {
      console.error(
        `[Google Auth] No se pudieron persistir los tokens renovados del tenant ${tenantId}:`,
        persistErr
      );
    }
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function searchDriveFolders(tenantId: string, query?: string) {
  const drive = await getDriveClientForTenant(tenantId);

  let q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  if (query && query.trim()) {
    // Escapar barras invertidas primero y luego comillas simples para evitar romper el literal de Drive
    const sanitized = query.trim().replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    q += ` and name contains '${sanitized}'`;
  }

  const response = await drive.files.list({
    q,
    fields: 'files(id, name, parents, modifiedTime)',
    pageSize: 30,
    orderBy: 'folder,name',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return response.data.files || [];
}
