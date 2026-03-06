'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SystemState } from '@/lib/status';

export default function ClientGatekeeper({ initialStatus }: { initialStatus: SystemState }) {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        // En ISR puro, no queremos redirects de middleware que confundan a Next.js 
        // o generen loops. El layout y los pages manejarán el contenido.
        // Solo protegemos la administración con middleware real en el servidor.
    }, [pathname, initialStatus, router]);

    return null; // This component renders nothing
}
