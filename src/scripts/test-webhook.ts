/**
 * Script for testing the Google Drive Webhook endpoint.
 * Run: npx ts-node src/scripts/test-webhook.ts
 */
async function testWebhook() {
    // You can change this to your production domain once it's deployed
    const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN_NAME || 'localhost:3000';
    const protocol = DOMAIN.includes('localhost') ? 'http' : 'https';

    // Webhook endpoint
    const WEBHOOK_URL = `${protocol}://${DOMAIN}/api/webhook/drive`;

    console.log(`🚀 Simulating Google Drive Ping to: ${WEBHOOK_URL} ...`);

    try {
        // Google Drive sends an empty POST request (sometimes with headers, but the body is not required for our current logic)
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                // Mock headers that Google Drive typically sends
                'X-Goog-Channel-ID': 'test-channel-id-123',
                'X-Goog-Resource-ID': 'test-resource-id-456',
                'X-Goog-Resource-State': 'update',
                'User-Agent': 'APIs-Google; (+https://developers.google.com/webmasters/APIs-Google.html)'
            }
        });

        const status = response.status;
        const text = await response.text();

        console.log(`\n📥 Response Status: ${status}`);
        if (status === 202) {
            console.log('✅ Webhook is WORKING correctly! The debouncer has queued the sync.');
            console.log('⏳ Check your server logs (Portainer) to see the countdown and the actual sync process start in 10 seconds.');
        } else {
            console.log(`❌ Webhook returned unexpected status: ${text}`);
        }

    } catch (error: any) {
        console.error(`\n❌ Failed to connect to ${WEBHOOK_URL}`);
        console.error('Make sure the server is running and the domain is correct.');
        console.error('Error details:', error.message);
    }
}

testWebhook();
