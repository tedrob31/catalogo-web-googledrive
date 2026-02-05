'use client';

import Snowfall from 'react-snowfall';
import { AppConfig } from '@/lib/config';
import { useEffect, useState } from 'react';

// Pre-define heart for performance if selected
const heartImage = typeof window !== 'undefined' ? new Image() : null;
if (heartImage) {
    heartImage.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
}

interface Props {
    config: AppConfig;
}

export default function SeasonalEffects({ config }: Props) {
    const [customImage, setCustomImage] = useState<HTMLImageElement | null>(null);
    const [isVisible, setIsVisible] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (config.seasonalEffect === 'custom' && config.seasonalCustomIcon) {
            const img = new Image();
            img.src = config.seasonalCustomIcon;
            img.onload = () => setCustomImage(img);
        }
    }, [config.seasonalEffect, config.seasonalCustomIcon]);

    // Duration Timer Logic
    useEffect(() => {
        setIsVisible(true); // Reset on config change or mount
        if (config.seasonalDuration && config.seasonalDuration > 0) {
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, config.seasonalDuration * 1000);
            return () => clearTimeout(timer);
        }
    }, [config.seasonalDuration, config.seasonalEffect]);


    if (!mounted || !config.seasonalEffect || config.seasonalEffect === 'none') return null;

    const fadeClass = `transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`;

    if (config.seasonalEffect === 'snow') {
        return (
            <div className={`fixed inset-0 pointer-events-none z-50 ${fadeClass}`}>
                <Snowfall
                    snowflakeCount={100}
                    style={{ position: 'fixed', width: '100vw', height: '100vh' }}
                />
            </div>
        );
    }

    if (config.seasonalEffect === 'hearts' && heartImage) {
        return (
            <div className={`fixed inset-0 pointer-events-none z-50 ${fadeClass}`}>
                <Snowfall
                    snowflakeCount={50}
                    images={[heartImage]}
                    radius={[10, 20]}
                    speed={[0.5, 2.0]}
                    wind={[-0.5, 0.5]}
                    style={{ position: 'fixed', width: '100vw', height: '100vh' }}
                />
            </div>
        );
    }

    if (config.seasonalEffect === 'custom' && customImage) {
        return (
            <div className={`fixed inset-0 pointer-events-none z-50 ${fadeClass}`}>
                <Snowfall
                    snowflakeCount={50}
                    images={[customImage]}
                    radius={[10, 25]}
                    style={{ position: 'fixed', width: '100vw', height: '100vh' }}
                />
            </div>
        );
    }

    return null;
}
