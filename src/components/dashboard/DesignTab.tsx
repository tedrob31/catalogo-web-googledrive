'use client';

import { FaPalette, FaImages, FaCamera, FaTrash, FaPlus, FaDownload } from 'react-icons/fa';

interface DesignTabProps {
  configForm: any;
  setConfigForm: (updater: any) => void;
  savingConfig: boolean;
  onSaveConfig: (e?: React.FormEvent) => void;
  onOpenMediaSelector?: (field: '__BACKGROUND__') => void;
  hasChanges?: boolean;
}

export default function DesignTab({
  configForm,
  setConfigForm,
  savingConfig,
  onSaveConfig,
  onOpenMediaSelector,
  hasChanges = false,
}: DesignTabProps) {
  return (
    <form onSubmit={onSaveConfig} className="space-y-6">
      <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FaPalette className="text-amber-400" />
          <span>Estructura de Grilla y Columnas</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Columnas en Pantallas de Escritorio (Desktop):
            </label>
            <select
              value={configForm.grid_columns}
              onChange={(e) =>
                setConfigForm((prev: any) => ({ ...prev, grid_columns: Number(e.target.value) }))
              }
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value={2}>2 Columnas (Editorial grande)</option>
              <option value={3}>3 Columnas</option>
              <option value={4}>4 Columnas (Estándar)</option>
              <option value={5}>5 Columnas (Recomendado)</option>
              <option value={6}>6 Columnas (Compacto)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Columnas en Teléfonos Móviles:
            </label>
            <select
              value={configForm.mobile_grid_columns}
              onChange={(e) =>
                setConfigForm((prev: any) => ({ ...prev, mobile_grid_columns: Number(e.target.value) }))
              }
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value={1}>1 Columna (Foto completa)</option>
              <option value={2}>2 Columnas (Estándar tipo Instagram)</option>
              <option value={3}>3 Columnas (Galería compacta)</option>
            </select>
          </div>
        </div>

        <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-white">Ocultar Títulos de Álbumes</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Muestra las portadas como banners limpios de catálogo sin texto visible debajo de la foto.
            </div>
          </div>
          <input
            type="checkbox"
            checked={configForm.hide_album_titles}
            onChange={(e) =>
              setConfigForm((prev: any) => ({ ...prev, hide_album_titles: e.target.checked }))
            }
            className="w-5 h-5 rounded bg-slate-800 border-white/10 text-amber-500 focus:ring-amber-500 cursor-pointer"
          />
        </div>

        <h2 className="text-base font-bold text-white pt-4 border-t border-white/10">
          Paleta de Colores y Tarjetas
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Color Primario (Encabezados/Botones):
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={configForm.primary_color}
                onChange={(e) =>
                  setConfigForm((prev: any) => ({ ...prev, primary_color: e.target.value }))
                }
                className="w-10 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
              />
              <span className="text-xs font-mono text-slate-300">{configForm.primary_color}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Color Secundario (Fondo/Superficies):
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={configForm.secondary_color}
                onChange={(e) =>
                  setConfigForm((prev: any) => ({ ...prev, secondary_color: e.target.value }))
                }
                className="w-10 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
              />
              <span className="text-xs font-mono text-slate-300">{configForm.secondary_color}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Color de Textos:</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={configForm.text_color}
                onChange={(e) =>
                  setConfigForm((prev: any) => ({ ...prev, text_color: e.target.value }))
                }
                className="w-10 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
              />
              <span className="text-xs font-mono text-slate-300">{configForm.text_color}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Grosor de Borde de Tarjetas (px):
            </label>
            <input
              type="number"
              min={0}
              max={8}
              value={configForm.card_border_width}
              onChange={(e) =>
                setConfigForm((prev: any) => ({ ...prev, card_border_width: Number(e.target.value) }))
              }
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Color del Borde de Tarjetas:
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={configForm.card_border_color}
                onChange={(e) =>
                  setConfigForm((prev: any) => ({ ...prev, card_border_color: e.target.value }))
                }
                className="w-10 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
              />
              <span className="text-xs font-mono text-slate-300">{configForm.card_border_color}</span>
            </div>
          </div>
        </div>

        {/* Foto de Fondo Fija (Wallpaper) */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Foto de Fondo Fija del Catálogo (Wallpaper)</span>
              <span className="text-[11px] text-slate-400">
                Se mantendrá fija de fondo mientras los visitantes se desplazan por tu tienda.
              </span>
            </div>
          </div>

          {configForm.background_image ? (
            <div className="p-3 bg-slate-950/70 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                <div className="relative w-28 h-20 rounded-xl overflow-hidden border border-white/15 bg-slate-900 shrink-0 shadow-inner">
                  <img
                    src={configForm.background_image}
                    alt="Vista previa fondo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate">Foto de fondo activa</span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {configForm.background_image.split('/').pop()?.split('?')[0] || 'Foto seleccionada'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {onOpenMediaSelector && (
                  <button
                    type="button"
                    onClick={() => onOpenMediaSelector('__BACKGROUND__')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <FaCamera className="text-[10px] text-amber-400" />
                    <span>Cambiar</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfigForm((prev: any) => ({ ...prev, background_image: '' }))}
                  className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
                  title="Quitar foto de fondo"
                >
                  <FaTrash className="text-xs" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => onOpenMediaSelector && onOpenMediaSelector('__BACKGROUND__')}
              className="p-4 bg-slate-950/40 hover:bg-slate-900/60 border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-amber-400 group-hover:bg-amber-400/10 transition">
                  <FaImages className="text-base" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-300 group-hover:text-white block transition">
                    Sin foto de fondo (usa color liso)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Haz clic para elegir una imagen de tu carpeta de portadas.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-white transition flex items-center gap-1 pointer-events-none"
              >
                <FaPlus className="text-[10px]" />
                <span>Elegir fondo</span>
              </button>
            </div>
          )}

          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[11px] text-slate-300 space-y-1">
            <span className="font-bold text-amber-300 block">📐 Recomendaciones de medida para la foto de fondo:</span>
            <ul className="list-disc list-inside text-slate-400 space-y-0.5">
              <li><strong>1920x1080 px</strong> para pantallas de escritorio (horizontal).</li>
              <li><strong>1080x1920 px</strong> si tu catálogo es enfocado en celulares (vertical).</li>
              <li>Formato recomendado: <strong>JPG o WebP</strong> con compresión web (&lt; 300 kB) para carga instantánea.</li>
            </ul>
          </div>
        </div>

        {/* Permiso de Descarga de Fotos */}
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <FaDownload className="text-sm" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Habilitar Descarga de Fotos para Clientes</div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Muestra un botón de descarga en el visor de fotos en alta resolución. La descarga se procesa directamente desde Cloudflare R2 sin consumo de cuota ni costo por transferencia.
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={Boolean(configForm.allow_photo_download)}
            onChange={(e) =>
              setConfigForm((prev: any) => ({ ...prev, allow_photo_download: e.target.checked }))
            }
            className="w-5 h-5 rounded bg-slate-800 border-white/10 text-amber-500 focus:ring-amber-500 cursor-pointer shrink-0 ml-4"
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
          {savingConfig ? 'Guardando diseño...' : hasChanges ? 'Guardar Diseño en Supabase' : 'Sin cambios por guardar'}
        </button>
      </div>
    </form>
  );
}
