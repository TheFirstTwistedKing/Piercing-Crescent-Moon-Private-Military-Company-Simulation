// 머리카락 2배 해상도 생성기(실제 픽셀 단위). 머리 크기는 첨부 도트 비율(큰 머리)에 맞춰 x 8..23, y 4..21 로 잡았다.
// 스타일마다 정수리·앞머리·옆머리·뒷머리·묶음을 픽셀 단위로 쌓고, 뿌리→끝 그라데이션 + 위쪽 광택 + 가닥 무늬 + 아래쪽 그림자를 칠한다.
// 좌표는 몸 기준 실제 픽셀(논리 칸 ×2). P(색, x, y, w, h) 로 그린다.
import { SHEET_HAIR } from './hair-sheets.js';
import { SILVER_HAIR } from './hair-silver.js';
SHEET_HAIR.e1 = SILVER_HAIR;   // 은발 원본: 사진 1 은발 걷기 시트에서 떼어 낸 도안(프레임별 위치 고정)
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const shade = (c, d) => toHex(hex(c).map((v) => v + d));

class Grid {
  constructor() { this.m = new Map(); this.mark = new Map(); }
  k(x, y) { return y * 1000 + x; }
  has(x, y) { return this.m.has(this.k(x, y)); }
  set(x, y) { if (y < 0 || x < 0 || x > 31) return; this.m.set(this.k(x, y), [x, y]); }   // 셀 밖(외곽선 여유 포함)으로 나가는 픽셀은 버린다
  del(x, y) { this.m.delete(this.k(x, y)); this.mark.delete(this.k(x, y)); }
  rect(x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y); }
  cut(x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.del(x, y); }
  ell(cx, cy, rx, ry) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x - cx) / (rx + 0.4), dy = (y - cy) / (ry + 0.4); if (dx * dx + dy * dy <= 1) this.set(x, y); } }
  dark(x, y, kind = 'sh') { if (this.has(x, y)) this.mark.set(this.k(x, y), kind); }
  line(x, y0, y1, kind = 'sh') { for (let y = y0; y <= y1; y++) this.dark(x, y, kind); }
}

/* ── 스타일 사양 정규화: 기본 20종(k)은 v2 와 같은 매개변수 꼴로 바꾼다. ── */
const BASE = {
  m1: { top: 'flat' }, m2: { top: 'flat', sl: 2 }, m3: { top: 'part', sl: 1 }, m4: { top: 'slick', lift: 1, fr: 'straight' }, m5: { top: 'spike' }, m6: { top: 'mohawk' },
  m7: { top: 'flat', sl: 3, bk: 8 }, m8: { top: 'flat', sl: 1, tail: { t: 'pony', n: 4 } }, m9: { top: 'bald' }, m10: { top: 'afro' },
  f1: { top: 'flat', fr: 'straight', sl: 4, bk: 4 }, f2: { top: 'flat', sl: 3, bk: 10 }, f3: { top: 'flat', sl: 1, tail: { t: 'pony', n: 8 } }, f4: { top: 'flat', sl: 1, tail: { t: 'twin', n: 8 } },
  f5: { top: 'flat', sl: 1, tail: { t: 'bun' } }, f6: { top: 'flat', sl: 2, tail: { t: 'braid', n: 9 } }, f7: { top: 'flat', fr: 'straight', sl: 1 }, f8: { top: 'flat', sl: 3, bk: 9, wave: true },
  f9: { top: 'flat', sl: 1, tail: { t: 'sidepony', n: 9 } }, f10: { top: 'flat', fr: 'straight', sl: 8, bk: 7 },
};

/** 정수리 윤곽 — 앞/뒤 공통(좌우 대칭). 위쪽으로 솟는 부분은 top 종류와 lift 로 정한다. */
function crown(g, o, view) {
  const top = o.top || 'flat', lift = o.lift || 0;
  const base = (y0) => { g.rect(11, y0, 20, y0); g.rect(9, y0 + 1, 22, y0 + 1); g.rect(8, y0 + 2, 23, y0 + 6); };
  if (top === 'bald') { g.rect(11, 7, 20, 7); g.rect(10, 8, 21, 9); for (const [x, y] of [...g.m.values()]) g.mark.set(g.k(x, y), 'stub'); return; }
  if (top === 'afro') { g.ell(15.5, 8.5, 11.5, 8.5); return; }
  if (top === 'puff') { g.ell(15.5, 7.5, 10.5, 5.5); g.rect(7, 7, 24, 11); return; }
  base(4);
  if (top === 'buzz') { g.cut(8, 4, 23, 5); g.rect(10, 6, 21, 6); g.rect(9, 7, 22, 9); for (const [x, y] of [...g.m.values()]) g.mark.set(g.k(x, y), 'stub'); return; }
  if (top === 'quiff') { g.rect(11, 3, 21, 3); g.rect(11, 2, 20, 2); g.rect(12, 1, 19, 1); if (lift > 2) g.rect(13, 0, 18, 0); }
  if (top === 'pomp') for (let i = 1; i <= lift * 2; i++) g.rect(9 + Math.ceil(i / 2), 4 - i, 22 - Math.ceil(i / 2), 4 - i);
  if (top === 'slick' && lift) { g.rect(10, 3, 21, 3); g.rect(12, 2, 19, 2); }
  if (top === 'crest') { for (const x of [9, 10]) g.rect(x, 2, x, 3); g.rect(14, 1, 17, 3); g.rect(21, 2, 22, 3); g.rect(12, 3, 13, 3); g.rect(18, 3, 20, 3); }
  if (top === 'tufts') { g.rect(9, 0, 12, 3); g.rect(19, 0, 22, 3); g.rect(10, 0, 11, 0); g.cut(9, 0, 9, 0); g.cut(22, 0, 22, 0); }
  if (top === 'spike') { for (const [x0, x1, y0] of [[8, 9, 1], [11, 12, 0], [15, 16, -1], [19, 20, 0], [22, 23, 1]]) g.rect(x0, y0, x1, 3); }
  if (top === 'mohawk') { g.cut(8, 4, 23, 11); g.rect(14, 0, 17, 10); g.rect(13, 4, 18, 10); g.rect(9, 6, 12, 10); g.rect(19, 6, 22, 10); for (const [x, y] of [...g.m.values()]) if (x < 14 || x > 17) g.mark.set(g.k(x, y), 'stub'); }
  if (top === 'part') g.line(view === 'down' ? 18 : 15, 4, 8, 'dsh');
}

/** 앞모습 */
function front(g, o) {
  crown(g, o, 'down');
  const top = o.top || 'flat';
  if (top === 'mohawk' || top === 'bald' || top === 'afro') { if (top === 'afro') g.rect(5, 12, 7, 19); return; }
  if (top === 'buzz') return;
  g.rect(8, 7, 23, top === 'slick' ? 9 : 10);                                    // 이마 위 머리선
  const fr = o.fr;
  if (fr === 'straight') { g.rect(8, 11, 23, 12); g.rect(9, 13, 10, 13); g.rect(21, 13, 22, 13); }
  else if (fr === 'side') { g.rect(8, 11, 19, 12); g.rect(8, 13, 11, 14); g.rect(8, 15, 9, 15); }
  else if (fr === 'curtain') { g.rect(8, 11, 12, 14); g.rect(19, 11, 23, 14); g.rect(13, 11, 18, 11); g.rect(10, 15, 11, 15); g.rect(20, 15, 21, 15); }
  else if (fr === 'sheer') { for (let x = 8; x <= 23; x += 2) { g.set(x, 11); g.set(x + 1 > 23 ? 23 : x + 1, 12); } }
  else if (fr === 'comma') { g.rect(13, 11, 16, 12); g.rect(14, 13, 15, 14); g.set(15, 15); g.rect(17, 11, 17, 11); }
  const sl = (o.sl || 0) * 2, bk = (o.bk || 0) * 2;
  if (sl > 0) { g.rect(8, 11, 9, 11 + sl); g.rect(22, 11, 23, 11 + sl); if (o.jag) { g.cut(8, 11 + sl, 8, 11 + sl); g.cut(23, 11 + sl, 23, 11 + sl); } }
  if (bk > 0) { g.rect(6, 12, 7, 12 + bk); g.rect(24, 12, 25, 12 + bk); if (o.jag) { g.cut(6, 12 + bk, 6, 12 + bk); g.cut(25, 12 + bk, 25, 12 + bk); } if (o.wave) { g.cut(6, 14 + bk / 2, 6, 15 + bk / 2); g.set(5, 16); g.set(5, 17); g.set(26, 19); g.set(26, 20); } }
  if (o.flare) { g.rect(4, 14, 5, 14 + o.flare * 2 + bk / 2); g.rect(26, 14, 27, 14 + o.flare * 2 + bk / 2); }
  const t = o.tail, n = (t?.n || 0) * 2;
  if (t) {
    if (t.t === 'pony') { g.rect(24, 8, 27, 8 + n); g.dark(24, 8, 'sh'); for (let x = 24; x <= 27; x++) g.dark(x, 9, 'dsh'); g.cut(27, 8 + n, 27, 8 + n); }
    else if (t.t === 'low') { g.rect(24, 15, 27, 15 + n); for (let x = 24; x <= 27; x++) g.dark(x, 16, 'dsh'); }
    else if (t.t === 'sidepony') { g.rect(24, 6, 27, 6 + n); for (let x = 24; x <= 27; x++) g.dark(x, 7, 'dsh'); g.cut(27, 6 + n, 27, 6 + n); }
    else if (t.t === 'twin') { g.rect(4, 11, 7, 11 + n); g.rect(24, 11, 27, 11 + n); for (const x0 of [4, 24]) for (let x = x0; x < x0 + 4; x++) g.dark(x, 12, 'dsh'); }
    else if (t.t === 'sbun') { g.ell(7.5, 5.5, 3, 3); g.ell(23.5, 5.5, 3, 3); }
    else if (t.t === 'tbun') { g.ell(15.5, 1.5, 3, 3); g.rect(13, 3, 18, 4); }
    else if (t.t === 'bun2') { g.ell(15.5, 1.5, 5.5, 3.5); }
    else if (t.t === 'bun') { g.ell(15.5, 1.5, 4.5, 3); g.rect(12, 3, 19, 4); }
    else if (t.t === 'halfup') { g.ell(15.5, 3.5, 2.5, 2); }
    else if (t.t === 'dbraid') { for (const x0 of [5, 24]) { g.rect(x0, 10, x0 + 2, 10 + n); for (let y = 14; y < 10 + n; y += 4) for (let x = x0; x <= x0 + 2; x++) g.dark(x, y, 'dsh'); } }
    else if (t.t === 'braid') { g.rect(24, 10, 26, 10 + n); for (let y = 14; y < 10 + n; y += 4) for (let x = 24; x <= 26; x++) g.dark(x, y, 'dsh'); }
    else if (t.t === 'sbraid') { g.rect(5, 10, 7, 10 + n); for (let y = 14; y < 10 + n; y += 4) for (let x = 5; x <= 7; x++) g.dark(x, y, 'dsh'); }
    else if (t.t === 'dread') { for (const [x, d] of [[5, 0], [7, 3], [24, 3], [26, 0]]) g.rect(x, 11, x + 1, 11 + n - d); }
    else if (t.t === 'queue') { for (const y of [8, 9, 10, 11, 12]) { g.dark(8, y, 'dsh'); g.dark(9, y, 'dsh'); g.dark(22, y, 'dsh'); g.dark(23, y, 'dsh'); } }
  }
}

/** 뒷모습: 머리 뒤쪽이 통째로 머리카락 */
function back(g, o) {
  crown(g, o, 'up');
  const top = o.top || 'flat', bk = (o.bk || 0) * 2, t = o.tail, n = (t?.n || 0) * 2;
  if (top === 'mohawk') { g.rect(9, 6, 22, 16); g.rect(10, 17, 21, 18); for (const [x, y] of [...g.m.values()]) g.mark.set(g.k(x, y), 'stub'); g.rect(14, -2, 17, 19); for (let y = -2; y <= 19; y++) for (const x of [14, 15, 16, 17]) g.mark.delete(g.k(x, y)); return; }
  if (top === 'bald') { g.rect(11, 6, 20, 6); g.rect(9, 7, 22, 16); g.rect(10, 17, 21, 18); for (const [x, y] of [...g.m.values()]) g.mark.set(g.k(x, y), 'stub'); return; }
  if (top === 'afro') { g.ell(15.5, 10, 11.5, 10); return; }
  if (top === 'buzz') { g.cut(8, 4, 23, 20); g.rect(11, 5, 20, 5); g.rect(9, 6, 22, 16); g.rect(10, 17, 21, 18); for (const [x, y] of [...g.m.values()]) g.mark.set(g.k(x, y), 'stub'); if (t?.t === 'queue') { g.rect(14, 8, 17, 20 + n + 4); for (let y = 24; y < 20 + n + 4; y += 4) for (let x = 14; x <= 17; x++) g.dark(x, y, 'dsh'); } return; }
  g.rect(8, 7, 23, 17); g.rect(9, 18, 22, 18); g.rect(10, 19, 21, 19); g.rect(11, 20, 20, 20);
  if (bk > 0) { g.rect(8, 18, 23, 20 + bk); if (o.jag) for (const x of [8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23]) g.cut(x, 20 + bk, x, 20 + bk); if (o.wave) { g.cut(8, 20 + bk / 2, 8, 21 + bk / 2); g.cut(23, 22 + bk / 2, 23, 23 + bk / 2); } }
  if (o.flare) { g.rect(5, 16, 7, 18 + o.flare * 2 + bk / 2); g.rect(24, 16, 26, 18 + o.flare * 2 + bk / 2); }
  if (t) {
    if (t.t === 'pony') { g.rect(14, 12, 17, 12 + n); for (let x = 14; x <= 17; x++) g.dark(x, 13, 'dsh'); }
    else if (t.t === 'low') { g.rect(14, 20, 17, 20 + n); for (let x = 14; x <= 17; x++) g.dark(x, 21, 'dsh'); }
    else if (t.t === 'sidepony') { g.rect(22, 10, 25, 10 + n); for (let x = 22; x <= 25; x++) g.dark(x, 11, 'dsh'); }
    else if (t.t === 'twin') { g.rect(4, 11, 7, 11 + n); g.rect(24, 11, 27, 11 + n); for (const x0 of [4, 24]) for (let x = x0; x < x0 + 4; x++) g.dark(x, 12, 'dsh'); }
    else if (t.t === 'sbun') { g.ell(7.5, 5.5, 3, 3); g.ell(23.5, 5.5, 3, 3); }
    else if (t.t === 'tbun') { g.ell(15.5, 1.5, 3, 3); g.rect(13, 3, 18, 4); }
    else if (t.t === 'bun2') { g.ell(15.5, 1.5, 5.5, 3.5); }
    else if (t.t === 'bun') { g.ell(15.5, 1.5, 4.5, 3); g.rect(12, 3, 19, 4); }
    else if (t.t === 'halfup') { g.ell(15.5, 3.5, 2.5, 2); g.rect(8, 18, 23, 24); }
    else if (t.t === 'dbraid') { for (const x0 of [5, 24]) { g.rect(x0, 14, x0 + 2, 14 + n); for (let y = 18; y < 14 + n; y += 4) for (let x = x0; x <= x0 + 2; x++) g.dark(x, y, 'dsh'); } }
    else if (t.t === 'braid') { g.rect(14, 16, 17, 16 + n + 2); for (let y = 20; y < 16 + n; y += 4) for (let x = 14; x <= 17; x++) g.dark(x, y, 'dsh'); }
    else if (t.t === 'sbraid') { g.rect(5, 14, 7, 14 + n - 4); for (let y = 18; y < 10 + n; y += 4) for (let x = 5; x <= 7; x++) g.dark(x, y, 'dsh'); }
    else if (t.t === 'dread') { for (const [x, d] of [[8, 0], [11, 3], [20, 3], [23, 0]]) g.rect(x, 19, x + 1, 19 + n - d); }
    else if (t.t === 'queue') { g.rect(14, 8, 17, 20 + n + 4); for (let y = 24; y < 20 + n + 4; y += 4) for (let x = 14; x <= 17; x++) g.dark(x, y, 'dsh'); for (const y of [8, 9, 10, 11, 12, 13]) { for (const x of [8, 9, 10, 21, 22, 23]) g.dark(x, y, 'dsh'); } }
  }
}

/** 옆모습(오른쪽 보기): 얼굴 앞쪽이 x≈23, 머리 뒤쪽이 x≈8 */
function side(g, o) {
  const top = o.top || 'flat', lift = o.lift || 0, sl = (o.sl || 0) * 2, bk = (o.bk || 0) * 2, t = o.tail, n = (t?.n || 0) * 2;
  if (top === 'bald') { g.rect(10, 7, 21, 8); g.rect(10, 9, 14, 12); for (const [x, y] of [...g.m.values()]) g.mark.set(g.k(x, y), 'dsh'); return; }
  if (top === 'afro') { g.ell(14.5, 8.5, 10.5, 8.5); g.rect(6, 10, 9, 18); return; }
  if (top === 'mohawk') { g.rect(11, -2, 18, 10); g.rect(8, 5, 22, 9); for (const [x, y] of [...g.m.values()]) if (y > 3 && (x < 11 || x > 18)) g.mark.set(g.k(x, y), 'dsh'); g.rect(8, 10, 12, 14); return; }
  if (top === 'puff') { g.ell(14.5, 7, 10, 5.5); g.rect(6, 7, 23, 10); }
  else { g.rect(10, 4, 19, 4); g.rect(8, 5, 21, 5); g.rect(8, 6, 23, 10); }
  if (top === 'buzz') { g.cut(8, 4, 23, 5); g.rect(10, 6, 21, 7); g.cut(8, 8, 23, 10); g.rect(8, 8, 20, 9); for (const [x, y] of [...g.m.values()]) g.mark.set(g.k(x, y), 'stub'); g.rect(8, 10, 12, 15); if (t?.t === 'queue') { g.rect(5, 8, 8, 14 + n); for (let y = 16; y < 14 + n; y += 4) for (let x = 5; x <= 8; x++) g.dark(x, y, 'dsh'); } return; }
  if (top === 'quiff') { g.rect(11, 3, 22, 3); g.rect(12, 2, 22, 2); g.rect(14, 1, 21, 1); if (lift > 2) g.rect(16, 0, 21, 0); }
  if (top === 'pomp') for (let i = 1; i <= lift * 2; i++) g.rect(11, 4 - i, 21, 4 - i);
  if (top === 'slick' && lift) { g.rect(10, 3, 20, 3); g.rect(12, 2, 19, 2); }
  if (top === 'crest') { g.rect(9, 2, 10, 3); g.rect(14, 1, 17, 3); g.rect(20, 2, 21, 3); }
  if (top === 'tufts') { g.rect(10, 0, 13, 3); g.rect(16, 0, 19, 3); }
  if (top === 'spike') { for (const [x0, x1, y0] of [[8, 9, 2], [12, 13, 0], [17, 18, 0], [21, 22, 2]]) g.rect(x0, y0, x1, 3); }
  if (top === 'part') g.line(16, 4, 8, 'dsh');
  // 얼굴 앞쪽 앞머리
  const fr = o.fr;
  if (fr === 'straight') { g.rect(14, 11, 23, 12); } else if (fr === 'side') { g.rect(12, 11, 23, 12); g.rect(12, 13, 17, 13); } else if (fr === 'curtain') { g.rect(15, 11, 23, 12); g.rect(15, 13, 20, 14); } else if (fr === 'sheer') { for (let x = 15; x <= 23; x += 2) g.set(x, 11); for (let x = 16; x <= 23; x += 2) g.set(x, 12); } else if (fr === 'comma') { g.rect(19, 11, 22, 12); g.rect(20, 13, 21, 14); }
  // 머리 뒤쪽·귀 옆
  g.rect(8, 11, 14, 16); g.rect(8, 17, 13, 17); g.rect(9, 18, 12, 19);
  if (sl > 0) g.rect(14, 11, 16, 11 + Math.min(sl, 8));
  if (bk > 0) { g.rect(6, 12, 13, 18 + bk); if (o.jag) for (const x of [6, 8, 10, 12]) g.cut(x, 18 + bk, x, 18 + bk); if (o.wave) { g.cut(6, 16 + bk / 2, 7, 17 + bk / 2); g.set(5, 20); } }
  if (o.flare) g.rect(4, 14, 6, 18 + bk + o.flare * 2);
  if (t) {
    if (t.t === 'pony') { g.rect(4, 8, 8, 8 + n); for (let x = 4; x <= 8; x++) g.dark(x, 9, 'dsh'); }
    else if (t.t === 'low') { g.rect(4, 16, 8, 16 + n); for (let x = 4; x <= 8; x++) g.dark(x, 17, 'dsh'); }
    else if (t.t === 'sidepony') { g.rect(6, 8, 10, 8 + n); for (let x = 6; x <= 10; x++) g.dark(x, 9, 'dsh'); }
    else if (t.t === 'twin') { g.rect(5, 12, 10, 12 + n); for (let x = 5; x <= 10; x++) g.dark(x, 13, 'dsh'); }
    else if (t.t === 'sbun') g.ell(9.5, 5.5, 3, 3);
    else if (t.t === 'tbun') g.ell(13.5, 1.5, 3, 3);
    else if (t.t === 'bun2') g.ell(13.5, 1.5, 5, 3.5);
    else if (t.t === 'bun') g.ell(13.5, 1.5, 4.5, 3);
    else if (t.t === 'halfup') { g.ell(12.5, 3.5, 2.5, 2); g.rect(6, 12, 13, 24); }
    else if (t.t === 'dbraid') { g.rect(6, 12, 9, 12 + n); for (let y = 16; y < 12 + n; y += 4) for (let x = 6; x <= 9; x++) g.dark(x, y, 'dsh'); }
    else if (t.t === 'braid') { g.rect(5, 12, 8, 14 + n); for (let y = 16; y < 14 + n; y += 4) for (let x = 5; x <= 8; x++) g.dark(x, y, 'dsh'); }
    else if (t.t === 'sbraid') { g.rect(8, 14, 11, 14 + n - 4); for (let y = 18; y < 10 + n; y += 4) for (let x = 8; x <= 11; x++) g.dark(x, y, 'dsh'); }
    else if (t.t === 'dread') { for (const [x, d] of [[6, 0], [8, 3], [10, 5]]) g.rect(x, 14, x + 1, 14 + n - d); }
    else if (t.t === 'queue') { g.rect(5, 8, 8, 14 + n); for (let y = 16; y < 14 + n; y += 4) for (let x = 5; x <= 8; x++) g.dark(x, y, 'dsh'); }
  }
}

const STYLES = (HAIR_STYLES) => HAIR_STYLES;
/** 스타일 사양(o) → 그릴 수 있는 격자 */
export function hairGrid(view, style) {
  const o = style.v2 || BASE[style.id] || BASE.m1, g = new Grid();
  (view === 'down' ? front : view === 'up' ? back : side)(g, o);
  return { g, o };
}

/** P(색, x, y, w, h): 실제 픽셀 사각형. 뿌리 col → 끝 tip 그라데이션은 y 가 아래일수록 tip 에 가깝게. */
const LV = [-66, -38, 0, 26, 54], LV_SILVER = [-85, -26, 0, 50, 85];   // e1 은 원본 회색 단계(#555 #909090 #aaa #dcdcdc #fff)를 기본색 #aaaaaa 에서 그대로 재현   // 템플릿 도안의 명도 단계(0 외곽선 … 4 광택) → 머리색 기준 밝기 변화
/** 템플릿 시트 도안: 머리 중앙 x16(옆모습 15.5)에 가로 중심을 맞추고 정수리 y3 에 윗면을 맞춘다. */
function drawSheetHair(P, view, style, col, tip, box) {
  const sp = SHEET_HAIR[style.sheet]?.[view] || (view === 'sideL' ? SHEET_HAIR[style.sheet]?.side : null); if (!sp || !sp.length) return;
  const anchored = style.anchored && box && box.ax !== undefined, LVs = style.anchored ? LV_SILVER : LV;
  const w = Math.max(...sp.map((r) => r.length)), x0 = anchored ? box.ax : Math.round(((box ? box.x0 + box.x1 + 1 : 32) / 2) - w / 2) + (style.dx || 0), y0 = anchored ? box.ay : 3 + (box ? box.top - 5 : 0) + (style.dy || 0), c0 = hex(col), t0 = tip ? hex(tip) : null;
  sp.forEach((row, j) => {
    const y = y0 + j; if (y < 0 || y > 47) return;
    const cell = (i) => { const ch = row[i]; if (ch === undefined || ch === '.') return null; const base = t0 ? (() => { const t = Math.max(0, Math.min(1, (y - 6) / 14)), tt = t * t * (3 - 2 * t); return c0.map((v, k) => v + (t0[k] - v) * tt); })() : c0; return toHex(base.map((v) => v + LVs[+ch])); };
    let i = 0; while (i < row.length) { const c = cell(i); if (!c) { i++; continue; } let e = i; while (e + 1 < row.length && cell(e + 1) === c) e++; const xa = x0 + i, xb = x0 + e; if (xb >= 0 && xa <= 31) P(c, Math.max(0, xa), y, Math.min(31, xb) - Math.max(0, xa) + 1, 1); i = e + 1; }
  });
}


/** 입체감 칠하기 — 머리 덩어리를 '둥근 물체'로 보고 왼쪽 위에서 빛이 온다고 가정해 칠한다(참고 도안처럼 깨끗한 몇 개의 면).
 *  ① 바깥 윤곽선(가장 어두움) ② 빛 장(정수리 곡면 + 위쪽) − 그림자 장(아래 · 오른쪽)을 5단계 톤으로 끊고, 단계 경계에서만 1칸 디더링
 *  ③ 정수리에서 퍼지는 가닥 덩어리: 어긋나게 끊긴 어두운 가닥 선 + 선 옆 밝은 마루 ④ 끝 가닥을 길이가 다르게 깎아 갈라진 끝 ⑤ 어두운 머리색은 하이라이트를 키우고 그림자를 줄임 */
const TONE = [-46, -24, 0, 20, 44];
function formShade(g, bx, mid, c0) {
  const luma = (c0[0] * 0.3 + c0[1] * 0.59 + c0[2] * 0.11), dark = luma < 80, bright = luma > 200, hi = dark ? 1.7 : bright ? 0.8 : 1, lo = dark ? 0.45 : bright ? 1.15 : 1;
  const has = (x, y) => g.has(x, y), hs = (n) => { let h = (n * 374761393) >>> 0; h = ((h ^ (h >> 13)) * 1274126177) >>> 0; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };
  let pts = [...g.m.values()]; const out = new Map(); if (!pts.length) return out;
  let x0 = 99, x1 = -1, y0 = 99, y1 = -1; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const cx = (bx.x0 + bx.x1 + 1) / 2, hw = Math.max(6, (x1 - x0) / 2 + 1), H = Math.max(6, y1 - y0 + 1), flow = (x, y) => x + Math.round(((x + 0.5 - cx) / hw) * (y - y0) * 0.24);
  // 끝 가닥: 긴 머리 아래쪽 끝을 가닥(4칸 폭)마다 길이를 달리 깎는다
  for (const [x, y] of pts) { if (g.mark.get(g.k(x, y)) === 'stub' || has(x, y + 1) || (y - y0) / H < 0.3) continue; const gr = Math.floor(flow(x, y) / 4), r = hs(gr * 7 + 3), lowEdge = (y - y0) / H >= 0.72; if (r < (lowEdge ? 0.3 : 0.2) && has(x, y - 1) && has(x, y - 2) && has(x, y - 3)) { g.del(x, y); if (lowEdge && r < 0.1 && has(x, y - 2) && has(x, y - 3) && has(x, y - 4)) g.del(x, y - 1); } }
  pts = [...g.m.values()];
  const dist = new Map(); let frontier = [];
  for (const [x, y] of pts) if (!has(x - 1, y) || !has(x + 1, y) || !has(x, y - 1) || !has(x, y + 1)) { dist.set(g.k(x, y), 0); frontier.push([x, y]); }
  for (let d = 1; d <= 3; d++) { const nx = []; for (const [x, y] of frontier) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = g.k(x + dx, y + dy); if (has(x + dx, y + dy) && !dist.has(k)) { dist.set(k, d); nx.push([x + dx, y + dy]); } } frontier = nx; }
  // 면 나누기: 정수리 캡(밝음) · 본체 · 아래/오른쪽 그림자 + 왼쪽 위 하이라이트 덩어리. 경계 1칸만 체크무늬 디더링(sdf = 경계까지의 칸 수, 양수 = 안쪽)
  const mixBy = (sdf, x, y) => (sdf > 0.7 ? 1 : sdf < -0.7 ? 0 : ((x + y) & 1) ? 1 : 0);
  for (const [x, y] of pts) {
    const k = g.k(x, y), mk = g.mark.get(k), d = dist.get(k) ?? 4, u = (x + 0.5 - cx) / hw, v = (y - y0) / H, above = !has(x, y - 1), left = !has(x - 1, y), below = !has(x, y + 1), rightE = !has(x + 1, y);
    let off = 0;
    {
      let lv = 2;                                                                    // 0..4 = 가장 어두움 ~ 가장 밝음, 2 = 기본색
      const capB = (0.3 - 0.1 * u - v) * H, shB = (v - (0.64 - 0.12 * u)) * H, sideB = (u - 0.58) * hw;
      if (mixBy(capB, x, y)) lv = 3;
      if (mixBy(-shB, x, y) === 0 || mixBy(-sideB, x, y) === 0) lv = 1;
      const px = (u + 0.36) / 0.3, py = (v - 0.2) / 0.16;
      if (px * px + py * py < 1) lv = 4;                                              // 하이라이트 덩어리
      if (d === 1 && lv <= 2 && (v > 0.45 || u > 0.35)) lv = 0;                       // 윤곽 안쪽 어두운 띠(아래·오른쪽)
      off = TONE[lv] * (lv >= 3 ? hi : lo) * (mk === 'stub' ? 0.6 : 1);
      if (mk === 'stub') off += hs(x * 31 + y) < 0.3 ? 8 * hi : -8 * lo;            // 짧은 머리: 결 대신 까끌한 점
      // 가닥: 4칸 폭 덩어리 — 어긋나게 끊긴 어두운 선(앞 5칸 선 · 2칸 쉼) + 선 옆 밝은 마루
      const sx = flow(x, y), m4 = ((sx % 4) + 4) % 4, gi = Math.floor(sx / 4), phase = (y - y0 + gi * 3) % 7;
      if (mk !== 'stub' && v > 0.22 && d >= 1) { if (m4 === 0 && phase < 5) off -= 26 * lo; else if (m4 === 1 && lv >= 2 && phase < 5) off += 14 * hi; }
      if (mk === 'dsh') off -= 46 * lo; else if (mk === 'sh') off -= 26 * lo;       // 가르마·구분선
    }
    if (d === 0) off = mk === 'stub' ? -52 * lo : (above || left) && v < 0.5 && u < 0.2 ? -38 * lo : -96 * lo - (below || rightE ? 10 : 0);   // 윤곽: 왼쪽 위는 약한 림 라이트, 나머지는 거의 검정
    out.set(k, [x, y, toHex(mid(x, y).map((c) => c + off))]);
  }
  return out;
}

/** 실루엣 다듬기 — rect 로 쌓은 네모난 덩어리를 둥글게: ① 위쪽 모서리를 두 번 깎아 돔 모양 ② 큰 덩어리의 아래쪽 모서리 한 번 ③ 정수리·앞머리 끝에 잔머리 1칸. (가는 가닥은 건드리지 않는다) */
function sculpt(g, view) {
  const has = (x, y) => g.has(x, y), hs = (n) => { let h = (n * 2246822519) >>> 0; h = ((h ^ (h >> 15)) * 3266489917) >>> 0; return ((h ^ (h >> 13)) >>> 0) / 4294967296; };
  let pts = [...g.m.values()]; if (pts.length < 30) return;
  let y0 = 99, y1 = -1; for (const [, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); } const H = Math.max(6, y1 - y0 + 1);
  const runH = (x, y) => { let a = x, b = x; while (has(a - 1, y)) a--; while (has(b + 1, y)) b++; return b - a + 1; }, runV = (x, y) => { let a = y, b = y; while (has(x, a - 1)) a--; while (has(x, b + 1)) b++; return b - a + 1; };
  const pass = (topMinRun, botMinRun) => {
    const del = [];
    for (const [x, y] of g.m.values()) {
      const up = has(x, y - 1), dn = has(x, y + 1), l = has(x - 1, y), r = has(x + 1, y), vt = (y - y0) / H;
      if (!up && dn && ((!l && r) || (!r && l)) && runH(x, y) >= topMinRun && runV(x, y) >= 3) del.push([x, y]);
      else if (botMinRun && !dn && up && ((!l && r) || (!r && l)) && vt > 0.5 && runH(x, y) >= botMinRun && runV(x, y) >= 5) del.push([x, y]);
    }
    for (const [x, y] of del) g.del(x, y);
  };
  pass(4, 6); pass(5, 0); if (view !== 'side') pass(9, 0);
  // 앞머리 끝 흐름: 한쪽(왼쪽)은 길게 내려오고 반대쪽은 짧게 쓸어올린 비대칭 + 끝을 뾰족하게 — 앞모습/옆모습만
  if (view !== 'up') {
    const cxm = view === 'down' ? 15.5 : 17, sw = view === 'down' ? 1 : -1;
    for (const [x, y] of [...g.m.values()]) {
      if (has(x, y + 1) || !has(x, y - 1) || y > 12 || y < 8) continue;
      const delta = Math.round(1.7 * sw * (cxm - (x + 0.5)) / 7);          // +: 길게, −: 짧게
      if (delta >= 1 && y + 1 <= 12 && runV(x, y) >= 3) g.set(x, y + 1);
      else if (delta <= -1 && runV(x, y) >= 4) { g.del(x, y); if (delta <= -2 && has(x, y - 1) && runV(x, y - 1) >= 4) g.del(x, y - 1); }
    }
  }
  // 잔머리: 정수리 윗선 · 앞머리 끝에 1칸 삐져나온 가닥
  pts = [...g.m.values()]; const add = [];
  for (const [x, y] of pts) {
    const vt = (y - y0) / H;
    if (!has(x, y - 1) && y > 0 && vt < 0.2 && runH(x, y) >= 4 && has(x, y + 1) && hs(x * 13 + y * 7) < 0.2) add.push([x, y - 1]);
    if (!has(x, y + 1) && vt > 0.35 && vt < 0.75 && y + 1 <= 11 && has(x, y - 1) && has(x, y - 2) && runH(x, y) >= 3 && hs(x * 5 + y * 11) < 0.24) add.push([x, y + 1]);
  }
  for (const [x, y] of add) g.set(x, y);
}

export function drawHair3(P, view, style, col, tip, box) {
  if (style.sheet) return drawSheetHair(P, view, style, col, tip, box);
  const { g: vg } = hairGrid(view, style), c0 = hex(col), t0 = tip ? hex(tip) : null;
  // 설계 공간(머리 x8..23, 피부 y7..21)을 템플릿 머리로 옮긴다. 가로: 설계 x8..24 → 실제 앞/뒤 x9..23, 옆 x9..23.
  // 세로는 템플릿 눈높이에 맞춘 구간별 변환: 정수리(설계 y4→2.5) · 피부 윗면(7→5) · 앞머리 끝(10→11, 눈썹 바로 위) · 턱(21→17.5).
  // (설계 앞머리선 y10 이 템플릿 눈썹 y12 바로 위 y11 에 오도록 해서 이마가 드러나 머리가 뜨는 일이 없게 한다.)
  const bx = box || { x0: 10, x1: 22, top: 5 }, dy = bx.top - 5, X0 = bx.x0 - 1, SX = (bx.x1 + 1 - X0) / 16, KN = [[4, 2.5 + dy], [7, 5 + dy], [10, 11 + dy], [21, 17.5 + dy]], g = new Grid();   // 머리 상자(box)에 맞춘 변환
  const toV = (t) => { if (t <= KN[0][1]) return KN[0][0] + (t - KN[0][1]); for (let k = 0; k < KN.length - 1; k++) if (t < KN[k + 1][1]) return KN[k][0] + (t - KN[k][1]) * (KN[k + 1][0] - KN[k][0]) / (KN[k + 1][1] - KN[k][1]); return KN[3][0] + (t - KN[3][1]) / 0.9; };
  for (let ty = 0; ty < 48; ty++) for (let tx = 0; tx < 32; tx++) {
    const vx = Math.floor(8 + (tx + 0.5 - X0) / SX), vy = Math.floor(toV(ty + 0.5));
    if (vg.has(vx, vy)) { g.set(tx, ty); const mk = vg.mark.get(vg.k(vx, vy)); if (mk) g.mark.set(g.k(tx, ty), mk); }
  }
  const mid = (x, y) => { let rgb = c0; if (t0) { const t = Math.max(0, Math.min(1, (y - 6) / 14)), tt = t * t * (3 - 2 * t); rgb = c0.map((v, i) => v + (t0[i] - v) * tt); } return rgb; };
  sculpt(g, view);
  const out = formShade(g, bx, mid, c0);
  // 같은 줄에서 같은 색이 이어지면 한 사각형으로
  const rows = new Map(); for (const [x, y, c] of out.values()) { if (!rows.has(y)) rows.set(y, []); rows.get(y).push([x, c]); }
  for (const [y, list] of rows) { list.sort((a, b) => a[0] - b[0]); let i = 0; while (i < list.length) { let j = i; while (j + 1 < list.length && list[j + 1][0] === list[j][0] + 1 && list[j + 1][1] === list[i][1]) j++; P(list[i][1], list[i][0], y, j - i + 1, 1); i = j + 1; } }
}
