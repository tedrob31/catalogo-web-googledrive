'use client';

import { useEffect } from 'react';

/**
 * Destruye la funcionalidad Single Page Application (SPA) del enrutador interno de Next.js.
 * Usamos el evento 'popstate' en la fase de CAPTURA (true), lo que garantiza que 
 * ejecutamos nuestro código ANTES de que Next.js pueda interceptar el botón Atrás.
 */
export default function MPAEnforcer() {
    useEffect(() => {
        // Defensa 1: Destruir el BFCache si Chrome decide usarlo
        const onPageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                window.location.reload();
            }
        };

        // Defensa 2: Destruir el Soft Router si Next.js lo engaña
        const onPopState = () => {
            window.location.reload();
        };

        window.addEventListener('pageshow', onPageShow);
        window.addEventListener('popstate', onPopState, true);

        return () => {
            window.removeEventListener('pageshow', onPageShow);
            window.removeEventListener('popstate', onPopState, true);
        };
    }, []);

    return null;
}
