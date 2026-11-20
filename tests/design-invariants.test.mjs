/**
 * Invariantes del sistema de diseño del panel.  Ejecutar:  npm test
 *
 * El panel del inquilino tiene un solo sistema de color: los tokens `--color-shell-*` declarados
 * en `src/app/globals.css`. Antes de eso cada componente traía sus propios hex y clases de
 * Tailwind, y por eso el panel se veía armado con dos productos distintos. Estos tests existen
 * para que esa deriva no vuelva, y para que el tema claro no se rompa en silencio.
 *
 * No prueban cómo se ve nada: prueban que las reglas del sistema se respeten.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

/** Superficies que están dentro del sistema. El catálogo público queda afuera a propósito. */
const SCOPE = [
  'src/components/dashboard',
  'src/components/admin/StorefrontBuilder.tsx',
  'src/components/AnalyticsDashboard.tsx',
];

/** Clases de color de la paleta por defecto y literales hex: todo eso esquiva los tokens. */
const FORBIDDEN = [
  { name: 'clase de color de la paleta por defecto', re: /(?:zinc|amber|rose|emerald|slate|gray|red|blue|orange|teal|cyan|violet|purple)-\d{2,3}/ },
  { name: 'fondo translúcido en negro o blanco', re: /bg-(?:black|white)\/\d+/ },
  { name: 'literal hex', re: /#[0-9a-fA-F]{3,8}\b/ },
  { name: 'color rgb/rgba/hsl literal', re: /\b(?:rgb|hsl)a?\(/ },
];

function collect(path) {
  const abs = join(ROOT, path);
  const st = statSync(abs);
  if (st.isFile()) return [path];
  const out = [];
  for (const entry of readdirSync(abs)) {
    out.push(...collect(join(path, entry).split('\\').join('/')));
  }
  return out;
}

const files = SCOPE.flatMap(collect).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));

test('el test encuentra los archivos del panel', () => {
  assert.ok(files.length >= 10, `esperaba al menos 10 archivos, encontré ${files.length}`);
  assert.ok(files.some((f) => f.endsWith('DriveTab.tsx')), 'DriveTab debería estar en el alcance');
});

test('ningún componente del panel escapa al sistema de tokens', () => {
  const offences = [];
  for (const file of files) {
    const source = readFileSync(join(ROOT, file), 'utf8').split('\n');
    source.forEach((line, i) => {
      for (const rule of FORBIDDEN) {
        const hit = line.match(rule.re);
        if (hit) {
          offences.push(
            `${relative('.', join(ROOT, file))}:${i + 1}  ${rule.name}: ${hit[0]}`
          );
        }
      }
    });
  }
  assert.deepEqual(
    offences,
    [],
    `El panel debe usar sólo tokens shell-*. Reemplazá estos valores:\n${offences.join('\n')}`
  );
});

/** Extrae los nombres de token declarados dentro de un bloque `nombre { ... }` del CSS. */
function tokensIn(css, blockStart) {
  const start = css.indexOf(blockStart);
  if (start === -1) return [];
  const open = css.indexOf('{', start);
  const close = css.indexOf('\n}', open);
  const block = css.slice(open, close);
  return [...block.matchAll(/(--color-shell-[a-z-]+)\s*:/g)].map((m) => m[1]).sort();
}

test('el tema claro define todos los tokens del tema base', () => {
  const css = readFileSync(join(ROOT, 'src/app/globals.css'), 'utf8');
  const base = tokensIn(css, '@theme');
  const light = tokensIn(css, '.theme-light');

  assert.ok(base.length >= 10, `esperaba al menos 10 tokens en @theme, encontré ${base.length}`);

  const faltantes = base.filter((token) => !light.includes(token));
  assert.deepEqual(
    faltantes,
    [],
    `Estos tokens existen en @theme pero no en .theme-light, así que en tema claro usan el valor oscuro:\n  ${faltantes.join('\n  ')}`
  );
});
