// Key helpers for the tracker service. Work in a Cloudflare Worker and in Node 20+.

function toHex(bytes) {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

// A new random key: 128 random bits written as 32 hexadecimal characters.
export function newKey() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

// One-way scramble (SHA-256) of a text, as 64 hexadecimal characters.
export async function hashKey(text) {
  const data = new TextEncoder().encode(String(text));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(digest));
}

// True only when a and b are the same text. Compares scrambled copies,
// character by character, without stopping early, so timing leaks nothing.
export async function sameSecret(a, b) {
  const [x, y] = await Promise.all([hashKey(a), hashKey(b)]);
  let diff = x.length ^ y.length;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

// A trip key or family key as the service hands them out.
export function isKeyShape(value) {
  return typeof value === 'string' && /^[0-9a-f]{32}$/.test(value);
}
