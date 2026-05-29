import { google } from 'googleapis';
import path from 'path';
import { setSystemStatus } from './status';
import { createClient } from '@supabase/supabase-js';
import { getConfig } from './config';

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

export async function getDriveService() {
    const config = await getConfig();
    
    // 1. Validar que tengamos las credenciales de Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Las variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configuradas.');
    }

    if (!clientId || !clientSecret) {
        throw new Error('Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en tu .env');
    }

    if (!config.adminEmail) {
        throw new Error('No se ha configurado el "adminEmail" en el panel. No podemos buscar el token en Supabase.');
    }

    // 2. Conectar a Supabase como Administrador (Service Role Bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Buscar el refresh_token del administrador en la tabla user_google_tokens
    const { data, error } = await supabase
        .from('user_google_tokens')
        .select('refresh_token')
        .eq('email', config.adminEmail)
        .single();

    if (error || !data || !data.refresh_token) {
        throw new Error(`No se encontró un token de Google para el correo ${config.adminEmail} en Supabase. Por favor autoriza tu cuenta en /modaadmin`);
    }

    // 4. Construir el cliente OAuth2 usando el Refresh Token recuperado
    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret
    );

    oauth2Client.setCredentials({
        refresh_token: data.refresh_token
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
}

async function handleDriveError(error: any) {
    if (error.code === 401 || error.code === 403 ||
        (error.message && (error.message.includes('invalid_grant') || error.message.includes('unauthorized')))) {
        console.error('[Health Check] Auth Error detected. Switching to MAINTENANCE mode.');
        await setSystemStatus('MAINTENANCE', error.message);
    }
    throw error;
}

export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    webViewLink?: string;
    webContentLink?: string;
    thumbnailLink?: string;
    modifiedTime?: string;
    md5Checksum?: string;
    parents?: string[];
    imageMediaMetadata?: {
        width?: number;
        height?: number;
        time?: string;
    };
}

export async function listFolderContents(folderId: string): Promise<DriveFile[]> {
    const drive = await getDriveService();
    let files: DriveFile[] = [];
    let pageToken: string | undefined = undefined;

    try {
        do {
            const res: any = await drive.files.list({
                q: `'${folderId}' in parents and trashed = false`,
                fields: 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, thumbnailLink, parents, modifiedTime, md5Checksum, imageMediaMetadata)',
                pageSize: 1000,
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                pageToken: pageToken,
            });

            if (res.data.files) {
                files = files.concat(res.data.files as DriveFile[]);
            }
            pageToken = res.data.nextPageToken || undefined;
        } while (pageToken);

        return files;
    } catch (error) {
        await handleDriveError(error);
        return []; // Unreachable due to throw, but keeps TS happy
    }
}

export async function uploadFile(folderId: string, file: File) {
    const drive = await getDriveService();

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    const res: any = await drive.files.create({
        requestBody: {
            name: file.name,
            parents: [folderId],
        },
        media: {
            mimeType: file.type,
            body: bufferStream,
        },
        fields: 'id, name, thumbnailLink, webContentLink',
    });

    return res.data;
}

export async function getFile(fileId: string) {
    const drive = await getDriveService();
    return drive.files.get({
        fileId,
        fields: 'id, name, mimeType, webViewLink, webContentLink, thumbnailLink, parents, modifiedTime, md5Checksum, imageMediaMetadata'
    });
}
