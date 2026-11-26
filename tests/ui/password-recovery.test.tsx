import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import ResetPasswordPage from '@/app/reset-password/page';

const pushMock = vi.fn();
const refreshMock = vi.fn();

const resetPasswordForEmailMock = vi.fn();
const exchangeCodeForSessionMock = vi.fn();
const verifyOtpMock = vi.fn();
const getSessionMock = vi.fn();
const updateUserMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      resetPasswordForEmail: resetPasswordForEmailMock,
      exchangeCodeForSession: exchangeCodeForSessionMock,
      verifyOtp: verifyOtpMock,
      getSession: getSessionMock,
      updateUser: updateUserMock,
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  }),
}));

beforeEach(() => {
  resetPasswordForEmailMock.mockReset().mockResolvedValue({ error: null });
  exchangeCodeForSessionMock.mockReset().mockResolvedValue({ error: null });
  verifyOtpMock.mockReset().mockResolvedValue({ error: null });
  getSessionMock.mockReset().mockResolvedValue({ data: { session: null } });
  updateUserMock.mockReset().mockResolvedValue({ error: null });
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

describe('LoginPage password recovery request', () => {
  it('switches to forgot mode and calls resetPasswordForEmail with /reset-password/', async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }));

    const emailInput = screen.getByPlaceholderText('tu@negocio.com') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'tienda@c4talogo.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar enlace de recuperación/i }));

    await waitFor(() => {
      expect(resetPasswordForEmailMock).toHaveBeenCalledWith('tienda@c4talogo.com', {
        redirectTo: `${window.location.origin}/reset-password/`,
      });
    });

    expect(screen.getByText(/enviamos un enlace a tu bandeja/i)).toBeTruthy();
  });
});

describe('ResetPasswordPage', () => {
  it('exchanges PKCE code and updates user password after validation', async () => {
    window.history.replaceState({}, '', '/reset-password/?code=pkce-demo-code');
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(exchangeCodeForSessionMock).toHaveBeenCalledWith('pkce-demo-code');
    });

    const newInput = await screen.findByPlaceholderText('Mínimo 6 caracteres');
    const confirmInput = screen.getByPlaceholderText('Repite tu contraseña');

    fireEvent.change(newInput, { target: { value: 'nueva123' } });
    fireEvent.change(confirmInput, { target: { value: 'distinta123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Nueva Contraseña' }));

    expect(screen.getByRole('alert').textContent).toContain('no coinciden');
    expect(updateUserMock).not.toHaveBeenCalled();

    fireEvent.change(confirmInput, { target: { value: 'nueva123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Nueva Contraseña' }));

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith({ password: 'nueva123' });
    });
    expect(screen.getByText(/Contraseña actualizada/i)).toBeTruthy();
  });

  it('shows error when opened without recovery token or active session', async () => {
    window.history.replaceState({}, '', '/reset-password/');
    render(<ResetPasswordPage />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Enlace inválido o expirado');
  });
});
