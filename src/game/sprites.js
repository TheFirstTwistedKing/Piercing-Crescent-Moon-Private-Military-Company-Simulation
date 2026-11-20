// 캐릭터 스프라이트 — 코드로 그린 16×24 픽셀 캐릭터. 머리 스타일/머리색/무기는 커스터마이징으로 바뀌며 즉시 다시 그려진다.
import { DEPT } from './data.js';
import { drawHair, adj } from './hair.js';
import { drawWeapon, WEAPON, gunHandX } from './weapons.js';
import { bodyFrame } from './body-art.js';
import { RES } from './res.js';

export const CW = 32, CH = 24, OX = 8; // 논리 칸 기준: 날개가 펼쳐질 좌우 여백 8칸 씩 (몸은 셀 안 x=8..23)
export const PAD = 1;                    // 외곽선이 잘리지 않도록 사방에 1칸 여유
export const SW = (CW + PAD * 2) * RES, SH = (CH + PAD * 2) * RES;   // 셀 하나의 실제 픽셀 크기(2배 해상도)
const DIRS = ['down', 'left', 'right', 'up'];
export const DIR_INDEX = { down: 0, left: 1, right: 2, up: 3 };
const cache = new Map();

// 드래곤 날개(왼쪽 기준 12×13 도안, 오른쪽은 대칭). B=뼈대(팔 + 손가락뼈 3줄, 푸른색) C=손톱 M=막.
// 막은 노랑 — 몸쪽/아래쪽은 어두운 금색, 아랫단은 한 톤 진하게, 곳곳에 하이라이트. 아랫단은 손가락 사이가 오목한 물결 모양.
const WING = [
  '......C.....',
  '......B.....',
  '....BBB.....',
  '..BBMMMB....',
  'BBMMMMBB....',
  '..MMMBMMB...',
  '...MBMMMB...',
  '...BMMMBMB..',
  '..BMMMBMMB..',
  '.BMMMBMMMMB.',
  'B.MMMBMMMMMB',
  '...MBMMMMMM.',
  '....BMMM....',
];
const WING_HL = new Set(['4,3', '3,4', '3,5', '4,8', '3,9', '7,9', '3,10', '6,11']);
function wingColor(col, row) {
  const ch = WING[row][col];
  if (ch === 'C') return '#d6ebff';
  if (ch === 'B') return row < 4 ? '#5fa8ee' : '#2f6fc0';   // 뼈대는 푸른색(윗부분은 조금 밝게)
  if (WING_HL.has(col + ',' + row)) return '#ffe066';
  const below = WING[row + 1]?.[col];
  if (!below || below === '.') return '#c99a12';           // 아랫단(물결 가장자리)
  return col >= 8 || row >= 11 ? '#b8860b' : '#e8b923';     // 몸쪽/아래는 어둡게
}
// 걷는 프레임에서는 날개가 한 칸 내려갔다 올라오며 날갯짓한다. (셀 좌표 col → 몸 기준 x = col - OX)
function drawWings(r, view, frame) {
  const fy = frame ? 1 : 0;
  const put = (mirror) => WING.forEach((line, row) => { for (let col = 0; col < 12; col++) if (line[col] !== '.') r(wingColor(col, row), mirror ? (CW - 1 - col) - OX : col - OX, row + fy, 1, 1); });
  put(false); if (view !== 'side') put(true);
}

// 사람 몸은 첨부 템플릿 도트(body-art.js)를 그대로 쓰고, 템플릿 색을 이 캐릭터의 피부·겉옷·바지·눈·팔띠 색으로 바꿔 칠한다.
// 템플릿의 색 차이(밝기 차)는 그대로 보존한다: 캐릭터 색 = 캐릭터 기준색 + (템플릿 색 − 템플릿 기준색).
const hash = (str) => { let h = 7; for (const ch of str) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0; return Math.abs(h); };
const EYES = ['#3a82d0', '#6a4a30', '#3f9a62', '#8a5ac8', '#38404c'];
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hexOf = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const tone = (tpl, tplBase, base) => { const t = rgb(tpl), b = rgb(tplBase), c = rgb(base); return hexOf(t.map((v, i) => c[i] + (v - b[i]))); };
/** 템플릿 역할 글자 → 색. 몸통(행<30)과 다리(행≥30)의 검은색은 다른 옷(소매 / 바지)이다. */
function bodyPalette(L, accent) {
  const sk = (t) => tone(t, '#f9d2a9', L.skin), co = (t) => tone(t, '#454a43', L.coat), eye = EYES[hash(L.skin + L.coat) % EYES.length];
  const sleeve = adj(L.coat2, -12), pants = L.pants;
  return {
    o: sk('#77432e'), O: sk('#572d1d'), s: sk('#f9d2a9'), l: sk('#ffebc6'), h: sk('#d88a64'),
    x: adj(eye, 52), u: adj(eye, -52), v: adj(eye, -22), y: adj(eye, 84), w: eye,
    F: co('#2c312a'), H: L.coat, K: co('#788372'), I: co('#909090'), G: co('#555555'),
    B: '#0a0a0c', C: sleeve, c: pants, E: '#aaaaaa', D: '#dcdcdc', U: adj(accent, -70), V: adj(accent, -30), R: accent, r: adj(accent, -60),
  };
}
function drawBody(D, frameData, L, accent) {
  const pal = bodyPalette(L, accent), { rows, ox, oy, legRow } = frameData;
  rows.forEach((row, y) => {
    let x = 0; while (x < row.length) {
      const ch = row[x]; if (ch === '.') { x++; continue; }
      let e = x; while (e + 1 < row.length && row[e + 1] === ch) e++;
      const legs = y >= legRow, col = legs ? (ch === 'C' ? pal.c : ch === 'I' || ch === 'K' ? '#aaaaaa' : ch === 'G' ? '#555555' : ch === 'H' ? '#2a2a2a' : pal[ch]) : pal[ch];   // 다리 구역의 회색은 다리감개(템플릿 고정색)
      D(col || '#ff00ff', ox + x, oy + y, e - x + 1, 1); x = e + 1;
    }
  });
}
function drawInner(c, wc, dir, frame, L, accent, weapon, wings, rec) {
  const r = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };            // 논리 칸 좌표(날개 · 머리카락)
  const D = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x / 2, y / 2, w / 2, h / 2); };   // 실제 픽셀 좌표
  const rw = (col, x, y, w, h) => { wc.fillStyle = col; wc.fillRect(x, y, w, h); };           // 무기 층(논리 칸)
  const isGun = WEAPON[weapon]?.art?.kind === 'gun';
  const view = dir === 'down' ? 'down' : dir === 'up' ? 'up' : 'side', mirror = dir === 'left';
  for (const g of [c, wc]) { g.save(); if (mirror) { g.translate(16, 0); g.scale(-1, 1); } }
  if (wings && view !== 'up') drawWings(r, view, frame);
  const fd = bodyFrame(dir === 'left' ? 'left' : view === 'side' ? 'right' : view, frame);
  drawBody(D, fd, L, accent);
  if (wings && view === 'up') drawWings(r, 'up', frame);
  drawHair(r, view, L.hairStyle, L.hair, L.hair2, { x0: fd.ox + fd.head.x0, x1: fd.ox + fd.head.x1, top: fd.oy + fd.head.y0 });
  headGear(D, view, L, accent, fd);
  drawWeapon(rw, view, weapon);
  if (isGun) gunHand(rw, view, L, adj(L.skin, -38), weapon);
  for (const g of [c, wc]) g.restore();
}

// 안경 · 마스크 · 모자: 템플릿 머리 상자(앞/뒤 x 10..22, y 5..17)에 맞춘 직접 그림
function headGear(D, view, L, accent, fd) {
  const x0 = fd.ox + fd.head.x0, x1 = fd.ox + fd.head.x1, top = fd.oy + fd.head.y0, w = x1 - x0 + 1, side = view === 'side', back = view === 'up';
  const c2 = L.coat2, c2L = adj(c2, 22), c2D = adj(c2, -22);
  if (!back && L.extra === 'mask') D('#d9d6cf', x0 + 1, top + 10, w - 2, 3);
  if (!back && L.extra === 'glasses') { const y = top + 7; if (side) { D('#1c1c20', x1 - 6, y, 6, 1); D('#1c1c20', x1 - 6, y + 4, 6, 1); D('#1c1c20', x1 - 6, y, 1, 5); D('#1c1c20', x1 - 1, y, 1, 5); D('rgba(150,200,225,.35)', x1 - 5, y + 1, 4, 3); } else { for (const cx of [x0 + 1, x1 - 5]) { D('#1c1c20', cx, y, 5, 1); D('#1c1c20', cx, y + 4, 5, 1); D('#1c1c20', cx, y, 1, 5); D('#1c1c20', cx + 4, y, 1, 5); D('rgba(150,200,225,.35)', cx + 1, y + 1, 3, 3); } D('#1c1c20', x0 + 6, y + 1, w - 12 > 0 ? w - 12 : 1, 1); } }
  const t = top - 1;
  switch (L.hat) {
    case 'cap': D(c2, x0 - 1, t - 1, w + 2, 5); D(c2L, x0 + 1, t - 1, w - 2, 1); D(c2D, x0 - 1, t + 3, w + 2, 1); if (!back) D('#0f0b09', side ? x1 - 3 : x0 - 1, t + 4, side ? 8 : w + 2, 1); break;
    case 'beret': D('#3a1f24', x0 - 2, t - 1, w + 4, 4); D('#4b2a30', x0, t - 3, w, 3); D('#5a3038', x0 + 1, t - 3, 5, 1); D('#2a1418', x0 - 2, t + 2, w + 4, 1); break;
    case 'helm': D('#3b4036', x0 - 2, t - 3, w + 4, 7); D('#565d4d', x0, t - 3, w, 2); D('#2a2e27', x0 - 2, t + 3, w + 4, 1); D(accent, x0 - 2, t + 3, w + 4, 1); D('#6e7762', x0 + 1, t - 1, 4, 1); break;
    case 'hood': D(c2, x0 - 2, t - 2, w + 4, 6); D(c2L, x0, t - 2, w, 1); D(c2, x0 - 2, t + 4, 2, 11); D(c2, x1 + 1, t + 4, 2, 11); D(c2D, x0 - 2, t + 12, 2, 3); D(c2D, x1 + 1, t + 12, 2, 3); if (back) D(c2, x0 - 1, t + 4, w + 2, 10); break;
    case 'headset': D('#202226', x0, t - 1, w, 1); D('#2e3136', x0, t, 1, 7); D('#2e3136', x1, t, 1, 7); D('#202226', x0 - 3, t + 7, 3, 6); D('#202226', x1 + 1, t + 7, 3, 6); D(accent, x0 - 3, t + 9, 1, 2); D(accent, x1 + 3, t + 9, 1, 2); if (!back && !side) D('#202226', x0, t + 13, 5, 1); break;
    case 'goggles': D('#202226', x0 - 1, t + 4, w + 2, 1); if (!side) { D('#3a4a52', x0 + 1, t + 1, 5, 4); D('#3a4a52', x1 - 5, t + 1, 5, 4); D('#7fa3b5', x0 + 2, t + 2, 3, 2); D('#7fa3b5', x1 - 4, t + 2, 3, 2); D('#d6ecf4', x0 + 2, t + 2, 1, 1); D('#d6ecf4', x1 - 4, t + 2, 1, 1); } else { D('#3a4a52', x1 - 6, t + 1, 6, 4); D('#7fa3b5', x1 - 5, t + 2, 4, 2); D('#d6ecf4', x1 - 5, t + 2, 1, 1); } break;
    default: break;
  }
}

// 총을 쥔 손: 총기 손잡이 위로 손바닥·엄지·손가락 마디를 반 칸 단위로 덮는다. (손은 방향마다 총 도안의 손 위치와 같은 곳)
function gunHand(r, view, L, skinD, weapon) {
  const hy = 15.5, hx = gunHandX(WEAPON[weapon], view), dir = view === 'up' ? -1 : 1, X = (x, w = 1) => (dir > 0 ? hx + x : hx + 1 - x - w);
  r(L.skin, X(0), hy - 0.5, 1, 1.5); r(skinD, X(0), hy + 0.5, 1, 0.5);                // 손등/손바닥
  r(L.skin, X(1, 0.5), hy, 0.5, 1); r(skinD, X(1, 0.5), hy + 0.5, 0.5, 0.5);            // 방아쇠울 앞 손가락
  r(adj(L.skin, 16), X(0), hy - 0.5, 0.5, 0.5); r(adj(L.skin, 10), X(1, 0.5), hy - 0.5, 0.5, 0.5);   // 엄지 · 반사광
  r(skinD, X(0), hy, 1, 0.5);                                                         // 손가락 마디 사이 그림자
}

export const finishCanvas = (c, w, h) => finish(c, {}, w, h);   // 다른 도트(무법자 등)에도 같은 외곽선·음영 마감을 쓴다
function drawCell(c, dir, frame, L, accent, weapon, wings) {
  const rec = {}, w2 = weaponLayer();
  w2.ctx.clearRect(0, 0, SW, SH);
  c.save(); c.scale(RES, RES); c.translate(PAD + OX, PAD); w2.ctx.save(); w2.ctx.scale(RES, RES); w2.ctx.translate(PAD + OX, PAD);
  drawInner(c, w2.ctx, dir, frame, L, accent, weapon, wings, rec);
  w2.ctx.restore(); c.restore();
  finish(w2.ctx, {});                      // 무기/손만 외곽선 + 음영 (몸은 템플릿 외곽선을 그대로 쓴다)
  c.drawImage(w2, 0, 0);
}
let wlayer = null;
function weaponLayer() { if (!wlayer) { wlayer = Object.assign(document.createElement('canvas'), { width: SW, height: SH }); wlayer.ctx = wlayer.getContext('2d', { willReadFrequently: true }); wlayer.ctx.imageSmoothingEnabled = false; } return wlayer; }

// 마감 처리: ① 실루엣 바깥에 반 칸 두께의 짙은 외곽선(바깥 색을 어둡게 — 선택적 외곽선) ② 실루엣 가장자리 음영(위·왼쪽은 밝게, 아래·오른쪽은 어둡게)
// ③ 머리카락은 위쪽 광택 띠 + 가닥 무늬 + 아래쪽 그림자. 모두 반 칸 해상도에서 한 번만 계산해 시트에 구워 둔다.
function finish(c, rec, W = SW, H = SH) {
  const SW = W, SH = H;
  const img = c.getImageData(0, 0, SW, SH), d = img.data, src = new Uint8ClampedArray(d), opaque = (x, y) => x >= 0 && y >= 0 && x < SW && y < SH && src[(y * SW + x) * 4 + 3] > 127;
  const hair = () => false;   // 머리카락 광택·그림자는 hair3.js 가 직접 칠한다
  const mix = (i, t, to) => { for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, src[i + k] + (to - src[i + k]) * t)); };
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const i = (y * SW + x) * 4;
    if (src[i + 3] > 127) {
      const up = !opaque(x, y - 1), lf = !opaque(x - 1, y), dn = !opaque(x, y + 1), rt = !opaque(x + 1, y);
      if (hair(x, y)) {
        const hu = !hair(x, y - 1) || !opaque(x, y - 1), hd = !hair(x, y + 1) || !opaque(x, y + 1);
        if (hu) mix(i, 0.3, 255); else if (hd) mix(i, 0.22, 0); else if (y % 7 === 3) mix(i, 0.1, 255);
      } else if (up) mix(i, 0.22, 255); else if (lf) mix(i, 0.08, 255);
      if (dn) mix(i, 0.26, 0); else if (rt) mix(i, 0.14, 0);
    } else {
      let n = 0, R = 0, G = 0, B = 0;
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) if (opaque(x + dx, y + dy)) { const j = ((y + dy) * SW + x + dx) * 4; R += src[j]; G += src[j + 1]; B += src[j + 2]; n++; }
      if (n) { d[i] = (R / n) * 0.3 + 4; d[i + 1] = (G / n) * 0.3 + 3; d[i + 2] = (B / n) * 0.3 + 3; d[i + 3] = 235; }
    }
  }
  c.putImageData(img, 0, 0);
}

const hasWings = (u) => !!u.ab && u.ab.includes('dragon');
const sigOf = (u) => [hasWings(u) ? 'W' : '', u.look.hairStyle, u.look.hair, u.look.hair2 || '', u.weapon, u.look.hat, u.look.extra, u.look.skin, u.look.coat, u.look.coat2, u.look.pants].join('|');

// 셀 하나를 별도 캔버스(SW×SH)에 그려 마감(외곽선·음영)까지 끝낸 뒤 돌려준다. 같은 캔버스를 재사용하므로 호출 즉시 복사해야 한다.
let scratch = null;
function cellCanvas(dir, frame, L, accent, weapon, wings) {
  if (!scratch) { scratch = Object.assign(document.createElement('canvas'), { width: SW, height: SH }); scratch.ctx = scratch.getContext('2d', { willReadFrequently: true }); scratch.ctx.imageSmoothingEnabled = false; }
  scratch.ctx.clearRect(0, 0, SW, SH); drawCell(scratch.ctx, dir, frame, L, accent, weapon, wings);
  return scratch;
}

/** 스프라이트 시트(3프레임 × 4방향, 셀 SW×SH 실제 픽셀). 외형이 바뀌면 자동으로 다시 만든다. */
export function getSheet(char) {
  const sig = sigOf(char), hit = cache.get(char.id);
  if (hit && hit.sig === sig) return hit.cv;
  const cv = document.createElement('canvas'); cv.width = SW * 3; cv.height = SH * 4;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  const accent = DEPT[char.dept].color;
  DIRS.forEach((dir, di) => { for (let f = 0; f < 3; f++) c.drawImage(cellCanvas(dir, f, char.look, accent, char.weapon, hasWings(char)), f * SW, di * SH); });
  cache.set(char.id, { sig, cv });
  return cv;
}
/** 시트에서 (프레임, 방향) 한 칸을 월드/화면에 그린다. (x, y)는 몸 기준점이 아니라 셀의 왼쪽 위 — 논리 좌표 */
export function drawCellAt(g, char, frame, dir, x, y) { g.drawImage(getSheet(char), frame * SW, DIR_INDEX[dir] * SH, SW, SH, x - PAD, y - PAD, CW + PAD * 2, CH + PAD * 2); }

/** 미리보기용: 임의의 외형(머리/색/무기)으로 한 칸을 SW×SH 픽셀 캔버스에 그린다. */
export function drawPreview(ctx, char, { dir = 'down', frame = 0, hairStyle, hair, weapon, ab } = {}) {
  const look = { ...char.look, hairStyle: hairStyle ?? char.look.hairStyle, hair: hair ?? char.look.hair };
  ctx.drawImage(cellCanvas(dir, frame, look, DEPT[char.dept].color, weapon === undefined ? char.weapon : weapon, hasWings({ ab: ab ?? char.ab })), 0, 0);
}

export function drawShadow(ctx, x, y) {   // 반 칸 단위의 부드러운 타원 그림자
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x - 6, y - 0.5, 12, 1.5); ctx.fillRect(x - 5, y - 1.5, 10, 3.5);
  ctx.fillStyle = 'rgba(0,0,0,.26)'; ctx.fillRect(x - 5, y - 0.5, 10, 1.5); ctx.fillRect(x - 4, y - 1, 8, 2.5);
}
