/**
 * Regresiones del cifrado de tokens de Drive.  Ejecutar:  npm test
 *
 * Lo que importa demostrar: que el token no queda legible, que la autenticacion de GCM detecta
 * una manipulacion, que las filas heredadas en texto plano no rompen nada, y que sin clave se
 * rechaza la escritura en vez de degradar en silencio a texto plano.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { encryptToken, decryptToken, isEncrypted } from '../src/lib/token-crypto.ts';

const KEY = crypto.randomBytes(32).toString('base64');
const PLAIN = '1//0gExampleRefreshTokenQueNoDeberiaVerse-abc123';

function withKey(fn) {
  const prev = process.env.TOKEN_ENCRYPTION_KEY;
  process.env.TOKEN_ENCRYPTION_KEY = KEY;
  try { return fn(); } finally {
    if (prev === undefined) delete process.env.TOKEN_ENCRYPTION_KEY; else process.env.TOKEN_ENCRYPTION_KEY = prev;
  }
}

test('el token cifrado no contiene el texto original', () => {
  withKey(() => {
    const out = encryptToken(PLAIN);
    assert.ok(isEncrypted(out), 'debe llevar el prefijo de version');
    assert.ok(!out.includes(PLAIN), 'el texto plano no puede aparecer en el valor guardado');
    assert.ok(!out.includes('refresh'), 'ni siquiera una parte reconocible');
  });
});

test('ida y vuelta devuelve el mismo token', () => {
  withKey(() => {
    assert.equal(decryptToken(encryptToken(PLAIN)), PLAIN);
  });
});

test('dos cifrados del mismo token dan resultados distintos', () => {
  withKey(() => {
    // IV aleatorio por operacion: si fueran iguales, se podria comparar filas entre si.
    assert.notEqual(encryptToken(PLAIN), encryptToken(PLAIN));
  });
});

test('un valor manipulado se rechaza en vez de devolver basura', () => {
  withKey(() => {
    const out = encryptToken(PLAIN);
    const raw = Buffer.from(out.slice(3), 'base64');
    raw[raw.length - 1] ^= 0xff;                       // toco el ciphertext
    const tampered = 'v1:' + raw.toString('base64');
    assert.throws(() => decryptToken(tampered));
  });
});

test('un valor heredado sin prefijo se devuelve tal cual', () => {
  withKey(() => {
    // Las filas que todavia no pasaron por una escritura siguen en texto plano.
    assert.equal(decryptToken('token-legado-en-texto-plano'), 'token-legado-en-texto-plano');
    assert.equal(isEncrypted('token-legado-en-texto-plano'), false);
  });
});

test('sin clave, escribir falla en vez de guardar texto plano', () => {
  const prev = process.env.TOKEN_ENCRYPTION_KEY;
  delete process.env.TOKEN_ENCRYPTION_KEY;
  try {
    assert.throws(() => encryptToken(PLAIN), /TOKEN_ENCRYPTION_KEY/);
  } finally {
    if (prev !== undefined) process.env.TOKEN_ENCRYPTION_KEY = prev;
  }
});

test('una clave del tamano equivocado se rechaza', () => {
  const prev = process.env.TOKEN_ENCRYPTION_KEY;
  process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(16).toString('base64');
  try {
    assert.throws(() => encryptToken(PLAIN), /32 bytes/);
  } finally {
    if (prev === undefined) delete process.env.TOKEN_ENCRYPTION_KEY; else process.env.TOKEN_ENCRYPTION_KEY = prev;
  }
});
