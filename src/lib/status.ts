import fs from 'fs/promises';
import path from 'path';
import { getDriveService } from './drive';

const CACHE_DIR = path.join(process.cwd(), 'cache');
const STATUS_FILE = path.join(CACHE_DIR, 'status.json');
const CREDENTIALS_FILE = path.join(CACHE_DIR, 'credentials.json');

export type SystemState = 'SETUP' | 'MAINTENANCE' | 'ACTIVE';

interface SystemStatus {
    state: SystemState;
    lastError?: string;
    lastChecked?: string;
}

const DEFAULT_STATUS: SystemStatus = {
    state: 'SETUP',
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
        return { state: 'SETUP', lastError: 'Missing credentials file' };
    }

    // 2. Read stored status override (e.g. if manually set to maintenance)
    try {
        const data = await fs.readFile(STATUS_FILE, 'utf-8');
        const status = JSON.parse(data) as SystemStatus;

        // If stored status says MAINTENANCE, respect it unless we want to auto-recover immediately
        // For now, return stored status if it exists and is valid
        return status;
    } catch {
        // If no status file, but credentials exist, assume ACTIVE (or verify)
        // Ideally we verify connection, but that's expensive to do on every request.
        // We rely on the "interceptor" to update this file to MAINTENANCE if it fails.
        return { state: 'ACTIVE' };
    }
}

export async function setSystemStatus(state: SystemState, error?: string) {
    await ensureDir();
    const status: SystemStatus = {
        state,
        lastError: error,
        lastChecked: new Date().toISOString()
    };
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
