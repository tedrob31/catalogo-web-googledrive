'use client';

import { AppConfig } from '@/lib/config';
import { useEffect, useState } from 'react';

interface Props {
    config: AppConfig;
}

interface Particle {
    id: number;
    x: number;
    y: number;
    emoji: string;
}

export default function ClickEffects({ config }: Props) {
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        if (!config.clickEffect || config.clickEffect === 'none') return;

        const handleClick = (e: MouseEvent) => {
            const count = 5;
            const newParticles: Particle[] = [];
            const emoji = config.clickEffect === 'hearts' ? '❤️' : '✨';

            for (let i = 0; i < count; i++) {
                newParticles.push({
                    id: Date.now() + i,
                    x: e.clientX,
                    y: e.clientY,
                    emoji
                });
            }

            setParticles(prev => [...prev, ...newParticles]);

            // Cleanup after animation
            setTimeout(() => {
                setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
            }, 1000);
        };

        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [config.clickEffect]);

    if (!config.clickEffect || config.clickEffect === 'none') return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            {particles.map((p, i) => (
                <div
                    key={p.id}
                    className="absolute text-xl animate-particle"
                    style={{
                        left: p.x,
                        top: p.y,
                        '--x-offset': `${(Math.random() - 0.5) * 100}px`,
                        '--y-offset': `${(Math.random() - 0.5) * 100}px`,
                    } as any}
                >
                    {p.emoji}
                </div>
            ))}
            <style jsx>{`
                @keyframes particle-fade {
                    0% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(0.5);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(calc(-50% + var(--x-offset)), calc(-50% + var(--y-offset))) scale(1.5);
                    }
                }
                .animate-particle {
                    animation: particle-fade 0.8s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
