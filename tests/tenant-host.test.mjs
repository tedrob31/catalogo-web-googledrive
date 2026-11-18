/**
 * Regresiones de la resolucion de tenant por Host.  Ejecutar:  npm test
 *
 * Este repo no tenia runner, y eso ya costo caro una vez: la primera version del
 * cambio en /api/analytics/track llamaba a recordMetricEvent SIN su primer
 * argumento, asi que el path del request viajaba como uuid de tenant y el 100% de
 * las metricas de todos los inquilinos se descartaba en silencio detras de un
 * HTTP 200.
 *
 * Ni `tsc --noEmit` ni `next build` lo detectaron: recordMetricEvent declara
 * `eventType` con valor por defecto, lo que hace legal una llamada con 3
 * argumentos y simplemente CORRE todos los argumentos una posicion. Ademas los
 * errores `22P02 invalid input syntax for type uuid` quedaban tragados por un
 * Promise.allSettled. Los tests de mas abajo cubren ese invariante.
 *
 * Los casos de host son pruebas de comportamiento reales. Los dos ultimos son
 * alarmas estaticas sobre el texto de la ruta (tripwires): baratas y efectivas
 * para este tipo de bug de cableado, que no tiene borde observable. La prueba de
 * comportamiento de la ruta completa es el burst end-to-end documentado en
 * supabase/README.md y en la memoria del proyecto.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tenantKeyFromHost } from '../src/lib/tenant-host.ts';

const ROUTE = readFileSync(new URL('../src/app/api/analytics/track/route.ts', import.meta.url), 'utf8');

test('resuelve el subdominio desde el Host', () => {
  assert.equal(tenantKeyFromHost('juanstore.c4talogo.com'), 'juanstore');
  assert.equal(tenantKeyFromHost('JUANSTORE.C4TALOGO.COM'), 'juanstore');
  assert.equal(tenantKeyFromHost('juanstore.c4talogo.com:443'), 'juanstore');
  assert.equal(tenantKeyFromHost('  juanstore.c4talogo.com  '), 'juanstore');
  assert.equal(tenantKeyFromHost('a.b.c4talogo.com'), 'a.b');
  assert.equal(tenantKeyFromHost('xn--abc.c4talogo.com'), 'xn--abc');
});

test('resuelve un dominio propio tal cual, incluido el apex', () => {
  // Los dos dominios propios reales de la plataforma. El apex es el caso fragil:
  // si no resolviera, su tienda dejaria de registrar metricas en silencio.
  assert.equal(tenantKeyFromHost('catalogodemoda.pe'), 'catalogodemoda.pe');
  assert.equal(tenantKeyFromHost('liquidacion.catalogodemoda.pe'), 'liquidacion.catalogodemoda.pe');
  assert.equal(tenantKeyFromHost('www.mitienda.com'), 'www.mitienda.com');
});

test('en desarrollo respeta <subdominio>.localhost, igual que middleware.ts', () => {
  assert.equal(tenantKeyFromHost('juanstore.localhost'), 'juanstore');
  assert.equal(tenantKeyFromHost('juanstore.localhost:3000'), 'juanstore');
});

test('no trata como tienda al dominio raiz, reservados, IPs ni infra', () => {
  for (const host of [
    'c4talogo.com', 'www.c4talogo.com', 'app.c4talogo.com', 'localhost.c4talogo.com',
    'localhost', 'localhost:3000', 'localhost.localhost', 'www.localhost', 'app.localhost',
    '127.0.0.1', '127.0.0.1:3000', 'r4tlabs.com', 'monitor.r4tlabs.com', 'ono.com', 'x.ono.com',
    '', null, undefined, '  ', '.', 'c4talogo.com.', '-bad-.c4talogo.com',
  ]) {
    assert.equal(tenantKeyFromHost(host), null, `tenantKeyFromHost(${JSON.stringify(host)})`);
  }
});

test('ninguna clave puede inyectar condiciones en el filtro PostgREST', () => {
  // La clave se interpola en .or(`subdomain.eq.${key},custom_domain.eq.${key}`).
  // Una coma o un parentesis agregarian condiciones al filtro de la consulta.
  for (const host of [
    'evil.com,custom_domain_enabled.eq.true',
    'evil.com,status.eq.active',
    'a.com,or(status.eq.active)',
    'x(y).com', 'a)or(1=1.c4talogo.com', 'evil.com"or"1', "evil.com'",
    'a.com|b', 'a.com;b', 'a.com=b', 'a.com*', 'a.com%2c', 'a.com\\b', 'a.com b', 'a..b.com',
  ]) {
    assert.equal(tenantKeyFromHost(host), null, `tenantKeyFromHost(${JSON.stringify(host)})`);
  }
});

test('toda clave aceptada es un hostname desnudo', () => {
  const aceptados = [
    'juanstore.c4talogo.com', 'a.b.c4talogo.com', 'xn--abc.c4talogo.com',
    'catalogodemoda.pe', 'liquidacion.catalogodemoda.pe', 'juanstore.localhost',
  ];
  for (const host of aceptados) {
    const key = tenantKeyFromHost(host);
    assert.ok(key !== null && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(key),
      `la clave de ${host} no es un hostname desnudo: ${JSON.stringify(key)}`);
  }
});

test('recordMetricEvent recibe el tenantId resuelto como PRIMER argumento', () => {
  // Este es el bug exacto que motivo este archivo. Si falta el primer argumento,
  // tsc y next build siguen verdes y las metricas se pierden en silencio.
  assert.match(ROUTE, /recordMetricEvent\(\s*tenantId\s*,/,
    'el primer argumento de recordMetricEvent debe ser tenantId');
});

test('la ruta no acepta el tenant desde el cuerpo del request', () => {
  assert.match(ROUTE, /const \{ path, title, event_type \} = body;/);
  assert.doesNotMatch(ROUTE, /const \{[^}]*tenant_id[^}]*\} = body;/,
    'la ruta no debe desestructurar tenant_id del cuerpo');
});
