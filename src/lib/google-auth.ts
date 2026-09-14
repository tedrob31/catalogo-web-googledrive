import { google } from 'googleapis';
import { createAdminClient } from '@/lib/supabase/admin';

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

export function getOAuth2Client(redirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseRedirect = redirectUri || process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no están configurados en el entorno.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, baseRedirect);
}

export function generateGoogleAuthUrl(tenantId: string, redirectUri?: string) {
  const oauth2Client = getOAuth2Client(redirectUri);

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: tenantId, // Vincula la autorización directamente al tenant
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

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: integration.refresh_token,
    access_token: integration.access_token || undefined,
  });

  // Listener para actualizar access_token si Google lo renueva automáticamente
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token || tokens.refresh_token) {
      await supabase
        .from('google_integrations')
        .update({
          access_token: tokens.access_token || integration.access_token,
          refresh_token: tokens.refresh_token || integration.refresh_token,
          token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);
    }
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function searchDriveFolders(tenantId: string, query?: string) {
  const drive = await getDriveClientForTenant(tenantId);

  let q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  if (query && query.trim()) {
    // Escapar comillas simples
    const sanitized = query.trim().replace(/'/g, "\\'");
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
