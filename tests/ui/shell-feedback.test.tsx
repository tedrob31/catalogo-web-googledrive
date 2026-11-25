import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ShellToastStack from '@/components/dashboard/ShellToast';
import ShellConfirmModal from '@/components/dashboard/ShellConfirmModal';

afterEach(() => {
  cleanup();
});

describe('ShellToastStack', () => {
  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ShellToastStack toasts={[]} onDismiss={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders status and alert toasts and invokes onDismiss', () => {
    const onDismiss = vi.fn();
    render(
      <ShellToastStack
        toasts={[
          { id: 1, kind: 'ok', text: 'Dominio guardado' },
          { id: 2, kind: 'error', text: 'Fallo al guardar' },
        ]}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByRole('status').textContent).toContain('Dominio guardado');
    expect(screen.getByRole('alert').textContent).toContain('Fallo al guardar');

    const closeButtons = screen.getAllByRole('button', { name: 'Cerrar notificación' });
    fireEvent.click(closeButtons[1]);
    expect(onDismiss).toHaveBeenCalledWith(2);
  });
});

describe('ShellConfirmModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ShellConfirmModal
        isOpen={false}
        title="Confirmar acción"
        message="Mensaje"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('fires onConfirm and onCancel and disables buttons while busy', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const { rerender } = render(
      <ShellConfirmModal
        isOpen
        title="Cancelar sincronización"
        message="¿Detener la sincronización actual?"
        confirmLabel="Detener"
        cancelLabel="Volver"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Detener' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    rerender(
      <ShellConfirmModal
        isOpen
        busy
        title="Cancelar sincronización"
        message="¿Detener la sincronización actual?"
        confirmLabel="Detener"
        cancelLabel="Volver"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect((screen.getByRole('button', { name: 'Volver' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Procesando…' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
