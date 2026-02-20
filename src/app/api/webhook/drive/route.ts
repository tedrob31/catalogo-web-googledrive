import { NextResponse } from 'next/server';

// In-memory queue state for debouncing Google Drive webhooks
// We use global to persist across hot reloads in dev mode
const globalAny: any = global;

if (!globalAny.driveWebhookState) {
    globalAny.driveWebhookState = {
        timer: null,
        isSyncing: false,
        queuedSync: false
    };
}

const state = globalAny.driveWebhookState;
const DEBOUNCE_DELAY_MS = 10000; // 10 seconds

async function triggerSync() {
    state.isSyncing = true;
    console.log('[Webhook] Queue resolved. Triggering internal Sync...');

    try {
        // We call our own API Route locally to reuse the exact same logic
        const protocol = process.env.NODE_ENV === 'production' ? 'http' : 'http';
        const host = process.env.HOSTNAME || 'localhost';
        const port = process.env.PORT || 3000;

        const baseUrl = `${protocol}://${host}:${port}`;

        await fetch(`${baseUrl}/api/sync`, {
            method: 'POST',
            // Fire and forget strategy from this endpoint's perspective, 
            // but the fetch awaits the internal completion
        });
        console.log('[Webhook] Internal Sync finished successfully.');
    } catch (error) {
        console.error('[Webhook] Internal Sync failed:', error);
    } finally {
        state.isSyncing = false;

        // If while we were syncing, more pings came in, they set queuedSync = true.
        // We need to run one final pass.
        if (state.queuedSync) {
            console.log('[Webhook] More changes detected during last sync. Triggering one final pass...');
            state.queuedSync = false;
            triggerSync(); // Recursive call for the final pass
        }
    }
}

export async function POST(request: Request) {
    // Note: Google Drive sends a POST request when a change occurs.
    // In a real production environment, you should verify the 'X-Goog-Channel-Token' 
    // or 'X-Goog-Resource-State' headers to authenticate the ping.

    console.log('[Webhook] Ping received from Google Drive.');

    if (state.isSyncing) {
        console.log('[Webhook] Sync is currently running. Queuing an additional pass for later.');
        state.queuedSync = true;
        return NextResponse.json({ message: 'Sync queued' }, { status: 202 });
    }

    // Clear existing timer if any
    if (state.timer) {
        clearTimeout(state.timer);
        console.log('[Webhook] Timer reset.');
    }

    // Start a new 10-second timer
    console.log(`[Webhook] Starting ${DEBOUNCE_DELAY_MS / 1000}s debounce timer...`);
    state.timer = setTimeout(() => {
        state.timer = null;
        triggerSync();
    }, DEBOUNCE_DELAY_MS);

    // Respond immediately to Google Drive so it doesn't timeout
    return NextResponse.json({ message: 'Ping acknowledged. Sync scheduled.' }, { status: 202 });
}
