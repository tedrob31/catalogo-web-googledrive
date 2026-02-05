import { NextResponse } from 'next/server';
import { saveCredentials, setSystemStatus, checkHealth } from '@/lib/status';
import { getConfig, saveConfig } from '@/lib/config';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { credentials, rootFolderId, adminPass } = body;

        // Security check
        if (adminPass !== process.env.ADMIN_PASS) {
            return NextResponse.json({ error: 'Invalid Administrator Password' }, { status: 401 });
        }

        if (!credentials) {
            return NextResponse.json({ error: 'No credentials provided' }, { status: 400 });
        }

        // 1. Save Credentials Atomic-ish
        // backend validation is done inside saveCredentials
        await saveCredentials(credentials);

        // 2. Save Config if provided
        if (rootFolderId) {
            const config = await getConfig();
            config.rootFolderId = rootFolderId;
            await saveConfig(config);
        }

        // 3. Test Connection (Health Check)
        // This implicitly tries to read the new credentials file and connect
        const isHealthy = await checkHealth();

        if (isHealthy) {
            return NextResponse.json({ success: true, message: 'Configuration saved and connection verified!' });
        } else {
            // If failed, we should probably revert state or warn user.
            // checkHealth already sets state to MAINTENANCE/SETUP if it failed.
            // We return error details.
            return NextResponse.json({
                error: 'Credentials saved, but connection test failed. Check permissions (Client Email) on the Folder.',
                details: 'Auth error or Folder not found.'
            }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Setup Error:', error);
        return NextResponse.json({ error: error.message || 'Setup failed' }, { status: 500 });
    }
}
