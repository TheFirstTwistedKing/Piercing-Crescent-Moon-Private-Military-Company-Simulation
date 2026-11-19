// PIN/복구코드 해시. PBKDF2-SHA256 + 랜덤 salt. (Web Crypto)
const enc = new TextEncoder();
const toB64 = (u8) => btoa(String.fromCharCode(...u8));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(secret, salt, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
}

export async function hashSecret(secret, iter = 210000) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: toB64(salt), hash: toB64(await derive(secret, salt, iter)), iter };
}

export async function verifySecret(secret, rec) {
  if (!rec || !rec.salt || !rec.hash) return false;
  const got = await derive(secret, fromB64(rec.salt), rec.iter || 210000);
  const want = fromB64(rec.hash);
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}

export async function sha256Hex(str) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(str)));
  return [...d].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 혼동 문자(0/O, 1/I) 제외한 Crockford 계열 알파벳 — 40비트 엔트로피(8자)
const RC = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export function makeRecoveryCodes(n = 8) {
  const codes = [];
  for (let i = 0; i < n; i++) {
    const r = crypto.getRandomValues(new Uint8Array(8));
    const s = [...r].map((b) => RC[b % RC.length]).join('');
    codes.push(`${s.slice(0, 4)}-${s.slice(4)}`);
  }
  return codes;
}
export const normalizeRecovery = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(.{4})(.{4})$/, '$1-$2');

// 로그인 시도 제한 (클라이언트 측 — 장치별). 5회 실패 후 30초부터 2배씩 증가, 최대 15분.
export function lockState(key) {
  try {
    const v = JSON.parse(localStorage.getItem('pcm.lock.' + key) || 'null') || { fails: 0, until: 0 };
    return { ...v, remaining: Math.max(0, Math.ceil((v.until - Date.now()) / 1000)) };
  } catch { return { fails: 0, until: 0, remaining: 0 }; }
}
export function lockFail(key) {
  const s = lockState(key);
  const fails = s.fails + 1;
  const until = fails >= 5 ? Date.now() + Math.min(900, 30 * 2 ** (fails - 5)) * 1000 : 0;
  try { localStorage.setItem('pcm.lock.' + key, JSON.stringify({ fails, until })); } catch { /* ignore */ }
  return lockState(key);
}
export function lockClear(key) { try { localStorage.removeItem('pcm.lock.' + key); } catch { /* ignore */ } }
