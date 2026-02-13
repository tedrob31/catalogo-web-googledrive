import fs from 'fs/promises';
import path from 'path';
import { getDriveService } from './drive';

const CACHE_DIR = path.join(process.cwd(), 'cache');
const STATUS_FILE = path.join(CACHE_DIR, 'status.json');
const CREDENTIALS_FILE = path.join(CACHE_DIR, 'credentials.json');

export type SystemState = 'SETUP' | 'MAINTENANCE' | 'ACTIVE';
export type SyncState = 'IDLE' | 'SYNCING' | 'BUILDING' | 'DEPLOYING' | 'SUCCESS' | 'ERROR';

interface SystemStatus {
    state: SystemState;
    lastError?: string;
    lastChecked?: string;
    // Sync Tracking
    syncState?: SyncState;
    syncLog?: string[];
    lastSyncTime?: string;
}

const DEFAULT_STATUS: SystemStatus = {
    state: 'SETUP',
    syncState: 'IDLE',
    syncLog: []
};

// Ensure cache directory exists
async function ensureDir() {
    try {
        await fs.access(CACHE_DIR);
    } catch {
        await fs.mkdir(CACHE_DIR, { recursive: true });
    }
}

export async function getSystemStatus(): Promise<SystemStatus> {
    await ensureDir();

    // 1. Check if credentials exist
    try {
        await fs.access(CREDENTIALS_FILE);
    } catch {
        return { ...DEFAULT_STATUS, state: 'SETUP', lastError: 'Missing credentials file' };
    }

    // 2. Read stored status override
    try {
        const data = await fs.readFile(STATUS_FILE, 'utf-8');
        const status = JSON.parse(data) as SystemStatus;
        return status;
    } catch {
        // If file missing, return default ACTIVE (assuming setup passed previously if creds exist)
        return { ...DEFAULT_STATUS, state: 'ACTIVE' };
    }
}

export async function setSystemStatus(state: SystemState, error?: string) {
    const current = await getSystemStatus();
    const status: SystemStatus = {
        ...current,
        state,
        lastError: error,
        lastChecked: new Date().toISOString()
    };
    await fs.writeFile(STATUS_FILE, JSON.stringify(status, null, 2), 'utf-8');
}

export async function updateSyncStatus(syncState: SyncState, logMessage?: string) {
    const current = await getSystemStatus();

    let newLogs = current.syncLog || [];
    if (logMessage) {
        newLogs = [...newLogs, `[${new Date().toLocaleTimeString()}] ${logMessage}`];
    }

    // Trim logs if too long
    if (newLogs.length > 50) newLogs.splice(0, newLogs.length - 50);

    const status: SystemStatus = {
        ...current,
        syncState,
        syncLog: newLogs,
        lastSyncTime: syncState === 'SUCCESS' ? new Date().toISOString() : current.lastSyncTime
    };

    if (syncState === 'IDLE' && !logMessage) {
        // Clear logs on reset
        status.syncLog = [];
    }

    await fs.writeFile(STATUS_FILE, JSON.stringify(status, null, 2), 'utf-8');
}

export async function saveCredentials(jsonContent: string) {
    await ensureDir();
    // Validate JSON
    try {
        const parsed = JSON.parse(jsonContent);
        if (!parsed.client_email || !parsed.private_key) {
            throw new Error('Invalid Service Account JSON');
        }
    } catch (e) {
        throw new Error('Invalid JSON format');
    }

    // Atomic write (simulated via standard write for now, robust enough for this context)
    await fs.writeFile(CREDENTIALS_FILE, jsonContent, 'utf-8');
}

// Health Check Function (Active Probe)
export async function checkHealth(): Promise<boolean> {
    try {
        const drive = await getDriveService();
        // Light operation to verify auth
        await drive.files.list({ pageSize: 1 });

        // If successful, ensure we are ACTIVE
        await setSystemStatus('ACTIVE');
        return true;
    } catch (error: any) {
        console.error('Health Check Failed:', error.message);

        const isAuthError = error.code === 401 || error.code === 403 ||
            (error.message && (error.message.includes('invalid_grant') || error.message.includes('unauthorized')));

        if (isAuthError) {
            await setSystemStatus('MAINTENANCE', error.message);
        }
        return false;
    }
}
