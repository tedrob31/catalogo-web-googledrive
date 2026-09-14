// Módulo de estado del sistema monousuario deprecado.
// En la arquitectura SaaS Multi-Tenant, el estado se gestiona en Supabase (tabla tenants).

export type SystemState = 'ACTIVE' | 'MAINTENANCE' | 'SETUP';

export interface SystemStatus {
    state: SystemState;
    message?: string;
    details?: string;
    timestamp?: string;
}

export async function getSystemStatus(): Promise<SystemStatus> {
    return { state: 'ACTIVE' };
}

export async function setSystemStatus() {}
export async function saveCredentials() {}
export async function checkHealth() { return true; }
