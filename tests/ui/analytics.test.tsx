import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

const rpcMock = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc: rpcMock,
    from: () => ({
      delete: () => ({
        lt: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }),
}));

beforeEach(() => {
  rpcMock.mockClear();
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as typeof ResizeObserver;
  }
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('analytics-buffer unique_visitors separation', () => {
  it('accumulates daily unique_visitors separately from views and flushes in one RPC batch', async () => {
    const { recordMetricEvent, flushAnalyticsBuffer } = await import('@/lib/analytics-buffer');

    // Primer ingreso del día al catálogo
    recordMetricEvent('tenant-1', '/', 'juanstore', 'view', true);
    // Reingreso o exploración de múltiples categorías el mismo día (sin sumar único)
    recordMetricEvent('tenant-1', '/calzado/', 'Calzado', 'view', false);
    recordMetricEvent('tenant-1', '/carteras/', 'Carteras', 'view', false);
    recordMetricEvent('tenant-1', '/calzado/', 'Calzado', 'whatsapp', false);

    await flushAnalyticsBuffer();

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith(
      'increment_page_metrics_batch',
      expect.objectContaining({
        p_metrics: expect.arrayContaining([
          expect.objectContaining({
            tenant_id: 'tenant-1',
            path: '/',
            views: 1,
            unique_visitors: 1,
            whatsapp: 0,
          }),
          expect.objectContaining({
            tenant_id: 'tenant-1',
            path: '/calzado/',
            views: 1,
            unique_visitors: 0,
            whatsapp: 1,
          }),
          expect.objectContaining({
            tenant_id: 'tenant-1',
            path: '/carteras/',
            views: 1,
            unique_visitors: 0,
            whatsapp: 0,
          }),
        ]),
      })
    );
  });
});

describe('AnalyticsDashboard KPIs', () => {
  it('displays unique visitors separately from category views and real conversion rate', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          summary: {
            totalUniqueVisitors: 25,
            totalViews: 105,
            totalCategoryViews: 80,
            totalWhatsapp: 5,
            conversionRate: 20,
            topPage: 'Calzado',
          },
          dailyTrend: [{ date: '2026-11-26', shortDate: '26/11', uniqueVisitors: 25, views: 105, whatsapp: 5 }],
          topContent: [{ path: '/calzado/', title: 'Calzado', views: 80, uniqueVisitors: 12, whatsapp: 5 }],
        }),
      })
    );

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Visitantes únicos')).toBeTruthy();
    });

    expect(screen.getByText('25')).toBeTruthy();
    expect(screen.getAllByText('80').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('20%')).toBeTruthy();
    expect(screen.getAllByText('Calzado').length).toBeGreaterThanOrEqual(1);
  });
});
