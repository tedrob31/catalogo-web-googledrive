'use client';

import {
  FaShareAlt,
  FaImages,
  FaGlobe,
  FaKey,
  FaLock,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaCamera,
  FaTrash,
  FaPlus,
} from 'react-icons/fa';

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
  hasChanges?: boolean;
}

export default function BrandingTab({
  configForm,
  setConfigForm,
  baseDomain,
  savingConfig,
  onSaveConfig,
  onOpenMediaSelector,
  hasChanges = false,
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

            {/* Opción de Redirección Automática desde el subdominio */}
            {configForm.custom_domain && configForm.custom_domain.trim() !== '' && (
              <label className="flex items-start gap-3 p-3.5 bg-slate-950/70 border border-amber-500/20 rounded-xl cursor-pointer hover:bg-slate-950/90 transition">
                <input
                  type="checkbox"
                  checked={Boolean(configForm.redirect_to_custom_domain)}
                  onChange={(e) =>
                    setConfigForm((prev: any) => ({
                      ...prev,
                      redirect_to_custom_domain: e.target.checked,
                    }))
                  }
                  className="mt-0.5 w-4 h-4 rounded text-amber-500 bg-slate-900 border-white/20 focus:ring-amber-500 cursor-pointer accent-amber-500 shrink-0"
                />
                <div className="text-xs">
                  <span className="font-bold text-white block">
                    Redirigir automáticamente visitantes a mi Dominio Personalizado (Recomendado)
                  </span>
                  <span className="text-[11px] text-slate-400 leading-relaxed block mt-0.5">
                    Si alguien ingresa a <code className="text-amber-300 font-mono">{configForm.subdomain}.{baseDomain}</code>, será enviado automáticamente a <code className="text-amber-300 font-mono">https://{configForm.custom_domain}</code>. Si lo desactivas, ambos dominios funcionarán en paralelo como espejos.
                  </span>
                </div>
              </label>
            )}

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
          {/* 1. Logotipo de la Tienda */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Logotipo de la Tienda</span>
                <span className="text-[11px] text-slate-400">Aparece en la cabecera de tu catálogo web.</span>
              </div>
              {configForm.logo_url && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <FaCheckCircle className="text-[9px]" /> Activo
                </span>
              )}
            </div>

            {configForm.logo_url ? (
              <div className="p-3 bg-slate-950/70 border border-white/10 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/15 bg-slate-900 shrink-0 shadow-inner p-1 flex items-center justify-center">
                    <img
                      src={configForm.logo_url}
                      alt="Vista previa del logo"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">Logotipo configurado</span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {configForm.logo_url.split('/').pop()?.split('?')[0] || 'Foto seleccionada'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenMediaSelector('__LOGO__')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <FaCamera className="text-[10px] text-amber-400" />
                    <span>Cambiar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfigForm((prev: any) => ({ ...prev, logo_url: '' }))}
                    className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
                    title="Quitar logotipo"
                  >
                    <FaTrash className="text-xs" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => onOpenMediaSelector('__LOGO__')}
                className="p-4 bg-slate-950/40 hover:bg-slate-900/60 border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-amber-400 group-hover:bg-amber-400/10 transition">
                    <FaImages className="text-base" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-300 group-hover:text-white block transition">
                      Sin logotipo seleccionado
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Se mostrará el nombre comercial en texto.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-white transition flex items-center gap-1 pointer-events-none"
                >
                  <FaPlus className="text-[10px]" />
                  <span>Elegir</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Favicon del Navegador */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Favicon del Navegador</span>
                <span className="text-[11px] text-slate-400">Icono que aparece en la pestaña del navegador.</span>
              </div>
              {configForm.favicon_url && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <FaCheckCircle className="text-[9px]" /> Activo
                </span>
              )}
            </div>

            {configForm.favicon_url ? (
              <div className="p-3 bg-slate-950/70 border border-white/10 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/15 bg-slate-900 shrink-0 shadow-inner p-1 flex items-center justify-center">
                    <img
                      src={configForm.favicon_url}
                      alt="Vista previa del favicon"
                      className="w-8 h-8 object-contain rounded-md"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">Favicon configurado</span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {configForm.favicon_url.split('/').pop()?.split('?')[0] || 'Icono seleccionado'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenMediaSelector('__FAVICON__')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <FaCamera className="text-[10px] text-amber-400" />
                    <span>Cambiar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfigForm((prev: any) => ({ ...prev, favicon_url: '' }))}
                    className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
                    title="Quitar favicon"
                  >
                    <FaTrash className="text-xs" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => onOpenMediaSelector('__FAVICON__')}
                className="p-4 bg-slate-950/40 hover:bg-slate-900/60 border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-amber-400 group-hover:bg-amber-400/10 transition">
                    <FaImages className="text-base" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-300 group-hover:text-white block transition">
                      Sin favicon personalizado
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Se mostrará el icono por defecto de c4talogo.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-white transition flex items-center gap-1 pointer-events-none"
                >
                  <FaPlus className="text-[10px]" />
                  <span>Elegir</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Portada para Redes Sociales (OG Image) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                Portada para Redes Sociales (OpenGraph / WhatsApp / Facebook)
              </span>
              <span className="text-[11px] text-slate-400">
                Se muestra como vista previa destacada al compartir enlaces de tu tienda en redes o chats.
              </span>
            </div>
            {configForm.og_image && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <FaCheckCircle className="text-[9px]" /> Activa
              </span>
            )}
          </div>

          {configForm.og_image ? (
            <div className="p-3 bg-slate-950/70 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                <div className="relative w-28 h-20 rounded-xl overflow-hidden border border-white/15 bg-slate-900 shrink-0 shadow-inner">
                  <img
                    src={configForm.og_image}
                    alt="Vista previa portada redes"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate">Portada de redes configurada</span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {configForm.og_image.split('/').pop()?.split('?')[0] || 'Foto seleccionada'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => onOpenMediaSelector('__OG__')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition cursor-pointer flex items-center gap-1.5"
                >
                  <FaCamera className="text-[10px] text-amber-400" />
                  <span>Cambiar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfigForm((prev: any) => ({ ...prev, og_image: '' }))}
                  className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
                  title="Quitar portada"
                >
                  <FaTrash className="text-xs" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => onOpenMediaSelector('__OG__')}
              className="p-5 bg-slate-950/40 hover:bg-slate-900/60 border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-amber-400 group-hover:bg-amber-400/10 transition">
                  <FaImages className="text-lg" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-300 group-hover:text-white block transition">
                    Sin portada de redes sociales
                  </span>
                  <span className="text-[11px] text-slate-500">
                    WhatsApp mostrará la primera foto del catálogo o álbum compartido.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-white transition flex items-center gap-1 pointer-events-none"
              >
                <FaPlus className="text-[10px]" />
                <span>Elegir portada</span>
              </button>
            </div>
          )}
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
          disabled={!hasChanges || savingConfig}
          className={`w-full py-3 font-bold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2 ${
            hasChanges && !savingConfig
              ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-rose-500/20 active:scale-[0.99] cursor-pointer'
              : 'bg-slate-800/80 text-slate-500 border border-white/5 cursor-not-allowed opacity-50'
          }`}
        >
          {savingConfig ? (
            'Guardando cambios...'
          ) : hasChanges ? (
            'Guardar Marca y SEO en Supabase'
          ) : (
            'Sin cambios por guardar'
          )}
        </button>
      </div>
    </form>
  );
}
