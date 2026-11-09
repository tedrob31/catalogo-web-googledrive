'use client';

import { FaCrown, FaExternalLinkAlt, FaSignOutAlt, FaKey } from 'react-icons/fa';

interface DashboardHeaderProps {
  tenant: any;
  plan: any;
  baseDomain: string;
  onSignOut: () => void;
  onOpenSecurityModal: () => void;
}

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
    <header className="border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          {/* Logo Badge Minimalista */}
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-amber-400 text-xs shadow-inner tracking-wider">
            C4
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-zinc-100 tracking-tight">{tenant?.name || 'Mi Tienda'}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-300">
                <FaCrown className="text-[10px] text-amber-400" />
                <span>{plan?.name || 'Gratuito'}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <a
                href={storefrontUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-400 font-mono transition-colors group"
                title={
                  isCustomDomainActive
                    ? `Dominio Personalizado: ${tenant.custom_domain}`
                    : `Subdominio: ${tenant?.subdomain}.${baseDomain}`
                }
              >
                <span>{displayUrl}</span>
                <FaExternalLinkAlt className="text-[9px] text-zinc-600 group-hover:text-amber-400 transition-colors" />
              </a>
              {isCustomDomainActive && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                  DOMINIO PROPIO
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={onOpenSecurityModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors shadow-sm font-medium cursor-pointer active:scale-95"
            title="Asignar o cambiar contraseña de acceso"
          >
            <FaKey className="text-amber-400 text-[10px]" />
            <span className="hidden sm:inline">Contraseña</span>
          </button>

          <button
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
          >
            <FaSignOutAlt className="text-xs" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
}
