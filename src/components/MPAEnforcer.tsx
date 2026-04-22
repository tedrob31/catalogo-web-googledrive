'use client';

import { useEffect } from 'react';

/**
 * Destruye la funcionalidad Single Page Application (SPA) del enrutador interno de Next.js.
 * Usamos el evento 'popstate' en la fase de CAPTURA (true), lo que garantiza que 
 * ejecutamos nuestro código ANTES de que Next.js pueda interceptar el botón Atrás.
 */
export default function MPAEnforcer() {
    useEffect(() => {
        const onPopState = () => {
            // Forzar recarga absoluta hacia el URL actual que Chrome acaba de restaurar en la barra
            window.location.href = window.location.pathname + window.location.search;
        };

        // El 'true' al final actua en la fase de captura (Event Capturing)
        // Next.js usa Event Bubbling (false), por ende, nosotros llegamos primero y lo destruimos.
        window.addEventListener('popstate', onPopState, true);

        return () => {
            window.removeEventListener('popstate', onPopState, true);
        };
    }, []);

    return null;
}
