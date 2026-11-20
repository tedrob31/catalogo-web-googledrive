'use client';

interface EffectsTabProps {
  configForm: any;
  setConfigForm: (updater: any) => void;
  savingConfig: boolean;
  onSaveConfig: (e?: React.FormEvent) => void;
  hasChanges?: boolean;
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

const controlCls =
  'w-full max-w-xs cursor-pointer rounded-md border border-shell-line-strong bg-shell-raised px-3 py-1.5 text-[13px] text-shell-ink focus:outline-none focus:ring-2 focus:ring-shell-accent/60';

export default function EffectsTab({
  configForm,
  setConfigForm,
  savingConfig,
  onSaveConfig,
  hasChanges = false,
}: EffectsTabProps) {
  const set = (patch: Record<string, unknown>) =>
    setConfigForm((prev: Record<string, unknown>) => ({ ...prev, ...patch }));

  return (
    <form onSubmit={onSaveConfig}>
      <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-shell-ink">Efectos</h1>
      <p className="mb-6 mt-1 max-w-[66ch] text-[13px] text-shell-muted">
        Animaciones decorativas sobre el catálogo público. Son opcionales: si no te suman, dejalas
        desactivadas.
      </p>

      <Section id="h-temporada" title="Animaciones de temporada">
        <Row label="Tipo de caída" hint="Copos o corazones cayendo sobre la tienda">
          <select
            value={configForm.seasonal_effect}
            onChange={(e) => set({ seasonal_effect: e.target.value })}
            className={controlCls}
          >
            <option value="none">Desactivado</option>
            <option value="snow">Nieve · copos invernales</option>
            <option value="hearts">Corazones flotantes</option>
            <option value="custom">Icono propio · por URL</option>
          </select>
        </Row>

        <Row label="Duración" hint="0 la deja cayendo todo el tiempo">
          <input
            type="number"
            min={0}
            aria-label="Duración del efecto en segundos"
            value={configForm.seasonal_duration}
            onChange={(e) => set({ seasonal_duration: Number(e.target.value) })}
            placeholder="0 = sin límite"
            className={`${controlCls} max-w-[7rem] tabular-nums`}
          />
          <span className="text-[12px] text-shell-muted">segundos</span>
        </Row>

        {configForm.seasonal_effect === 'custom' && (
          <Row label="URL del icono" hint="PNG con transparencia o SVG">
            <input
              type="url"
              aria-label="URL del icono personalizado"
              placeholder="https://…"
              value={configForm.seasonal_custom_icon}
              onChange={(e) => set({ seasonal_custom_icon: e.target.value })}
              className={`${controlCls} max-w-md`}
            />
          </Row>
        )}
      </Section>

      <Section id="h-clic" title="Efectos al tocar la pantalla">
        <Row label="Efecto de clic" hint="Microanimación cada vez que un visitante toca la foto">
          <select
            value={configForm.click_effect}
            onChange={(e) => set({ click_effect: e.target.value })}
            className={controlCls}
          >
            <option value="none">Sin efecto</option>
            <option value="stars">Chispas y estrellas</option>
            <option value="hearts">Minicorazones</option>
          </select>
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
