import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Runner para los tests de COMPORTAMIENTO de componentes.
 *
 * Va separado de `npm test` (node:test) a proposito: ese runner no transforma JSX ni tiene DOM.
 * `npm test` queda como el runner rapido de la logica pura; `npm run test:ui` es este.
 *
 * El JSX lo resuelve oxc, que es el transformador de vitest 5: no hace falta configurar esbuild.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/ui/**/*.test.tsx'],
    globals: false,
  },
});
