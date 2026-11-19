'use client';

import type { ReactNode } from 'react';

export type DashboardTab =
  | 'drive'
  | 'design'
  | 'effects'
  | 'branding'
  | 'storefront'
  | 'analytics'
  | 'history';

interface NavEntry {
  key: DashboardTab;
  label: string;
}

const GROUPS: { label: string; items: NavEntry[] }[] = [
  { label: 'Fuente', items: [{ key: 'drive', label: 'Google Drive' }] },
  {
    label: 'Tienda',
    items: [
      { key: 'branding', label: 'Marca' },
      { key: 'design', label: 'Diseño' },
      { key: 'storefront', label: 'Bloques de inicio' },
      { key: 'effects', label: 'Efectos' },
    ],
  },
  {
    label: 'Actividad',
    items: [
      { key: 'analytics', label: 'Analíticas' },
      { key: 'history', label: 'Historial' },
    ],
  },
];

interface Props {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  tenantName: string;
  tenantHost: string;
  /** `null` mientras se cargan los datos del inquilino. */
  driveConnected: boolean | null;
  badge?: ReactNode;
}

/**
 * Navegación persistente del panel del inquilino.
 *
 * Antes las secciones vivían en una barra horizontal dentro del contenido, así que
 * desaparecían al scrollear. Acá quedan fijas: la navegación no compite con el contenido.
 *
 * Sin iconos a propósito: siete iconos distintos es ruido de reconocimiento, y el texto
 * alcanza para estas etiquetas.
 */
export default function DashboardSidebar({
  activeTab,
  onTabChange,
  tenantName,
  tenantHost,
  driveConnected,
  badge,
}: Props) {
  const initials = tenantName.trim().slice(0, 2).toUpperCase() || 'TI';

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-30 h-screen w-[212px] flex-col border-r border-shell-line bg-shell-surface">
      <div className="border-b border-shell-line px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-md border border-shell-line-strong bg-shell-raised text-[11px] font-bold text-shell-accent">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-shell-ink">{tenantName}</div>
            <div className="truncate text-[11px] text-shell-muted">{tenantHost}</div>
          </div>
        </div>
      </div>

      <nav aria-label="Secciones del panel" className="flex-1 overflow-y-auto px-2 py-2">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-shell-muted">
              {group.label}
            </div>
            {group.items.map((item) => {
              const current = item.key === activeTab;
              return (
                <button
                  key={item.key}
                  onClick={() => onTabChange(item.key)}
                  aria-current={current ? 'page' : undefined}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-[7px] text-left text-[13px] transition-colors cursor-pointer ${
                    current
                      ? 'bg-shell-raised font-semibold text-shell-ink'
                      : 'text-shell-ink-soft hover:bg-shell-raised hover:text-shell-ink'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-3.5 w-[2px] rounded-full ${
                      current ? 'bg-shell-accent' : 'bg-transparent'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                  {item.key === 'drive' && driveConnected !== null && (
                    <span
                      className="ml-auto text-[10px] font-semibold tracking-[0.02em]"
                      style={{ color: driveConnected ? 'var(--color-shell-accent)' : 'var(--color-shell-warn)' }}
                    >
                      {driveConnected ? 'conectado' : 'falta'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-shell-line px-4 py-3 text-[11px] text-shell-muted">{badge}</div>
    </aside>
  );
}
