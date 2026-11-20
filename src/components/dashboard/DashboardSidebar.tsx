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
  driveConnected: boolean | null;
  badge?: ReactNode;
  /** En pantallas chicas el rail es un cajón: abierto o cerrado. */
  open: boolean;
  onClose: () => void;
  /** En escritorio se puede plegar a una franja angosta. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/**
 * Navegación del panel del inquilino.
 *
 * Tres comportamientos distintos a propósito:
 * - escritorio, desplegado: rail fijo de 212px;
 * - escritorio, plegado: franja de 52px que deja más ancho al contenido;
 * - pantalla chica: cajón superpuesto con fondo oscurecido, porque antes la navegación
 *   simplemente no existía por debajo de lg.
 */
export default function DashboardSidebar({
  activeTab,
  onTabChange,
  tenantName,
  tenantHost,
  driveConnected,
  badge,
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const initials = tenantName.trim().slice(0, 2).toUpperCase() || 'TI';

  const select = (tab: DashboardTab) => {
    onTabChange(tab);
    onClose();
  };

  const width = collapsed ? 'lg:w-[52px]' : 'lg:w-[212px]';

  return (
    <>
      {/* Velo del cajón, sólo en pantallas chicas */}
      {open && (
        <button
          type="button"
          aria-label="Cerrar navegación"
          onClick={onClose}
          className="fixed inset-0 z-40 cursor-default bg-black/60 lg:hidden"
        />
      )}

      <aside
        aria-label="Secciones del panel"
        className={`fixed left-0 top-0 z-50 flex h-screen w-[248px] flex-col border-r border-shell-line bg-shell-surface transition-transform duration-200 lg:z-30 ${width} ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center gap-2 border-b border-shell-line px-3 py-3.5">
          <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-shell-line-strong bg-shell-raised text-[11px] font-bold text-shell-accent">
            {initials}
          </div>
          <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
            <div className="truncate text-[13px] font-semibold text-shell-ink">{tenantName}</div>
            <div className="truncate text-[11px] text-shell-muted">{tenantHost}</div>
          </div>

          {/* Plegar/desplegar, sólo escritorio */}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Desplegar navegación' : 'Plegar navegación'}
            aria-expanded={!collapsed}
            className="hidden shrink-0 cursor-pointer rounded-md p-1.5 text-shell-muted hover:bg-shell-raised hover:text-shell-ink lg:block"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          {/* Cerrar, sólo cajón móvil */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar navegación"
            className="ml-auto shrink-0 cursor-pointer rounded-md p-1.5 text-shell-muted hover:bg-shell-raised hover:text-shell-ink lg:hidden"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <div
                className={`px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-shell-muted ${
                  collapsed ? 'lg:sr-only' : ''
                }`}
              >
                {group.label}
              </div>
              {group.items.map((item) => {
                const current = item.key === activeTab;
                return (
                  <button
                    key={item.key}
                    onClick={() => select(item.key)}
                    aria-current={current ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-[7px] text-left text-[13px] transition-colors cursor-pointer ${
                      current
                        ? 'bg-shell-raised font-semibold text-shell-ink'
                        : 'text-shell-ink-soft hover:bg-shell-raised hover:text-shell-ink'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-3.5 w-[2px] shrink-0 rounded-full ${
                        current ? 'bg-shell-accent' : 'bg-transparent'
                      }`}
                    />
                    <span className={`truncate ${collapsed ? 'lg:sr-only' : ''}`}>{item.label}</span>
                    {item.key === 'drive' && driveConnected !== null && (
                      <span
                        className={`ml-auto shrink-0 text-[10px] font-semibold tracking-[0.02em] ${
                          collapsed ? 'lg:sr-only' : ''
                        }`}
                        style={{
                          color: driveConnected
                            ? 'var(--color-shell-accent)'
                            : 'var(--color-shell-warn)',
                        }}
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

        <div
          className={`border-t border-shell-line px-3 py-3 text-[11px] text-shell-muted ${
            collapsed ? 'lg:sr-only' : ''
          }`}
        >
          {badge}
        </div>
      </aside>
    </>
  );
}
