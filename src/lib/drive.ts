import { google } from 'googleapis';
import path from 'path';
import { setSystemStatus } from './status';

// Scope for read-only access to Drive
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

export async function getDriveService() {
    // Updated to use the variable that points to our cache volume file
    // In docker-compose we set GOOGLE_APPLICATION_CREDENTIALS=/app/cache/credentials.json
    // But internally we might want to ensure it looks there if env isn't set (fallback)
    const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), 'cache', 'credentials.json');

    if (!keyFilePath) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: SCOPES,
    });

    return google.drive({ version: 'v3', auth });
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
                fields: 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, thumbnailLink, parents, imageMediaMetadata)',
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
        fields: 'id, name, mimeType, webViewLink, webContentLink, thumbnailLink, parents, imageMediaMetadata'
    });
}
