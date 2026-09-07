/**
 * A UUID, on origins where `crypto.randomUUID` does not exist.
 *
 * `randomUUID` is restricted to **secure contexts**: it is there on localhost
 * and on https, and `undefined` on a plain-http address like
 * `http://192.168.1.5:3200`. That is exactly how you reach a dev server from
 * another computer on the same network - so without this the engine threw on
 * the very first event id and the whole game broke, online or not.
 *
 * `crypto.getRandomValues` carries no such restriction, so the fallback is a
 * real v4 built from it rather than something weaker like `Math.random`. The
 * shape matters as well as the entropy: a game id is stored in a Postgres
 * `uuid` column, which rejects anything that is not one.
 */
export const randomUUID = (): string => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // Version 4, and the RFC 4122 variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
};
