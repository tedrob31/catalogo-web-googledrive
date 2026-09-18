'use client';

import { FaCrown, FaExternalLinkAlt, FaSignOutAlt } from 'react-icons/fa';

interface DashboardHeaderProps {
  tenant: any;
  plan: any;
  baseDomain: string;
  onSignOut: () => void;
}

export default function DashboardHeader({
  tenant,
  plan,
  baseDomain,
  onSignOut,
}: DashboardHeaderProps) {
  const storefrontUrl = tenant ? `https://${tenant.subdomain}.${baseDomain}` : '#';

  return (
    <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center font-black text-white text-sm shadow-md">
            C4
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">{tenant?.name || 'Mi Tienda'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium flex items-center gap-1">
                <FaCrown className="text-[10px]" />
                {plan?.name || 'Gratuito'}
              </span>
            </div>
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-400/90 hover:text-amber-300 flex items-center gap-1 font-mono transition"
            >
              <span>{tenant?.subdomain}.{baseDomain}</span>
              <FaExternalLinkAlt className="text-[9px]" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition cursor-pointer"
          >
            <FaSignOutAlt />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
}
