// RFC 6238 TOTP (HMAC-SHA1, 6자리, 30초). Web Crypto 만 사용 → 브라우저/Electron/Android WebView/Node 모두 동작.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes) {
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str) {
  const s = String(str).toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0, value = 0; const out = [];
  for (const ch of s) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error('잘못된 Base32 문자');
    value = (value << 5) | i; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}

export function randomSecret(bytes = 20) {
  return base32Encode(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function hotp(keyBytes, counter, digits = 6) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const buf = new ArrayBuffer(8);
  const dv = new DataView(buf);
  dv.setUint32(0, Math.floor(counter / 2 ** 32));
  dv.setUint32(4, counter >>> 0);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
  const off = mac[19] & 0x0f;
  const bin = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}

export const stepOf = (time = Date.now(), step = 30) => Math.floor(time / 1000 / step);

export async function totp(secretB32, time = Date.now(), digits = 6) {
  return hotp(base32Decode(secretB32), stepOf(time), digits);
}

/** 일치하는 time-step 카운터를 돌려준다(불일치면 null). window=±허용 스텝. */
export async function verifyTotp(secretB32, code, { window = 1, time = Date.now(), minStep = -1 } = {}) {
  const clean = String(code).replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean)) return null;
  const key = base32Decode(secretB32);
  const cur = stepOf(time);
  for (let w = -window; w <= window; w++) {
    const step = cur + w;
    if (step <= minStep) continue; // 이미 사용한 코드 재사용 방지
    if ((await hotp(key, step)) === clean) return step;
  }
  return null;
}

export function otpauthUri({ secret, account, issuer }) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
