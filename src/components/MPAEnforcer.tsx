'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Destruye la funcionalidad Single Page Application (SPA) del enrutador interno de Next.js.
 * Ya que Next.js bloquea los eventos nativos 'popstate', usamos usePathname para detectar
 * cuando la URL cambia por manipulación de historial (Botón Atrás/Adelante).
 * Al detectar un cambio de URL sin hard-reload, obligamos al navegador a recargar forzosamente.
 */
export default function MPAEnforcer() {
    const pathname = usePathname();
    const mountedPath = useRef(pathname);

    useEffect(() => {
        // Si el pathname de React cambia pero la ruta inicial del componente es distinta,
        // significa que Next.js interceptó un Botón Atrás. Hacemos Reload Inmediato.
        if (pathname !== mountedPath.current) {
            window.location.reload();
        }
    }, [pathname]);

    return null;
}
