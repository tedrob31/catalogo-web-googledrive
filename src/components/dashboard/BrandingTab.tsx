'use client';

import { FaShareAlt, FaImages, FaGlobe, FaKey, FaLock, FaCheckCircle, FaExternalLinkAlt } from 'react-icons/fa';

function isApexDomain(domain: string): boolean {
  const clean = domain.trim().toLowerCase();
  const parts = clean.split('.');
  if (parts.length <= 2) return true;
  if (
    parts.length === 3 &&
    (clean.endsWith('.com.pe') ||
      clean.endsWith('.org.pe') ||
      clean.endsWith('.co.uk') ||
      clean.endsWith('.com.mx') ||
      clean.endsWith('.com.ar'))
  ) {
    return true;
  }
  return false;
}

function extractSubdomainHost(domain: string): string {
  const clean = domain.trim().toLowerCase();
  const parts = clean.split('.');
  if (parts.length > 2) {
    if (
      parts.length === 3 &&
      (clean.endsWith('.com.pe') ||
        clean.endsWith('.org.pe') ||
        clean.endsWith('.co.uk') ||
        clean.endsWith('.com.mx'))
    ) {
      return '@';
    }
    return parts[0];
  }
  return '@';
}

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

        {/* Sección de Dominio Personalizado */}
        {configForm.custom_domain_enabled ? (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-purple-500/10 border border-amber-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FaGlobe className="text-amber-400 text-sm" />
                <h3 className="text-sm font-bold text-white">Dominio Web Personalizado (VIP)</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 w-fit">
                HABILITADO POR SUPERADMIN
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Puedes conectar tu propio dominio (ej: <span className="font-mono text-amber-300 font-semibold">tiendajuan.com</span>) o un subdominio de tu marca (ej: <span className="font-mono text-amber-300 font-semibold">remate.tiendajuan.com</span> o <span className="font-mono text-amber-300 font-semibold">catalogo.tiendajuan.com</span>).
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                Escribe tu dominio o subdominio:
              </label>
              <input
                type="text"
                placeholder="ej: remate.tiendajuan.com o tiendajuan.com"
                value={configForm.custom_domain || ''}
                onChange={(e) =>
                  setConfigForm((prev: any) => ({
                    ...prev,
                    custom_domain: e.target.value.toLowerCase().trim(),
                  }))
                }
                className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                No incluyas <code>https://</code> ni barras al final. Recuerda hacer clic en &quot;Guardar Cambios&quot; abajo para aplicar.
              </span>
            </div>

            {/* Asistente interactivo de configuración DNS */}
            {configForm.custom_domain && configForm.custom_domain.trim() !== '' && (
              <div className="p-4 bg-slate-950/80 border border-white/10 rounded-xl space-y-3">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <FaKey className="text-[11px]" />
                  <span>Configuración requerida en tu proveedor de DNS (GoDaddy, Cloudflare, etc.):</span>
                </div>

                {isApexDomain(configForm.custom_domain) ? (
                  // Caso Dominio Principal
                  <div className="space-y-2 text-xs">
                    <p className="text-[11px] text-slate-300">
                      Detectamos que ingresaste un <strong>dominio principal</strong> (<span className="font-mono text-white">{configForm.custom_domain}</span>). Elige una de estas opciones en tu DNS:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-[11px] border border-white/10 rounded-lg overflow-hidden">
                        <thead className="bg-white/5 text-slate-400 border-b border-white/10">
                          <tr>
                            <th className="p-2">Tipo de Registro</th>
                            <th className="p-2">Nombre / Host</th>
                            <th className="p-2">Valor / Destino</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-200">
                          <tr>
                            <td className="p-2 text-amber-400 font-bold">CNAME (Flattening) / ALIAS</td>
                            <td className="p-2">@ (o en blanco)</td>
                            <td className="p-2 font-bold text-white">{baseDomain}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  // Caso Subdominio
                  <div className="space-y-2 text-xs">
                    <p className="text-[11px] text-slate-300">
                      Detectamos que ingresaste un <strong>subdominio</strong> (<span className="font-mono text-white">{configForm.custom_domain}</span>). Agrega este registro CNAME:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-[11px] border border-white/10 rounded-lg overflow-hidden">
                        <thead className="bg-white/5 text-slate-400 border-b border-white/10">
                          <tr>
                            <th className="p-2">Tipo de Registro</th>
                            <th className="p-2">Nombre / Host</th>
                            <th className="p-2">Valor / Destino</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-200">
                          <tr>
                            <td className="p-2 text-amber-400 font-bold">CNAME</td>
                            <td className="p-2 font-bold text-white">
                              {extractSubdomainHost(configForm.custom_domain)}
                            </td>
                            <td className="p-2 font-bold text-white">{baseDomain}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-slate-400 flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Las imágenes de tu catálogo se continuarán sirviendo de forma ultrarrápida desde nuestro CDN.</span>
                  </div>
                  <a
                    href={`https://${configForm.custom_domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition"
                  >
                    <span>Abrir https://{configForm.custom_domain}</span>
                    <FaExternalLinkAlt className="text-[9px]" />
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
            <FaLock className="text-slate-500 text-sm mt-0.5 shrink-0" />
            <div className="text-xs text-slate-400">
              <span className="font-bold text-slate-300 block mb-0.5">¿Deseas usar tu propio dominio web (ej. tiendajuan.com o catalogo.tiendajuan.com)?</span>
              Esta característica exclusiva está disponible para tiendas VIP. Solicita su activación a nuestro equipo de soporte para configurar tu dirección web propia.
            </div>
          </div>
        )}

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
