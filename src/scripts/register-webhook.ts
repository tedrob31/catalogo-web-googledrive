import { google } from 'googleapis';
import { getDriveService } from '../lib/drive';
import { getConfig } from '../lib/config';
import { randomUUID } from 'crypto';

/**
 * Script for subscribing to Google Drive Push Notifications (Webhooks).
 * Run: npx ts-node src/scripts/register-webhook.ts
 */
async function registerWebhook() {
    try {
        console.log('🔄 Loading configuration...');
        const config = await getConfig();
        const rootFolderId = config.rootFolderId;

        if (!rootFolderId) {
            throw new Error('❌ rootFolderId is not defined in config.json');
        }

        // The domain MUST be verified in Google Cloud Console
        const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN_NAME || 'r4tlabs.com';
        const WEBHOOK_URL = `https://${DOMAIN}/api/webhook/drive`;

        console.log(`📡 Target Webhook URL: ${WEBHOOK_URL}`);
        console.log(`📁 Target Folder ID: ${rootFolderId}`);

        const drive = await getDriveService();

        // Generate a unique ID for this channel
        const channelId = randomUUID();

        console.log('\n🚀 Registering Push Notification Channel...');

        const response = await drive.files.watch({
            fileId: rootFolderId,
            requestBody: {
                id: channelId,
                type: 'web_hook',
                address: WEBHOOK_URL,
                // Optional: You can pass a token to verify the request on your server
                token: 'my-super-secret-catalog-token',
                // Optional: Expiration time in milliseconds (Google limits this, usually max 1 week to 1 month depending on API, 
                // but for folders it's often 1 week. If omitted, Google sets a default max expiration).
            }
        });

        console.log('\n✅ Successfully Subscribed!');
        console.log('--------------------------------------------------');
        console.log('📝 SAVED THESE DETAILS (You will need them to stop the channel later):');
        console.log(`Channel ID: ${response.data.id}`);
        console.log(`Resource ID: ${response.data.resourceId}`);
        console.log(`Expiration: ${new Date(Number(response.data.expiration)).toLocaleString()}`);
        console.log('--------------------------------------------------');

        console.log('\n⚠️ IMPORTANT:');
        console.log('Google Drive folder watches are NOT recursive by default for deep file content changes.');
        console.log('However, if a new file is added, moved, or deleted *anywhere* inside this folder or its subfolders,');
        console.log('it modifies the parent folder structure, which often triggers the watch.');

    } catch (error: any) {
        console.error('\n❌ Failed to register webhook:');
        if (error.response?.data) {
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

registerWebhook();
