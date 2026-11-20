import { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import DashboardStatusStrip from '@/components/dashboard/DashboardStatusStrip';
import HistoryTab from '@/components/dashboard/HistoryTab';
import EffectsTab from '@/components/dashboard/EffectsTab';
import DesignTab from '@/components/dashboard/DesignTab';
import { THEME_PRESETS } from '@/lib/theme-presets';

afterEach(cleanup);

const baseStrip = {
  syncing: false,
  onSyncNow: () => {},
  onOpenNav: () => {},
  theme: 'dark' as const,
  onToggleTheme: () => {},
};

describe('DashboardStatusStrip', () => {
  it('muestra la cuota del plan, no sólo el conteo', () => {
    // Este es el caso que se rompio de verdad: al reemplazar las tarjetas de metricas se perdio
    // el "N de M" y quedaba solo el numero suelto.
    render(
      <DashboardStatusStrip {...baseStrip} driveConnected photosCount={412} photosLimit={2000} />
    );
    expect(screen.getByText('412')).toBeTruthy();
    expect(screen.getByText('/ 2000')).toBeTruthy();
  });

  it('omite la cuota cuando el plan no la informa', () => {
    render(<DashboardStatusStrip {...baseStrip} driveConnected photosCount={412} />);
    expect(screen.getByText('412')).toBeTruthy();
    expect(screen.queryByText(/^\/ /)).toBeNull();
  });

  it('deshabilita sincronizar cuando Drive no está conectado', () => {
    render(<DashboardStatusStrip {...baseStrip} driveConnected={false} />);
    const button = screen.getByRole('button', { name: 'Sincronizar' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('title')).toMatch(/Conect/i);
  });

  it('avisa que está sincronizando y bloquea el botón', () => {
    render(<DashboardStatusStrip {...baseStrip} driveConnected syncing />);
    const button = screen.getByRole('button', { name: 'Sincronizando…' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('el toggle de tema anuncia la acción contraria al tema actual', () => {
    const onToggleTheme = vi.fn();
    render(
      <DashboardStatusStrip {...baseStrip} driveConnected theme="dark" onToggleTheme={onToggleTheme} />
    );
    const toggle = screen.getByRole('button', { name: 'Cambiar a tema claro' });
    fireEvent.click(toggle);
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });
});

describe('HistoryTab', () => {
  it('traduce los estados crudos de la API a castellano', () => {
    // Antes se mostraba `completed`, que es el valor de la base, no algo que se lea.
    render(
      <HistoryTab
        logs={[
          { id: '1', status: 'completed', started_at: '2026-11-01T10:00:00Z', items_processed: 5 },
          { id: '2', status: 'failed', started_at: '2026-11-02T10:00:00Z', error_message: 'boom' },
          { id: '3', status: 'syncing', started_at: '2026-11-03T10:00:00Z' },
        ]}
      />
    );
    expect(screen.getByText('completada')).toBeTruthy();
    expect(screen.getByText('falló')).toBeTruthy();
    expect(screen.getByText('en curso')).toBeTruthy();
    expect(screen.queryByText('completed')).toBeNull();
  });

  it('explica el estado vacío en vez de dejar la lista en blanco', () => {
    render(<HistoryTab logs={[]} />);
    expect(screen.getByText(/Todavía no hay sincronizaciones/i)).toBeTruthy();
  });
});

function EffectsHarness({ initial }: { initial: Record<string, unknown> }) {
  const [form, setForm] = useState<any>(initial);
  return (
    <EffectsTab
      configForm={form}
      setConfigForm={setForm as any}
      savingConfig={false}
      onSaveConfig={() => {}}
      hasChanges={false}
    />
  );
}

describe('EffectsTab', () => {
  it('el campo de URL aparece sólo con el efecto personalizado', () => {
    // Se cambia el select en vez de remontar con otra prop: `rerender` no reinicia el useState
    // del harness, asi que la prop `initial` solo vale en el montaje.
    render(<EffectsHarness initial={{ seasonal_effect: 'snow' }} />);
    expect(screen.queryByLabelText('URL del icono personalizado')).toBeNull();

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'custom' } });

    expect(screen.getByLabelText('URL del icono personalizado')).toBeTruthy();
  });

  it('guardar queda deshabilitado sin cambios pendientes', () => {
    render(<EffectsHarness initial={{ seasonal_effect: 'none' }} />);
    const save = screen.getByRole('button', { name: 'Guardar cambios' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });
});

const BASE_FORM = {
  primary_color: '#111111',
  secondary_color: '#222222',
  text_color: '#333333',
  card_border_color: '#444444',
  card_border_width: 0,
  grid_columns: 5,
  mobile_grid_columns: 2,
  hide_album_titles: false,
  background_image: '',
  allow_photo_download: false,
};

function DesignHarness() {
  const [form, setForm] = useState<any>(BASE_FORM);
  return (
    <DesignTab
      configForm={form}
      setConfigForm={setForm as any}
      savingConfig={false}
      onSaveConfig={() => {}}
      hasChanges={false}
    />
  );
}

describe('DesignTab', () => {
  it('arranca como Personalizado cuando ningún tema coincide', () => {
    render(<DesignHarness />);
    expect(screen.getByText(/Personalizado/)).toBeTruthy();
  });

  it('elegir un tema aplica sus cuatro colores y lo dice en palabras', () => {
    const preset = THEME_PRESETS[0];
    render(<DesignHarness />);

    fireEvent.click(screen.getByTitle(preset.description));

    // El nombre del tema se informa en texto, que es lo que faltaba antes.
    expect(screen.getByText(`Tema: ${preset.name}`)).toBeTruthy();
    // Y los cuatro valores quedan reflejados en el ajuste fino.
    expect(screen.getByText(preset.primaryColor)).toBeTruthy();
    expect(screen.getByText(preset.secondaryColor)).toBeTruthy();
    expect(screen.getByText(preset.textColor)).toBeTruthy();
    expect(screen.getByText(preset.cardBorderColor)).toBeTruthy();
  });

  it('avisa que guardar no está disponible sin cambios', () => {
    render(<DesignHarness />);
    const save = screen.getByRole('button', { name: 'Guardar cambios' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(screen.getByText('Sin cambios por guardar')).toBeTruthy();
  });
});
