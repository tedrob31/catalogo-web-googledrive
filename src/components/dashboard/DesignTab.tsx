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
      <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <FaPalette className="text-amber-400" />
          <span>Estructura de Grilla y Columnas</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Columnas en Pantallas de Escritorio (Desktop):
            </label>
            <select
              value={configForm.grid_columns}
              onChange={(e) =>
                setConfigForm((prev: any) => ({ ...prev, grid_columns: Number(e.target.value) }))
              }
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-all cursor-pointer"
            >
              <option value={2}>2 Columnas (Editorial grande)</option>
              <option value={3}>3 Columnas</option>
              <option value={4}>4 Columnas (Estándar)</option>
              <option value={5}>5 Columnas (Recomendado)</option>
              <option value={6}>6 Columnas (Compacto)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Columnas en Teléfonos Móviles:
            </label>
            <select
              value={configForm.mobile_grid_columns}
              onChange={(e) =>
                setConfigForm((prev: any) => ({ ...prev, mobile_grid_columns: Number(e.target.value) }))
              }
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-all cursor-pointer"
            >
              <option value={1}>1 Columna (Foto completa)</option>
              <option value={2}>2 Columnas (Estándar tipo Instagram)</option>
              <option value={3}>3 Columnas (Galería compacta)</option>
            </select>
          </div>
        </div>

        {/* Toggle Ocultar Títulos */}
        <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/80 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-zinc-200">Ocultar Títulos de Álbumes</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Muestra las portadas como banners limpios de catálogo sin texto visible debajo de la foto.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(configForm.hide_album_titles)}
            onClick={() =>
              setConfigForm((prev: any) => ({ ...prev, hide_album_titles: !prev.hide_album_titles }))
            }
            className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
              configForm.hide_album_titles ? 'bg-amber-500' : 'bg-zinc-800 border border-zinc-700/60'
            }`}
          >
            <div
              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                configForm.hide_album_titles ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <h2 className="text-sm font-semibold text-zinc-100 pt-4 border-t border-zinc-800/80">
          Paleta de Colores y Tarjetas
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Color Primario (Encabezados/Botones):
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={configForm.primary_color}
                onChange={(e) =>
                  setConfigForm((prev: any) => ({ ...prev, primary_color: e.target.value }))
                }
                className="w-10 h-10 rounded-xl border border-zinc-700 bg-zinc-900 cursor-pointer p-0.5"
              />
              <span className="text-xs font-mono text-zinc-300">{configForm.primary_color}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Color Secundario (Fondo/Superficies):
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={configForm.secondary_color}
                onChange={(e) =>
                  setConfigForm((prev: any) => ({ ...prev, secondary_color: e.target.value }))
                }
                className="w-10 h-10 rounded-xl border border-zinc-700 bg-zinc-900 cursor-pointer p-0.5"
              />
              <span className="text-xs font-mono text-zinc-300">{configForm.secondary_color}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Color de Textos:</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={configForm.text_color}
                onChange={(e) =>
                  setConfigForm((prev: any) => ({ ...prev, text_color: e.target.value }))
                }
                className="w-10 h-10 rounded-xl border border-zinc-700 bg-zinc-900 cursor-pointer p-0.5"
              />
              <span className="text-xs font-mono text-zinc-300">{configForm.text_color}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-800/80">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
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
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Color del Borde de Tarjetas:
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={configForm.card_border_color}
                onChange={(e) =>
                  setConfigForm((prev: any) => ({ ...prev, card_border_color: e.target.value }))
                }
                className="w-10 h-10 rounded-xl border border-zinc-700 bg-zinc-900 cursor-pointer p-0.5"
              />
              <span className="text-xs font-mono text-zinc-300">{configForm.card_border_color}</span>
            </div>
          </div>
        </div>

        {/* Foto de Fondo Fija (Wallpaper) */}
        <div className="pt-4 border-t border-zinc-800/80 space-y-3">
          <div>
            <span className="text-xs font-semibold text-zinc-200 block">Foto de Fondo Fija del Catálogo (Wallpaper)</span>
            <span className="text-[11px] text-zinc-500">
              Se mantendrá fija de fondo mientras los visitantes se desplazan por tu tienda.
            </span>
          </div>

          {configForm.background_image ? (
            <div className="p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
                <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-900 shrink-0 shadow-inner">
                  <img
                    src={configForm.background_image}
                    alt="Vista previa fondo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-zinc-200 block truncate">Foto de fondo activa</span>
                  <span className="text-[10px] text-zinc-500 block truncate font-mono">
                    {configForm.background_image.split('/').pop()?.split('?')[0] || 'Foto seleccionada'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {onOpenMediaSelector && (
                  <button
                    type="button"
                    onClick={() => onOpenMediaSelector('__BACKGROUND__')}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <FaCamera className="text-[10px] text-amber-400" />
                    <span>Cambiar</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfigForm((prev: any) => ({ ...prev, background_image: '' }))}
                  className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                  title="Quitar foto de fondo"
                >
                  <FaTrash className="text-xs" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => onOpenMediaSelector && onOpenMediaSelector('__BACKGROUND__')}
              className="p-5 bg-zinc-950/40 hover:bg-zinc-900/60 border border-dashed border-zinc-800 hover:border-zinc-700 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-amber-400 transition">
                  <FaImages className="text-sm" />
                </div>
                <div>
                  <span className="text-xs font-medium text-zinc-300 group-hover:text-white block transition">
                    Sin foto de fondo (usa color liso)
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Haz clic para elegir una imagen de tu carpeta de portadas.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-300 border border-zinc-800 group-hover:border-amber-500/40 group-hover:text-amber-400 transition flex items-center gap-1 pointer-events-none"
              >
                <FaPlus className="text-[10px]" />
                <span>Elegir fondo</span>
              </button>
            </div>
          )}

          <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-[11px] text-zinc-400 space-y-1">
            <span className="font-semibold text-zinc-300 block">📐 Recomendaciones de medida para la foto de fondo:</span>
            <ul className="list-disc list-inside text-zinc-500 space-y-0.5">
              <li><strong>1920x1080 px</strong> para pantallas de escritorio (horizontal).</li>
              <li><strong>1080x1920 px</strong> si tu catálogo es enfocado en celulares (vertical).</li>
              <li>Formato recomendado: <strong>JPG o WebP</strong> liviano (&lt; 300 kB) para carga instantánea.</li>
            </ul>
          </div>
        </div>

        {/* Permiso de Descarga de Fotos */}
        <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/80 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 mt-0.5">
              <FaDownload className="text-xs" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-200">Habilitar Descarga de Fotos para Clientes</div>
              <div className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                Muestra un botón de descarga en el visor de fotos en alta resolución. La descarga se procesa directamente desde Cloudflare R2 sin costo de transferencia.
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(configForm.allow_photo_download)}
            onClick={() =>
              setConfigForm((prev: any) => ({ ...prev, allow_photo_download: !prev.allow_photo_download }))
            }
            className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ml-4 ${
              configForm.allow_photo_download ? 'bg-amber-500' : 'bg-zinc-800 border border-zinc-700/60'
            }`}
          >
            <div
              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                configForm.allow_photo_download ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Botón Guardar */}
        <button
          type="submit"
          disabled={!hasChanges || savingConfig}
          className={`w-full py-3 font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 ${
            hasChanges && !savingConfig
              ? 'bg-zinc-100 hover:bg-white text-zinc-950 active:scale-[0.99] cursor-pointer shadow-md'
              : 'bg-zinc-900/60 text-zinc-600 border border-zinc-800/60 cursor-not-allowed opacity-50'
          }`}
        >
          {savingConfig ? 'Guardando diseño...' : hasChanges ? 'Guardar Cambios de Diseño' : 'Sin cambios por guardar'}
        </button>
      </div>
    </form>
  );
}
