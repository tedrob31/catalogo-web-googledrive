'use client';

import { FaCheck } from 'react-icons/fa';
import { THEME_PRESETS, findMatchingPresetId } from '@/lib/theme-presets';

interface DesignTabProps {
  configForm: any;
  setConfigForm: (updater: any) => void;
  savingConfig: boolean;
  onSaveConfig: (e?: React.FormEvent) => void;
  onOpenMediaSelector?: (field: '__BACKGROUND__') => void;
  hasChanges?: boolean;
}

/** Interruptor con estado escrito: nunca sólo color. */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[12px] text-shell-muted tabular-nums">{checked ? 'Sí' : 'No'}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
          checked ? 'bg-shell-accent' : 'bg-shell-raised border border-shell-line-strong'
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

/** Fila etiqueta / control, la unidad de densidad de este panel. */
function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 border-b border-shell-line py-3 last:border-b-0 md:grid-cols-[200px_1fr] md:items-center md:gap-4">
      <div className="text-[13px] text-shell-ink-soft">
        {label}
        {hint && <small className="mt-0.5 block text-[11.5px] text-shell-muted">{hint}</small>}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[13.5px]">{children}</div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mb-7">
      <h2
        id={id}
        className="mb-1 border-b border-shell-line pb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-shell-muted"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

const selectCls =
  'w-full max-w-xs cursor-pointer rounded-md border border-shell-line-strong bg-shell-raised px-3 py-1.5 text-[13px] text-shell-ink focus:outline-none focus:ring-2 focus:ring-shell-accent/60';

export default function DesignTab({
  configForm,
  setConfigForm,
  savingConfig,
  onSaveConfig,
  onOpenMediaSelector,
  hasChanges = false,
}: DesignTabProps) {
  const currentPresetId = findMatchingPresetId({
    primaryColor: configForm.primary_color,
    secondaryColor: configForm.secondary_color,
    textColor: configForm.text_color,
    cardBorderColor: configForm.card_border_color,
  });
  const currentPreset = THEME_PRESETS.find((p) => p.id === currentPresetId);

  const set = (patch: Record<string, unknown>) =>
    setConfigForm((prev: any) => ({ ...prev, ...patch }));

  return (
    <form onSubmit={onSaveConfig}>
      <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-shell-ink">Diseño</h1>
      <p className="mb-6 mt-1 max-w-[66ch] text-[13px] text-shell-muted">
        Elegí un tema y, si querés, ajustá los colores uno por uno. Todo esto lo ve el visitante en
        tu catálogo público.
      </p>

      {/* ---------- 1. Grilla ---------- */}
      <Section id="h-grilla" title="Grilla">
        <Row label="Columnas en escritorio" hint="Cuántas fotos por fila en pantallas grandes">
          <select
            value={configForm.grid_columns}
            onChange={(e) => set({ grid_columns: Number(e.target.value) })}
            className={selectCls}
          >
            <option value={2}>2 · editorial grande</option>
            <option value={3}>3</option>
            <option value={4}>4 · estándar</option>
            <option value={5}>5 · recomendado</option>
            <option value={6}>6 · compacto</option>
          </select>
        </Row>

        <Row label="Columnas en celular" hint="Cuántas fotos por fila en el teléfono">
          <select
            value={configForm.mobile_grid_columns}
            onChange={(e) => set({ mobile_grid_columns: Number(e.target.value) })}
            className={selectCls}
          >
            <option value={1}>1 · foto completa</option>
            <option value={2}>2 · tipo Instagram</option>
            <option value={3}>3 · galería compacta</option>
          </select>
        </Row>

        <Row label="Títulos de álbum" hint="Si los ocultás, la portada queda como banner limpio">
          <Switch
            checked={Boolean(configForm.hide_album_titles)}
            onChange={() => set({ hide_album_titles: !configForm.hide_album_titles })}
            label="Ocultar títulos de álbumes"
          />
        </Row>
      </Section>

      {/* ---------- 2. Tema ---------- */}
      <Section id="h-tema" title="Tema">
        <div className="flex flex-wrap items-baseline gap-2 py-3">
          <span className="text-[13px] text-shell-ink-soft">Empezá por un tema</span>
          <span className="text-[11.5px] text-shell-muted">
            aplica fondo, acento, texto y bordes de una sola vez
          </span>
          <span className="ml-auto text-[11.5px]">
            {currentPreset ? (
              <span className="font-semibold text-shell-accent">Tema: {currentPreset.name}</span>
            ) : (
              <span className="text-shell-muted">Personalizado · ningún tema coincide</span>
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pb-4 sm:grid-cols-4">
          {THEME_PRESETS.map((preset) => {
            const isSelected = currentPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.description}
                aria-pressed={isSelected}
                onClick={() =>
                  set({
                    primary_color: preset.primaryColor,
                    secondary_color: preset.secondaryColor,
                    text_color: preset.textColor,
                    card_border_color: preset.cardBorderColor,
                    card_border_width: preset.cardBorderWidth,
                  })
                }
                className={`rounded-md border p-2 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-shell-accent bg-shell-raised'
                    : 'border-shell-line hover:border-shell-line-strong hover:bg-shell-raised'
                }`}
              >
                <div className="mb-1.5 flex h-4 w-full overflow-hidden rounded-sm border border-shell-line-strong">
                  <span className="flex-1" style={{ backgroundColor: preset.secondaryColor }} />
                  <span className="w-3" style={{ backgroundColor: preset.primaryColor }} />
                  <span className="w-3" style={{ backgroundColor: preset.textColor }} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="truncate text-[12.5px] font-semibold text-shell-ink">
                    {preset.name}
                  </span>
                  {isSelected && <FaCheck className="shrink-0 text-[9px] text-shell-accent" />}
                </div>
                <span className="block truncate text-[11px] text-shell-muted">{preset.category}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-baseline gap-2 border-t border-shell-line pt-3">
          <span className="text-[13px] text-shell-ink-soft">Ajuste fino</span>
          <span className="text-[11.5px] text-shell-muted">
            opcional · cada cambio acá te saca del tema elegido
          </span>
        </div>

        {[
          { key: 'primary_color', label: 'Color primario', hint: 'Botones y encabezados' },
          { key: 'secondary_color', label: 'Color secundario', hint: 'Fondo y superficies' },
          { key: 'text_color', label: 'Color de texto', hint: 'Títulos y descripciones' },
        ].map((field) => (
          <Row key={field.key} label={field.label} hint={field.hint}>
            <input
              type="color"
              aria-label={field.label}
              value={configForm[field.key]}
              onChange={(e) => set({ [field.key]: e.target.value })}
              className="h-8 w-8 cursor-pointer rounded-md border border-shell-line-strong bg-shell-raised p-0.5"
            />
            <span className="tabular-nums text-shell-ink-soft">{configForm[field.key]}</span>
          </Row>
        ))}
      </Section>

      {/* ---------- 3. Tarjetas ---------- */}
      <Section id="h-tarjetas" title="Tarjetas del catálogo">
        <Row label="Grosor del borde" hint="0 quita el borde por completo">
          <input
            type="number"
            min={0}
            max={8}
            aria-label="Grosor de borde en píxeles"
            value={configForm.card_border_width}
            onChange={(e) => set({ card_border_width: Number(e.target.value) })}
            className={`${selectCls} max-w-[6rem] tabular-nums`}
          />
          <span className="text-[12px] text-shell-muted">px</span>
        </Row>
        <Row label="Color del borde">
          <input
            type="color"
            aria-label="Color del borde de tarjetas"
            value={configForm.card_border_color}
            onChange={(e) => set({ card_border_color: e.target.value })}
            className="h-8 w-8 cursor-pointer rounded-md border border-shell-line-strong bg-shell-raised p-0.5"
          />
          <span className="tabular-nums text-shell-ink-soft">{configForm.card_border_color}</span>
        </Row>
      </Section>

      {/* ---------- 4. Fondo ---------- */}
      <Section id="h-fondo" title="Foto de fondo">
        <Row label="Wallpaper" hint="Queda fija mientras el visitante scrollea">
          {configForm.background_image ? (
            <>
              <span className="h-10 w-16 shrink-0 overflow-hidden rounded-md border border-shell-line-strong bg-shell-raised">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={configForm.background_image}
                  alt="Vista previa del fondo"
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="truncate text-[12px] text-shell-muted">
                {configForm.background_image.split('/').pop()?.split('?')[0] || 'Foto seleccionada'}
              </span>
              {onOpenMediaSelector && (
                <button
                  type="button"
                  onClick={() => onOpenMediaSelector('__BACKGROUND__')}
                  className="cursor-pointer rounded-md border border-shell-line-strong bg-shell-raised px-2.5 py-1 text-[12.5px] font-semibold text-shell-ink hover:border-shell-line-strong"
                >
                  Cambiar
                </button>
              )}
              <button
                type="button"
                onClick={() => set({ background_image: '' })}
                className="cursor-pointer rounded-md px-2 py-1 text-[12.5px] text-shell-muted hover:text-shell-danger"
              >
                Quitar
              </button>
            </>
          ) : (
            <>
              <span className="text-[13px] text-shell-ink-soft">Sin foto · usa color liso</span>
              <button
                type="button"
                onClick={() => onOpenMediaSelector?.( '__BACKGROUND__')}
                className="cursor-pointer rounded-md border border-shell-line-strong bg-shell-raised px-2.5 py-1 text-[12.5px] font-semibold text-shell-ink"
              >
                Elegir fondo
              </button>
            </>
          )}
        </Row>

        <p className="py-3 text-[11.5px] leading-relaxed text-shell-muted">
          Medidas: <strong className="text-shell-ink-soft">1920×1080</strong> para escritorio,{' '}
          <strong className="text-shell-ink-soft">1080×1920</strong> si tu catálogo es vertical.
          JPG o WebP por debajo de <strong className="text-shell-ink-soft">300 kB</strong> para que
          cargue al instante.
        </p>
      </Section>

      {/* ---------- 5. Visor ---------- */}
      <Section id="h-visor" title="Visor de fotos">
        <Row label="Descarga de fotos" hint="Botón de descarga en alta resolución, servido desde R2">
          <Switch
            checked={Boolean(configForm.allow_photo_download)}
            onChange={() => set({ allow_photo_download: !configForm.allow_photo_download })}
            label="Permitir descarga de fotos"
          />
        </Row>
      </Section>

      <div className="flex items-center gap-2 border-t border-shell-line pt-4">
        <button
          type="submit"
          disabled={!hasChanges || savingConfig}
          className={`rounded-md px-3.5 py-2 text-[12.5px] font-semibold transition ${
            hasChanges && !savingConfig
              ? 'cursor-pointer border border-shell-accent bg-shell-accent text-shell-accent-ink'
              : 'cursor-not-allowed border border-shell-line bg-shell-raised text-shell-muted opacity-60'
          }`}
        >
          {savingConfig ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <span className="ml-auto text-[11.5px] text-shell-muted">
          {hasChanges ? 'Tenés cambios sin guardar' : 'Sin cambios por guardar'}
        </span>
      </div>
    </form>
  );
}
