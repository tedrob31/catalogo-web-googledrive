'use client';

import { FaCrown, FaExternalLinkAlt, FaSignOutAlt, FaKey } from 'react-icons/fa';

interface DashboardHeaderProps {
  tenant: any;
  plan: any;
  baseDomain: string;
  onSignOut: () => void;
  onOpenSecurityModal: () => void;
}

/** Shared shape for the two header actions: same size, same focus ring. */
const actionCls =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60';

export default function DashboardHeader({
  tenant,
  plan,
  baseDomain,
  onSignOut,
  onOpenSecurityModal,
}: DashboardHeaderProps) {
  const isCustomDomainActive = Boolean(tenant?.custom_domain && tenant?.custom_domain_enabled);
  const storefrontUrl = isCustomDomainActive
    ? `https://${tenant.custom_domain}`
    : tenant
    ? `https://${tenant.subdomain}.${baseDomain}`
    : '#';
  const displayUrl = isCustomDomainActive
    ? tenant.custom_domain
    : tenant
    ? `${tenant.subdomain}.${baseDomain}`
    : '';

  return (
    <header className="sticky top-0 z-30 border-b border-shell-line bg-shell-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1040px] items-center justify-between gap-3 px-5">
        <div className="flex min-w-0 items-center gap-3">
          {/* Store monogram */}
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-shell-line-strong bg-shell-raised text-[11px] font-bold tracking-wider text-shell-accent">
            C4
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold tracking-tight text-shell-ink">
                {tenant?.name || 'Mi Tienda'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-shell-line bg-shell-raised px-1.5 py-0.5 text-[10.5px] font-medium text-shell-ink-soft">
                <FaCrown className="text-[10px] text-shell-accent" aria-hidden="true" />
                <span>{plan?.name || 'Gratuito'}</span>
              </span>
            </div>

            <div className="mt-0.5 flex items-center gap-2">
              <a
                href={storefrontUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 rounded-md font-mono text-[11.5px] text-shell-muted transition-colors hover:text-shell-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60"
                title={
                  isCustomDomainActive
                    ? `Dominio Personalizado: ${tenant.custom_domain}`
                    : `Subdominio: ${tenant?.subdomain}.${baseDomain}`
                }
              >
                <span>{displayUrl}</span>
                <FaExternalLinkAlt
                  className="text-[9px] text-shell-muted transition-colors group-hover:text-shell-accent"
                  aria-hidden="true"
                />
              </a>
              {isCustomDomainActive && (
                <span className="rounded-md border border-shell-line bg-shell-raised px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.08em] text-shell-accent">
                  DOMINIO PROPIO
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onOpenSecurityModal}
            className={`${actionCls} border-shell-line bg-shell-raised text-shell-ink-soft hover:border-shell-line-strong hover:text-shell-ink active:scale-95`}
            title="Asignar o cambiar contraseña de acceso"
          >
            <FaKey className="text-[10px] text-shell-accent" aria-hidden="true" />
            <span className="hidden sm:inline">Contraseña</span>
          </button>

          <button
            onClick={onSignOut}
            className={`${actionCls} border-transparent text-shell-ink-soft hover:border-shell-danger/40 hover:bg-shell-danger/10 hover:text-shell-danger`}
          >
            <FaSignOutAlt className="text-xs" aria-hidden="true" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
}
