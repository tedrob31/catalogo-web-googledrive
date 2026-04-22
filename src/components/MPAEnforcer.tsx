'use client';

import { useEffect } from 'react';

/**
 * Destruye la funcionalidad Single Page Application (SPA) del enrutador interno de Next.js.
 * Cuando el usuario presiona la flecha "Atrás" o "Adelante", Next.js intenta interceptarla 
 * para renderizar componentes RSC cacheados sin recargar el navegador.
 * Este componente fuerza a Chrome a recargar la página inmediatamente desde Cloudflare,
 * garantizando el comportamiento de una web tradicional MPA (Multi-Page Application).
 */
export default function MPAEnforcer() {
    useEffect(() => {
        const onPopState = () => {
            // Fuerza una recarga dura de HTML ignorando la memoria caché de JS de Next.js
            window.location.reload();
        };

        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    return null;
}
