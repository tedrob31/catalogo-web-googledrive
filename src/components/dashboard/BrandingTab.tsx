'use client';

import { FaShareAlt, FaImages } from 'react-icons/fa';

interface BrandingTabProps {
  configForm: any;
  setConfigForm: (updater: any) => void;
  baseDomain: string;
  savingConfig: boolean;
  onSaveConfig: (e?: React.FormEvent) => void;
  onOpenMediaSelector: (targetField: '__LOGO__' | '__FAVICON__' | '__OG__') => void;
}

export default function BrandingTab({
  configForm,
  setConfigForm,
  baseDomain,
  savingConfig,
  onSaveConfig,
  onOpenMediaSelector,
}: BrandingTabProps) {
  return (
    <form onSubmit={onSaveConfig} className="space-y-6">
      <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FaShareAlt className="text-amber-400" />
          <span>Identidad y Dirección Web (Subdominio)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nombre Comercial de la Tienda:
            </label>
            <input
              type="text"
              required
              value={configForm.name}
              onChange={(e) =>
                setConfigForm((prev: any) => ({ ...prev, name: e.target.value }))
              }
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Subdominio propio:
            </label>
            <div className="flex items-center">
              <input
                type="text"
                required
                value={configForm.subdomain}
                onChange={(e) =>
                  setConfigForm((prev: any) => ({
                    ...prev,
                    subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                  }))
                }
                className="w-full bg-slate-800 border border-white/10 rounded-l-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
              <span className="bg-slate-800 border border-l-0 border-white/10 px-3 py-2 text-xs text-slate-400 font-mono rounded-r-xl">
                .{baseDomain}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Título de la Pestaña (Site Title):
            </label>
            <input
              type="text"
              value={configForm.title}
              onChange={(e) =>
                setConfigForm((prev: any) => ({ ...prev, title: e.target.value }))
              }
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              WhatsApp para Pedidos:
            </label>
            <input
              type="text"
              placeholder="Ej: +51 987654321"
              value={configForm.whatsapp}
              onChange={(e) =>
                setConfigForm((prev: any) => ({ ...prev, whatsapp: e.target.value }))
              }
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Descripción / Subtítulo (SEO & Google):
          </label>
          <textarea
            rows={2}
            value={configForm.subtitle}
            onChange={(e) =>
              setConfigForm((prev: any) => ({ ...prev, subtitle: e.target.value }))
            }
            placeholder="Catálogo de ropa, calzado y accesorios de alta calidad..."
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <h2 className="text-base font-bold text-white pt-4 border-t border-white/10">
          Logotipo, Favicon e Imagen de Redes Sociales
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">URL del Logo:</label>
              <button
                type="button"
                onClick={() => onOpenMediaSelector('__LOGO__')}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <FaImages className="text-[10px]" />
                <span>Elegir de fotos</span>
              </button>
            </div>
            <input
              type="url"
              placeholder="https://..."
              value={configForm.logo_url}
              onChange={(e) =>
                setConfigForm((prev: any) => ({ ...prev, logo_url: e.target.value }))
              }
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">URL del Favicon:</label>
              <button
                type="button"
                onClick={() => onOpenMediaSelector('__FAVICON__')}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <FaImages className="text-[10px]" />
                <span>Elegir icono</span>
              </button>
            </div>
            <input
              type="url"
              placeholder="https://... o /favicon.ico"
              value={configForm.favicon_url}
              onChange={(e) =>
                setConfigForm((prev: any) => ({ ...prev, favicon_url: e.target.value }))
              }
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-300">
              Portada para Redes Sociales (OpenGraph / WhatsApp / Facebook):
            </label>
            <button
              type="button"
              onClick={() => onOpenMediaSelector('__OG__')}
              className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <FaImages className="text-[10px]" />
              <span>Elegir portada</span>
            </button>
          </div>
          <input
            type="url"
            placeholder="https://..."
            value={configForm.og_image}
            onChange={(e) =>
              setConfigForm((prev: any) => ({ ...prev, og_image: e.target.value }))
            }
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-white">Forzar Imagen Global en Todo el Sitio</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Si está activo, al compartir enlaces de álbumes se mostrará siempre tu portada global en lugar de la foto individual del álbum.
            </div>
          </div>
          <input
            type="checkbox"
            checked={configForm.force_global_og_image}
            onChange={(e) =>
              setConfigForm((prev: any) => ({
                ...prev,
                force_global_og_image: e.target.checked,
              }))
            }
            className="w-5 h-5 rounded bg-slate-800 border-white/10 text-amber-500 focus:ring-amber-500 cursor-pointer"
          />
        </div>

        <button
          type="submit"
          disabled={savingConfig}
          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer shadow"
        >
          {savingConfig ? 'Guardando...' : 'Guardar Marca y SEO en Supabase'}
        </button>
      </div>
    </form>
  );
}
