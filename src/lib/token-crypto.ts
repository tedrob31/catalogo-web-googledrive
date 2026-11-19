import crypto from 'crypto';

/**
 * Cifrado en reposo de los tokens de Google Drive.
 *
 * Los tokens viven en `public.google_integrations` y hasta ahora estaban en texto plano: solo
 * los protegia el cifrado de disco de Supabase. Ahora se guardan cifrados con AES-256-GCM y la
 * clave vive en una variable de entorno, fuera de la base. Consecuencia util: los backups de
 * Supabase quedan con solo ciphertext.
 *
 * Se hace aca y no en la base a proposito. Usar el Vault de Supabase obligaria a crear funciones
 * SECURITY DEFINER en `public` (PostgREST solo expone ese esquema) que lean secretos descifrados,
 * y esa es exactamente la clase de defecto que ya produjo dos hallazgos en este proyecto.
 *
 * Formato en la columna: `v1:<base64(iv | tag | ciphertext)>`.
 * El prefijo es lo que permite distinguir un valor cifrado de uno heredado en texto plano, y por
 * eso la migracion es progresiva: cada fila se cifra la proxima vez que se toca.
 */

const PREFIX = 'v1:';
const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'Falta TOKEN_ENCRYPTION_KEY: no se pueden cifrar los tokens de Drive. ' +
        'Definila en el entorno (32 bytes en base64) antes de conectar o sincronizar Drive.'
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY debe decodificar a ${KEY_BYTES} bytes (decodifico ${key.length}). ` +
        'Generala con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }
  return key;
}

/** `true` si el valor guardado esta cifrado con este modulo. */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/**
 * Cifra un token para guardarlo. Falla si no hay clave: es preferible un error visible a guardar
 * un token en texto plano sin que nadie lo note.
 */
export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}

/**
 * Devuelve el token en claro.
 *
 * Un valor sin prefijo es legado en texto plano y se devuelve tal cual, para no romper las filas
 * que todavia no pasaron por una escritura. GCM autentica el contenido: si el valor fue alterado,
 * esto lanza en vez de devolver basura.
 */
export function decryptToken(stored: string): string {
  if (!isEncrypted(stored)) return stored;

  const payload = Buffer.from(stored.slice(PREFIX.length), 'base64');
  // Debe ser ESTRICTAMENTE menor: un texto vacio cifrado produce exactamente IV+TAG bytes y
  // tiene que poder descifrarse, o el ida y vuelta no es total.
  if (payload.length < IV_BYTES + TAG_BYTES) {
    throw new Error('Token cifrado con formato invalido.');
  }

  const iv = payload.subarray(0, IV_BYTES);
  const tag = payload.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = payload.subarray(IV_BYTES + TAG_BYTES);

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
