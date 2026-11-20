'use client';

import { FaExternalLinkAlt, FaImages, FaLock, FaTrash } from 'react-icons/fa';

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

/** Switch that always spells its state out: never colour alone. */
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
        className={`flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60 ${
          checked ? 'bg-shell-accent' : 'border border-shell-line-strong bg-shell-raised'
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

/** Label / control row: the density unit of this panel. */
function Row({
  id,
  label,
  hint,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 border-b border-shell-line py-3 last:border-b-0 md:grid-cols-[200px_1fr] md:items-center md:gap-4">
      <div className="text-[13px] text-shell-ink-soft">
        {id ? <label htmlFor={id}>{label}</label> : label}
        {hint && <small className="mt-0.5 block text-[11.5px] text-shell-muted">{hint}</small>}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[13.5px]">{children}</div>
    </div>
  );
}

/** Section heading: uppercase 12px title plus one short sentence of intent. */
function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mb-8">
      <h2
        id={id}
        className="border-b border-shell-line pb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-shell-muted"
      >
        {title}
      </h2>
      {note && (
        <p className="mb-1 mt-2 max-w-[66ch] text-[12.5px] leading-relaxed text-shell-ink-soft">
          {note}
        </p>
      )}
      {children}
    </section>
  );
}

const fieldCls =
  'w-full rounded-md border border-shell-line-strong bg-shell-raised px-2.5 py-1.5 text-[13px] text-shell-ink placeholder:text-shell-muted focus:outline-none focus:ring-2 focus:ring-shell-accent/60';

const btn =
  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-shell-line-strong bg-shell-raised px-2.5 py-1 text-[12.5px] font-semibold text-shell-ink transition-colors hover:bg-shell-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60';

const btnQuiet =
  'inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[12.5px] text-shell-muted transition-colors hover:text-shell-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60';

const pickCls =
  'flex w-full cursor-pointer items-center gap-2 rounded-md border border-dashed border-shell-line-strong bg-shell-surface px-2.5 py-1.5 text-left transition-colors hover:border-shell-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60';

const thumbCls =
  'flex h-9 w-14 shrink-0 items-center justify-center overflow-hidden rounded border border-shell-line-strong bg-shell-bg p-1';

const tagBase =
  'inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold leading-none';
const tagOk = `${tagBase} border-shell-accent/40 bg-shell-accent/10 text-shell-accent`;

const linkCls =
  'inline-flex items-center gap-1 text-[12px] font-semibold text-shell-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60';

export default function BrandingTab({
  configForm,
  setConfigForm,
  baseDomain,
  savingConfig,
  onSaveConfig,
  onOpenMediaSelector,
  hasChanges = false,
}: BrandingTabProps) {
  const set = (patch: Record<string, unknown>) =>
    setConfigForm((prev: Record<string, unknown>) => ({ ...prev, ...patch }));

  const setSocial = (patch: Record<string, string>) =>
    setConfigForm((prev: Record<string, unknown>) => ({
      ...prev,
      social_links: { ...((prev.social_links as Record<string, unknown>) || {}), ...patch },
    }));

  const hasCustomDomain = Boolean(
    configForm.custom_domain && configForm.custom_domain.trim() !== ''
  );
  const customDomainIsApex = hasCustomDomain ? isApexDomain(configForm.custom_domain) : false;

  return (
    <form onSubmit={onSaveConfig}>
      <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-shell-ink">Marca</h1>
      <p className="mb-6 mt-1 max-w-[66ch] text-[13px] text-shell-muted">
        Nombre, dirección, logo y contacto: todo lo que el visitante ve antes de abrir tu catálogo.
      </p>

      {/* ---------- 1. Identidad ---------- */}
      <Section
        id="h-identidad"
        title="Identidad"
        note="El nombre y la dirección con la que el visitante te encuentra."
      >
        <Row
          id="brand-name"
          label="Nombre de la tienda"
          hint="Va en la cabecera del catálogo y en el título de la página"
        >
          <input
            id="brand-name"
            type="text"
            required
            value={configForm.name}
            onChange={(e) => set({ name: e.target.value })}
            className={fieldCls}
          />
        </Row>

        <Row
          id="brand-subdomain"
          label="Subdominio"
          hint="La dirección corta de tu catálogo público"
        >
          <div className="flex w-full items-center">
            <input
              id="brand-subdomain"
              type="text"
              required
              value={configForm.subdomain}
              onChange={(e) =>
                set({ subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })
              }
              className={`${fieldCls} rounded-r-none font-mono`}
            />
            <span className="shrink-0 rounded-r-md border border-l-0 border-shell-line-strong bg-shell-surface px-2.5 py-1.5 font-mono text-[12.5px] text-shell-muted">
              .{baseDomain}
            </span>
          </div>
        </Row>

        <Row
          id="brand-title"
          label="Título de la pestaña"
          hint="Lo que se lee en la pestaña del navegador, no en la página"
        >
          <input
            id="brand-title"
            type="text"
            value={configForm.title}
            onChange={(e) => set({ title: e.target.value })}
            className={fieldCls}
          />
        </Row>

        <Row
          id="brand-subtitle"
          label="Subtítulo"
          hint="Bajada que aparece en Google y al compartir el link"
        >
          <textarea
            id="brand-subtitle"
            rows={2}
            value={configForm.subtitle}
            onChange={(e) => set({ subtitle: e.target.value })}
            placeholder="Catálogo de ropa, calzado y accesorios de alta calidad..."
            className={fieldCls}
          />
        </Row>
      </Section>

      {/* ---------- 2. Contacto ---------- */}
      <Section
        id="h-contacto"
        title="Contacto"
        note="A dónde llega el pedido cuando el visitante toca Pedir."
      >
        <Row
          id="brand-whatsapp"
          label="WhatsApp para pedidos"
          hint="Cada botón de pedido abre un chat a este número"
        >
          <input
            id="brand-whatsapp"
            type="text"
            placeholder="Ej: +51 987654321"
            value={configForm.whatsapp}
            onChange={(e) => set({ whatsapp: e.target.value })}
            className={fieldCls}
          />
        </Row>
      </Section>

      {/* ---------- 3. Logotipo e icono ---------- */}
      <Section
        id="h-logotipo"
        title="Logotipo e icono"
        note="Tu marca en la cabecera del catálogo y en la pestaña del navegador."
      >
        <Row label="Logotipo" hint="Se muestra en la cabecera de tu catálogo web">
          {configForm.logo_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={configForm.logo_url}
                alt="Vista previa del logo"
                className={`${thumbCls} object-contain`}
              />
              <span className="truncate text-[12px] text-shell-muted">
                {configForm.logo_url.split('/').pop()?.split('?')[0] || 'Foto seleccionada'}
              </span>
              <span className={tagOk}>Activo</span>
              <button
                type="button"
                onClick={() => onOpenMediaSelector('__LOGO__')}
                className={btn}
              >
                Cambiar
              </button>
              <button
                type="button"
                onClick={() => set({ logo_url: '' })}
                aria-label="Quitar logotipo"
                title="Quitar logotipo"
                className={btnQuiet}
              >
                <FaTrash aria-hidden className="text-[11px]" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onOpenMediaSelector('__LOGO__')}
              className={pickCls}
            >
              <FaImages aria-hidden className="text-[12px] text-shell-muted" />
              <span className="text-[12.5px] text-shell-ink-soft">
                Sin logotipo · se muestra el nombre en texto
              </span>
              <span className="ml-auto text-[12px] font-semibold text-shell-accent">Elegir</span>
            </button>
          )}
        </Row>

        <Row label="Favicon" hint="El icono de la pestaña del navegador y de los marcadores">
          {configForm.favicon_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={configForm.favicon_url}
                alt="Vista previa del favicon"
                className={`${thumbCls} object-contain`}
              />
              <span className="truncate text-[12px] text-shell-muted">
                {configForm.favicon_url.split('/').pop()?.split('?')[0] || 'Icono seleccionado'}
              </span>
              <span className={tagOk}>Activo</span>
              <button
                type="button"
                onClick={() => onOpenMediaSelector('__FAVICON__')}
                className={btn}
              >
                Cambiar
              </button>
              <button
                type="button"
                onClick={() => set({ favicon_url: '' })}
                aria-label="Quitar favicon"
                title="Quitar favicon"
                className={btnQuiet}
              >
                <FaTrash aria-hidden className="text-[11px]" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onOpenMediaSelector('__FAVICON__')}
              className={pickCls}
            >
              <FaImages aria-hidden className="text-[12px] text-shell-muted" />
              <span className="text-[12.5px] text-shell-ink-soft">
                Sin favicon · se usa el icono de c4talogo
              </span>
              <span className="ml-auto text-[12px] font-semibold text-shell-accent">Elegir</span>
            </button>
          )}
        </Row>
      </Section>

      {/* ---------- 4. Vista previa al compartir ---------- */}
      <Section
        id="h-compartir"
        title="Vista previa al compartir"
        note="La tarjeta que se arma cuando alguien pasa tu link por WhatsApp o redes."
      >
        <Row
          label="Portada para redes"
          hint="La tarjeta que se ve al compartir el link en WhatsApp o redes; conviene 1200×630"
        >
          {configForm.og_image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={configForm.og_image}
                alt="Vista previa portada redes"
                className={`${thumbCls} w-20 object-cover`}
              />
              <span className="truncate text-[12px] text-shell-muted">
                {configForm.og_image.split('/').pop()?.split('?')[0] || 'Foto seleccionada'}
              </span>
              <span className={tagOk}>Activa</span>
              <button type="button" onClick={() => onOpenMediaSelector('__OG__')} className={btn}>
                Cambiar
              </button>
              <button
                type="button"
                onClick={() => set({ og_image: '' })}
                aria-label="Quitar portada"
                title="Quitar portada"
                className={btnQuiet}
              >
                <FaTrash aria-hidden className="text-[11px]" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onOpenMediaSelector('__OG__')}
              className={pickCls}
            >
              <FaImages aria-hidden className="text-[12px] text-shell-muted" />
              <span className="text-[12.5px] text-shell-ink-soft">
                Sin portada · WhatsApp muestra la primera foto del álbum
              </span>
              <span className="ml-auto text-[12px] font-semibold text-shell-accent">Elegir</span>
            </button>
          )}
        </Row>

        <Row
          label="Forzar portada en todos los enlaces"
          hint="Al compartir un álbum se muestra esta portada y no la primera foto del álbum"
        >
          <Switch
            checked={Boolean(configForm.force_global_og_image)}
            onChange={() => set({ force_global_og_image: !configForm.force_global_og_image })}
            label="Forzar la portada global en todo el sitio"
          />
        </Row>
      </Section>

      {/* ---------- 5. Redes sociales ---------- */}
      <Section
        id="h-redes"
        title="Redes sociales"
        note="Se convierten en los iconos del pie de página del catálogo."
      >
        <Row id="brand-instagram" label="Instagram" hint="Usuario o link completo">
          <input
            id="brand-instagram"
            type="text"
            placeholder="Ej: @tutienda o instagram.com/tutienda"
            value={configForm.social_links?.instagram || ''}
            onChange={(e) => setSocial({ instagram: e.target.value })}
            className={fieldCls}
          />
        </Row>

        <Row id="brand-tiktok" label="TikTok" hint="Usuario o link completo">
          <input
            id="brand-tiktok"
            type="text"
            placeholder="Ej: @tutienda o tiktok.com/@tutienda"
            value={configForm.social_links?.tiktok || ''}
            onChange={(e) => setSocial({ tiktok: e.target.value })}
            className={fieldCls}
          />
        </Row>

        <Row id="brand-facebook" label="Facebook" hint="Link de tu página">
          <input
            id="brand-facebook"
            type="text"
            placeholder="Ej: facebook.com/tutienda"
            value={configForm.social_links?.facebook || ''}
            onChange={(e) => setSocial({ facebook: e.target.value })}
            className={fieldCls}
          />
        </Row>
      </Section>

      {/* ---------- 6. Dominio propio ---------- */}
      <Section
        id="h-dominio"
        title="Dominio propio"
        note="La dirección de tu marca en lugar del subdominio de c4talogo."
      >
        {configForm.custom_domain_enabled ? (
          <>
            <Row
              id="brand-custom-domain"
              label="Dominio"
              hint="Sin https:// ni barra al final; se aplica al guardar"
            >
              <input
                id="brand-custom-domain"
                type="text"
                placeholder="ej: remate.tiendajuan.com o tiendajuan.com"
                value={configForm.custom_domain || ''}
                onChange={(e) => set({ custom_domain: e.target.value.toLowerCase().trim() })}
                className={`${fieldCls} font-mono`}
              />
              <span className={tagOk}>VIP</span>
              {hasCustomDomain && (
                <a
                  href={`https://${configForm.custom_domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkCls}
                >
                  Abrir https://{configForm.custom_domain}
                  <FaExternalLinkAlt aria-hidden className="text-[9px]" />
                </a>
              )}
            </Row>

            {hasCustomDomain && (
              <>
                <Row
                  label="Redirigir al dominio propio"
                  hint={`Quien entre a ${configForm.subdomain}.${baseDomain} termina en https://${configForm.custom_domain}. Si lo desactivás, los dos dominios funcionan como espejos.`}
                >
                  <Switch
                    checked={Boolean(configForm.redirect_to_custom_domain)}
                    onChange={() =>
                      set({ redirect_to_custom_domain: !configForm.redirect_to_custom_domain })
                    }
                    label="Redirigir visitantes al dominio propio"
                  />
                </Row>

                <Row
                  label="Registro DNS"
                  hint="Cargá este registro en tu proveedor (GoDaddy, Cloudflare, etc.) para que el dominio apunte a tu catálogo"
                >
                  <p className="w-full text-[12px] text-shell-ink-soft">
                    {customDomainIsApex
                      ? 'Detectamos un dominio principal'
                      : 'Detectamos un subdominio'}{' '}
                    (<code className="font-mono text-shell-ink">{configForm.custom_domain}</code>).
                  </p>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse text-left font-mono text-[11.5px]">
                      <thead>
                        <tr className="border-b border-shell-line text-shell-muted">
                          <th scope="col" className="py-1 pr-3 font-semibold">
                            Tipo de registro
                          </th>
                          <th scope="col" className="py-1 pr-3 font-semibold">
                            Nombre / Host
                          </th>
                          <th scope="col" className="py-1 font-semibold">
                            Valor / Destino
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-1 pr-3 text-shell-accent">
                            {customDomainIsApex ? 'CNAME (Flattening) / ALIAS' : 'CNAME'}
                          </td>
                          <td className="py-1 pr-3 text-shell-ink">
                            {customDomainIsApex
                              ? '@ (o en blanco)'
                              : extractSubdomainHost(configForm.custom_domain)}
                          </td>
                          <td className="py-1 text-shell-ink">{baseDomain}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="flex w-full flex-wrap items-center gap-1.5 text-[11.5px] text-shell-muted">
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-shell-accent" />
                    Las imágenes del catálogo se siguen sirviendo desde el CDN.
                  </p>
                </Row>
              </>
            )}
          </>
        ) : (
          <Row label="Dominio propio" hint="Exclusivo de tiendas VIP">
            <span className="flex items-start gap-2 text-[12.5px] text-shell-muted">
              <FaLock aria-hidden className="mt-0.5 shrink-0 text-[11px]" />
              <span>
                Podés usar tu propio dominio (ej. tiendajuan.com o catalogo.tiendajuan.com). Pedí la
                activación a soporte y lo configuramos con vos.
              </span>
            </span>
          </Row>
        )}
      </Section>

      <div className="flex items-center gap-2 border-t border-shell-line pt-4">
        <button
          type="submit"
          disabled={!hasChanges || savingConfig}
          className={`rounded-md px-3.5 py-2 text-[12.5px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60 ${
            hasChanges && !savingConfig
              ? 'cursor-pointer border border-shell-accent bg-shell-accent text-shell-accent-ink'
              : 'cursor-not-allowed border border-shell-line bg-shell-raised text-shell-muted opacity-60'
          }`}
        >
          {savingConfig
            ? 'Guardando…'
            : hasChanges
              ? 'Guardar marca y SEO'
              : 'Sin cambios por guardar'}
        </button>
        <span className="ml-auto text-[11.5px] text-shell-muted">
          {savingConfig
            ? 'Guardando cambios en tu tienda…'
            : hasChanges
              ? 'Tenés cambios sin guardar'
              : 'Todo guardado'}
        </span>
      </div>
    </form>
  );
}
