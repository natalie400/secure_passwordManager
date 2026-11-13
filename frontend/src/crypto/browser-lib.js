// Browser equivalents of cryptography/lib.js (same function names and behaviour, no Node Buffer).
const enc = new TextEncoder();
const dec = new TextDecoder();

export function stringToBuffer(str) { return enc.encode(str); }
export function bufferToString(buf) { return dec.decode(buf); }

export function encodeBuffer(buf) {
  const bytes = new Uint8Array(buf instanceof ArrayBuffer ? buf : buf.buffer ? new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) : buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function decodeBuffer(base64) {
  const s = atob(base64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function getRandomBytes(len) { return globalThis.crypto.getRandomValues(new Uint8Array(len)); }