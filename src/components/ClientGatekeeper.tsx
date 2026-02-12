'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SystemState } from '@/lib/status';

export default function ClientGatekeeper({ initialStatus }: { initialStatus: SystemState }) {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        // 1. SETUP MODE
        if (initialStatus === 'SETUP') {
            if (pathname !== '/setup' && !pathname.startsWith('/api/setup')) {
                router.push('/setup');
            }
        }

        // 2. MAINTENANCE MODE
        // Allow /admin to bypass maintenance to fix things
        else if (initialStatus === 'MAINTENANCE') {
            if (pathname !== '/maintenance' && !pathname.startsWith('/admin') && !pathname.startsWith('/api') && !pathname.startsWith('/modaadmin')) {
                router.push('/maintenance');
            }
        }

        // 3. ACTIVE MODE
        else if (initialStatus === 'ACTIVE') {
            if (pathname === '/setup' || pathname === '/maintenance') {
                router.push('/');
            }
        }
    }, [pathname, initialStatus, router]);

    return null; // This component renders nothing
}
