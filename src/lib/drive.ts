// Módulo Drive monousuario deprecado.
// En la arquitectura SaaS Multi-Tenant, se utiliza src/lib/google-auth.ts (OAuth 2.0 por tenant).

export async function getDriveService(): Promise<any> {
    throw new Error('Módulo deprecado. Usa google-auth.ts para integración multi-tenant.');
}

export async function listFolderContents(): Promise<any[]> {
    return [];
}
