// 머리카락 스타일: 남성 24 + 여성 24 (기본 10+10, 확장 14+14). 16×24 스프라이트의 머리(x5..10, y3..8) 위에 그린다.
// 색은 임의의 hex — 명암은 색에서 자동 계산한다.
export function adj(hex, d) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, v + d));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
}

export const HAIR_STYLES = [
  { id: 'm1', g: 'm', name: '크롭', k: 'cap', rows: 2, side: 0 },
  { id: 'm2', g: 'm', name: '스포츠', k: 'cap', rows: 2, side: 2 },
  { id: 'm3', g: 'm', name: '가르마', k: 'cap', rows: 2, side: 1, part: true },
  { id: 'm4', g: 'm', name: '투블럭', k: 'cap', rows: 3, side: 0, top: true },
  { id: 'm5', g: 'm', name: '스파이크', k: 'spike' },
  { id: 'm6', g: 'm', name: '모히칸', k: 'mohawk' },
  { id: 'm7', g: 'm', name: '장발', k: 'cap', rows: 2, side: 3, back: 8 },
  { id: 'm8', g: 'm', name: '꽁지머리', k: 'pony', rows: 2, side: 1 },
  { id: 'm9', g: 'm', name: '삭발', k: 'bald' },
  { id: 'm10', g: 'm', name: '곱슬 아프로', k: 'afro' },
  { id: 'f1', g: 'f', name: '단발', k: 'cap', rows: 3, side: 4, back: 4, bangs: true },
  { id: 'f2', g: 'f', name: '긴 생머리', k: 'cap', rows: 2, side: 3, back: 10 },
  { id: 'f3', g: 'f', name: '포니테일', k: 'pony', rows: 2, side: 1, long: true },
  { id: 'f4', g: 'f', name: '트윈테일', k: 'twin', rows: 2, side: 1 },
  { id: 'f5', g: 'f', name: '똥머리', k: 'bun', rows: 2, side: 1 },
  { id: 'f6', g: 'f', name: '땋은 머리', k: 'braid', rows: 2, side: 2 },
  { id: 'f7', g: 'f', name: '숏컷', k: 'cap', rows: 3, side: 1, bangs: true },
  { id: 'f8', g: 'f', name: '웨이브 롱', k: 'cap', rows: 2, side: 3, back: 9, wave: true },
  { id: 'f9', g: 'f', name: '사이드 포니', k: 'sidepony', rows: 2, side: 1 },
  { id: 'f10', g: 'f', name: '히메컷', k: 'cap', rows: 3, side: 8, back: 7, bangs: true },
  // ── 확장 스타일: v2 설계(top 정수리 · lift 볼륨 · fr 앞머리 · sl 옆머리 길이 · bk 뒷머리 길이 · jag 들쭉날쭉한 끝 · flare 바깥으로 퍼짐 · tail 묶음/땋기) ──
  { id: 'm11', g: 'm', name: '올백', v2: { top: 'slick', lift: 1, sl: 1, bk: 2 } },
  { id: 'm12', g: 'm', name: '댄디컷', v2: { top: 'part', fr: 'side', sl: 2 } },
  { id: 'm13', g: 'm', name: '리젠트', v2: { top: 'quiff', lift: 3 } },
  { id: 'm14', g: 'm', name: '울프컷', v2: { top: 'flat', fr: 'straight', sl: 4, bk: 5, jag: 1 } },
  { id: 'm15', g: 'm', name: '드레드락', v2: { top: 'flat', tail: { t: 'dread', n: 7 } } },
  { id: 'm16', g: 'm', name: '맨번', v2: { top: 'slick', tail: { t: 'tbun' } } },
  { id: 'm17', g: 'm', name: '버즈컷', v2: { top: 'buzz' } },
  { id: 'm18', g: 'm', name: '포마드', v2: { top: 'pomp', lift: 2, sl: 1 } },
  { id: 'm19', g: 'm', name: '콤마 헤어', v2: { top: 'flat', fr: 'comma', sl: 3, bk: 2 } },
  { id: 'm20', g: 'm', name: '샤기컷', v2: { top: 'puff', fr: 'sheer', sl: 3, bk: 3, jag: 1 } },
  { id: 'm21', g: 'm', name: '변발', v2: { top: 'buzz', tail: { t: 'queue', n: 9 } } },
  { id: 'm22', g: 'm', name: '센터파트 장발', v2: { top: 'part', fr: 'curtain', sl: 6, bk: 9 } },
  { id: 'm23', g: 'm', name: '텍스처 크롭', v2: { top: 'crest' } },
  { id: 'm24', g: 'm', name: '쌍뿔', v2: { top: 'tufts' } },
  { id: 'f11', g: 'f', name: '레이어드 롱', v2: { top: 'part', fr: 'curtain', sl: 7, bk: 10, jag: 1 } },
  { id: 'f12', g: 'f', name: '허쉬컷', v2: { top: 'flat', fr: 'straight', sl: 5, bk: 6, jag: 1 } },
  { id: 'f13', g: 'f', name: '픽시컷', v2: { top: 'crest', fr: 'side' } },
  { id: 'f14', g: 'f', name: '시스루뱅 롱', v2: { top: 'flat', fr: 'sheer', sl: 8, bk: 11 } },
  { id: 'f15', g: 'f', name: '로우 포니', v2: { top: 'part', tail: { t: 'low', n: 9 } } },
  { id: 'f16', g: 'f', name: '하프업', v2: { top: 'part', fr: 'straight', sl: 6, bk: 8, tail: { t: 'halfup' } } },
  { id: 'f17', g: 'f', name: '트윈 번', v2: { top: 'flat', tail: { t: 'sbun' } } },
  { id: 'f18', g: 'f', name: '사이드 브레이드', v2: { top: 'part', fr: 'side', tail: { t: 'sbraid', n: 9 } } },
  { id: 'f19', g: 'f', name: '올림머리', v2: { top: 'puff', tail: { t: 'bun2' } } },
  { id: 'f20', g: 'f', name: '웨이브 숏', v2: { top: 'puff', fr: 'side', sl: 3, bk: 3 } },
  { id: 'f21', g: 'f', name: '컬 롱', v2: { top: 'part', fr: 'curtain', sl: 6, bk: 9, flare: 2 } },
  { id: 'f22', g: 'f', name: '양갈래 땋기', v2: { top: 'part', tail: { t: 'dbraid', n: 8 } } },
  { id: 'f23', g: 'f', name: '하이 포니', v2: { top: 'slick', lift: 1, tail: { t: 'pony', n: 11 } } },
  { id: 'f24', g: 'f', name: 'A라인 보브', v2: { top: 'part', fr: 'side', sl: 3, bk: 3, flare: 3 } },
];
export const HAIR = Object.fromEntries(HAIR_STYLES.map((s) => [s.id, s]));

// 자연색 + 염색색 견본
export const HAIR_COLORS = ['#1c1a1f', '#3a2418', '#6b4a2b', '#8a5a34', '#c9a063', '#e6d39a', '#d9d9dc', '#8a8a92', '#a5382a', '#d9692e', '#e58fb0', '#4a78b8', '#3f9a86', '#7a5aa8',
  '#0f2a3f', '#5b2a86', '#b02a52', '#f2c14e', '#9fe0d8', '#2d6a4f', '#c7b8ea', '#f4f4f6', '#3b3b4f'];   // 뒤 9색: 네이비 · 보라 · 로즈 · 금색 · 민트 · 포레스트 · 라벤더 · 백발 · 차콜

/** r(color, x, y, w, h) 로 그린다. view: 'down' | 'up' | 'side'(오른쪽 보기; 왼쪽은 호출측에서 좌우반전) */
/** 뿌리(col) → 끝(tip) 그라데이션. y 가 아래로 갈수록 tip 색에 가까워진다. 음영(sh/hi)은 col 기준 차이를 그대로 유지한다. */
function gradient(r, col, tip) {
  const ch = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }, b = ch(col), t0 = ch(tip);
  const hexOf = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  return (c, x, y, w, hgt) => {
    const d = ch(c).map((v, i) => v - b[i]);
    for (let yy = y; yy < y + hgt; yy++) { const t = Math.max(0, Math.min(1, (yy - 3) / 3.5)), tt = t * t * (3 - 2 * t); r(hexOf(b.map((v, i) => v + (t0[i] - v) * tt + d[i])), x, yy, w, 1); }
  };
}

/** 확장 스타일(v2) 그리기. 앞(down) · 뒤(up) · 옆(side, 오른쪽 보기) 모두 따로 그린다. */
function hair2(r, view, o, col, sh, hi) {
  const lift = o.lift || 0, sl = o.sl || 0, bk = o.bk || 0, tl = o.tail || null, n = tl?.n || 0, top = o.top || 'flat';
  const strand = (x, y, len, w = 1) => { if (len > 0) r(col, x, y, w, len); };
  if (view === 'down') {
    // 정수리
    if (top === 'buzz') r(sh, 5, 3, 6, 2);
    else if (top === 'crest') { r(col, 5, 3, 6, 2); r(col, 5, 2, 1, 1); r(col, 7, 2, 2, 1); r(col, 10, 2, 1, 1); r(hi, 6, 3, 2, 1); }
    else if (top === 'puff') { r(col, 5, 2, 6, 3); r(col, 4, 3, 8, 2); r(hi, 6, 2, 3, 1); }
    else if (top === 'quiff') { r(col, 5, 3, 6, 2); r(col, 6, 2, 4, 1); r(col, 6, 1, 3, 1); if (lift > 2) r(col, 6, 0, 2, 1); r(hi, 6, 3, 2, 1); }
    else if (top === 'pomp') { r(col, 5, 3, 6, 2); for (let i = 1; i <= lift; i++) r(col, i > 1 ? 6 : 5, 3 - i, i > 1 ? 4 : 6, 1); r(hi, 6, 3, 2, 1); }
    else if (top === 'slick') { r(col, 5, 3, 6, 2); if (lift) r(col, 6, 2, 4, 1); r(sh, 6, 4, 4, 1); r(hi, 6, 3, 3, 1); }
    else if (top === 'tufts') { r(col, 5, 3, 6, 2); r(col, 5, 1, 2, 2); r(col, 9, 1, 2, 2); r(hi, 7, 3, 2, 1); }
    else if (top === 'part') { r(col, 5, 3, 6, 2); r(sh, 7, 3, 1, 2); r(hi, 8, 3, 2, 1); }
    else { r(col, 5, 3, 6, 2); r(hi, 6, 3, 2, 1); }
    // 앞머리
    if (o.fr === 'straight') r(col, 5, 5, 6, 1);
    else if (o.fr === 'side') { r(col, 5, 5, 4, 1); r(col, 5, 6, 1, 1); }
    else if (o.fr === 'curtain') { r(col, 5, 5, 2, 1); r(col, 9, 5, 2, 1); r(col, 5, 6, 1, 1); r(col, 10, 6, 1, 1); }
    else if (o.fr === 'sheer') { r(col, 5, 5, 1, 1); r(col, 7, 5, 1, 1); r(col, 9, 5, 1, 1); }
    else if (o.fr === 'comma') { r(col, 7, 5, 1, 1); r(col, 8, 6, 1, 1); }
    // 옆머리 · 뒷머리 · 퍼짐
    const L = (len, i) => (o.jag && i % 2 ? len - 1 : len);
    strand(5, 6, L(sl, 0)); strand(10, 6, L(sl, 1)); strand(4, 6, L(bk, 0)); strand(11, 6, L(bk, 1));
    if (o.flare) { strand(3, 8, o.flare); strand(12, 8, o.flare); }
    // 묶음 · 땋기
    if (tl) {
      const t = tl.t;
      if (t === 'pony') { r(col, 11, 4, 2, n); r(sh, 11, n + 3, 2, 1); }
      else if (t === 'low') { r(col, 11, 7, 2, n); r(sh, 11, 6 + n, 2, 1); }
      else if (t === 'sbun') { r(col, 3, 2, 3, 3); r(col, 10, 2, 3, 3); r(sh, 3, 4, 3, 1); r(sh, 10, 4, 3, 1); }
      else if (t === 'tbun') { r(col, 7, 0, 2, 2); r(sh, 7, 2, 2, 1); }
      else if (t === 'bun2') { r(col, 5, 0, 6, 3); r(sh, 5, 2, 6, 1); }
      else if (t === 'halfup') { r(col, 7, 1, 2, 2); r(sh, 7, 2, 2, 1); }
      else if (t === 'dbraid') { for (const x of [4, 11]) { r(col, x, 5, 1, n); for (let y = 7; y < 5 + n; y += 3) r(sh, x, y, 1, 1); } }
      else if (t === 'sbraid') { r(col, 4, 5, 1, n); for (let y = 7; y < 5 + n; y += 3) r(sh, 4, y, 1, 1); }
      else if (t === 'dread') { for (const [x, y, d] of [[4, 5, 0], [5, 6, 1], [10, 6, 1], [11, 5, 0]]) strand(x, y, n - d - (x === 5 || x === 11 ? 1 : 0)); }
      else if (t === 'queue') { r(sh, 5, 3, 1, 2); r(sh, 10, 3, 1, 2); }
    }
    return;
  }
  if (view === 'up') {
    if (top === 'buzz') r(sh, 5, 3, 6, 4);
    else if (top === 'puff') { r(col, 4, 2, 8, 6); r(hi, 6, 2, 3, 1); }
    else r(col, 5, 3, 6, 6);
    if (top === 'crest') { r(col, 5, 2, 1, 1); r(col, 7, 2, 2, 1); r(col, 10, 2, 1, 1); }
    if (top === 'quiff') { r(col, 6, 2, 4, 1); r(col, 6, 1, 3, 1); if (lift > 2) r(col, 6, 0, 2, 1); }
    if (top === 'pomp') for (let i = 1; i <= lift; i++) r(col, i > 1 ? 6 : 5, 3 - i, i > 1 ? 4 : 6, 1);
    if (top === 'slick' && lift) r(col, 6, 2, 4, 1);
    if (top === 'tufts') { r(col, 5, 1, 2, 2); r(col, 9, 1, 2, 2); }
    if (top === 'slick' || top === 'flat' || top === 'part') r(hi, 6, 3, 3, 1);
    if (bk > 0) { if (o.jag) { r(col, 4, 6, 8, bk - 1); for (const x of [4, 5, 7, 8, 10, 11]) r(col, x, 6 + bk - 1, 1, 1); } else r(col, 4, 6, 8, bk); }
    if (o.flare) { r(col, 3, 8, 1, bk + o.flare - 6 > 0 ? bk + o.flare - 6 : o.flare); r(col, 12, 8, 1, o.flare); }
    if (tl) {
      const t = tl.t;
      if (t === 'pony') { r(col, 7, 6, 2, n); r(sh, 7, n + 5, 2, 1); }
      else if (t === 'low') { r(col, 7, 8, 2, n); r(sh, 7, 7 + n, 2, 1); }
      else if (t === 'sbun') { r(col, 3, 2, 3, 3); r(col, 10, 2, 3, 3); }
      else if (t === 'tbun') r(col, 7, 0, 2, 2);
      else if (t === 'bun2') r(col, 5, 0, 6, 3);
      else if (t === 'halfup') r(col, 7, 1, 2, 2);
      else if (t === 'dbraid') { for (const x of [3, 11]) { r(col, x, 6, 2, n); for (let y = 8; y < 6 + n; y += 3) r(sh, x, y, 2, 1); } }
      else if (t === 'sbraid') { r(col, 3, 6, 2, n - 2); for (let y = 8; y < 4 + n; y += 3) r(sh, 3, y, 2, 1); }
      else if (t === 'dread') { for (const [x, d] of [[4, 0], [6, 1], [9, 1], [11, 0]]) strand(x, 8, n - d - 1); }
      else if (t === 'queue') { r(col, 7, 3, 2, n + 3); for (let y = 6; y < n + 6; y += 3) r(sh, 7, y, 2, 1); }
    }
    return;
  }
  // side (오른쪽을 보는 옆모습: 얼굴 앞쪽이 x=9~10)
  if (top === 'buzz') r(sh, 5, 3, 6, 2);
  else if (top === 'puff') { r(col, 4, 2, 7, 3); r(col, 5, 1, 5, 1); }
  else r(col, 5, 3, 6, 2);
  if (top === 'crest') { r(col, 5, 2, 1, 1); r(col, 7, 2, 2, 1); r(col, 10, 2, 1, 1); }
  if (top === 'quiff') { r(col, 6, 2, 4, 1); r(col, 7, 1, 3, 1); if (lift > 2) r(col, 8, 0, 2, 1); }
  if (top === 'pomp') for (let i = 1; i <= lift; i++) r(col, 6, 3 - i, 4, 1);
  if (top === 'slick' && lift) r(col, 5, 2, 4, 1);
  if (top === 'tufts') { r(col, 5, 1, 2, 2); r(col, 8, 1, 2, 2); }
  if (top === 'slick' || top === 'flat' || top === 'part') r(hi, 6, 3, 2, 1);
  if (o.fr === 'straight') r(col, 8, 5, 3, 1); else if (o.fr === 'side') r(col, 7, 5, 4, 1); else if (o.fr === 'curtain') r(col, 8, 5, 3, 1); else if (o.fr === 'sheer') { r(col, 8, 5, 1, 1); r(col, 10, 5, 1, 1); } else if (o.fr === 'comma') r(col, 9, 5, 1, 2);
  if (sl > 0) r(col, 5, 5, 2, Math.min(sl, 5));
  if (bk > 0) { if (o.jag) { r(col, 4, 5, 3, bk - 1); r(col, 4, 5 + bk - 1, 1, 1); r(col, 6, 5 + bk - 1, 1, 1); } else r(col, 4, 5, 3, bk); }
  if (o.flare) r(col, 3, 5, 1, bk + o.flare);
  if (tl) {
    const t = tl.t;
    if (t === 'pony') { r(col, 3, 4, 3, n); r(sh, 3, n + 3, 3, 1); }
    else if (t === 'low') { r(col, 3, 7, 3, n); r(sh, 3, 6 + n, 3, 1); }
    else if (t === 'sbun') r(col, 4, 2, 3, 3);
    else if (t === 'tbun') r(col, 6, 0, 2, 2);
    else if (t === 'bun2') r(col, 5, 0, 5, 3);
    else if (t === 'halfup') { r(col, 5, 1, 3, 2); r(col, 4, 5, 3, 7); }
    else if (t === 'dbraid') { r(col, 3, 5, 2, n); for (let y = 7; y < 5 + n; y += 3) r(sh, 3, y, 2, 1); }
    else if (t === 'sbraid') { r(col, 4, 6, 2, n - 3); }
    else if (t === 'dread') { for (const [x, y, d] of [[3, 5, 0], [4, 6, 1], [5, 5, 2]]) strand(x, y, n - d - 1); }
    else if (t === 'queue') { r(col, 3, 3, 2, n + 2); for (let y = 6; y < n + 4; y += 3) r(sh, 3, y, 2, 1); }
  }
}

export function drawHair(r0, view, id, col, tip = null) {
  const r = tip ? gradient(r0, col, tip) : r0;
  const s = HAIR[id] || HAIR.m1; const sh = adj(col, -34), hi = adj(col, 26);
  if (s.v2) return hair2(r, view, s.v2, col, sh, hi);
  const rows = s.rows ?? 2, side = s.side ?? 0, back = s.back ?? 0, k = s.k;
  if (k === 'bald') { r(sh, view === 'side' ? 6 : 6, 3, view === 'up' ? 4 : 4, 1); return; }

  if (view === 'down') {
    if (k === 'mohawk') { r(col, 7, 0, 2, 4); r(hi, 7, 0, 1, 3); return; }
    if (k === 'afro') { r(col, 4, 1, 8, 5); r(col, 3, 2, 1, 5); r(col, 12, 2, 1, 5); r(hi, 5, 1, 3, 1); return; }
    if (k === 'spike') { r(col, 5, 3, 6, 2); r(col, 5, 1, 1, 2); r(col, 7, 0, 2, 3); r(col, 10, 1, 1, 2); r(hi, 7, 0, 1, 2); return; }
    r(col, 5, 3, 6, rows); r(hi, 6, 3, 2, 1);
    if (s.bangs) r(col, 5, 3, 6, 3);
    if (s.part) r(sh, 7, 3, 1, rows);
    if (s.top) r(col, 6, 2, 4, 1);
    if (side) { r(col, 5, 3 + rows, 1, side); r(col, 10, 3 + rows, 1, side); }
    if (k === 'pony') { r(col, 11, 4, 2, s.long ? 8 : 4); r(sh, 11, s.long ? 11 : 7, 2, 1); }
    if (k === 'twin') { r(col, 3, 5, 2, 8); r(col, 11, 5, 2, 8); r(sh, 3, 12, 2, 1); r(sh, 11, 12, 2, 1); }
    if (k === 'bun') { r(col, 6, 0, 4, 3); r(sh, 6, 2, 4, 1); }
    if (k === 'braid') { r(col, 11, 5, 1, 9); r(sh, 11, 7, 1, 1); r(sh, 11, 10, 1, 1); r(sh, 11, 13, 1, 1); }
    if (k === 'sidepony') { r(col, 11, 3, 2, 9); r(hi, 11, 3, 1, 1); r(sh, 11, 11, 2, 1); }
    if (back) { r(col, 4, 6, 1, back); r(col, 11, 6, 1, back); if (s.wave) { r(sh, 3, 8, 1, 2); r(sh, 12, 10, 1, 2); } }
    return;
  }
  if (view === 'up') {
    if (k === 'mohawk') { r(col, 7, 0, 2, 9); return; }
    if (k === 'afro') { r(col, 3, 1, 10, 8); r(hi, 5, 1, 4, 1); return; }
    r(col, 5, 3, 6, 6); r(hi, 6, 3, 3, 1);
    if (k === 'spike') { r(col, 5, 1, 1, 2); r(col, 7, 0, 2, 3); r(col, 10, 1, 1, 2); }
    if (k === 'bun') r(col, 6, 0, 4, 3);
    if (k === 'pony') { r(col, 7, 6, 2, s.long ? 10 : 6); r(sh, 7, s.long ? 14 : 10, 2, 1); }
    if (k === 'twin') { r(col, 3, 5, 2, 8); r(col, 11, 5, 2, 8); }
    if (k === 'braid') { r(col, 7, 6, 2, 11); r(sh, 7, 9, 2, 1); r(sh, 7, 12, 2, 1); r(sh, 7, 15, 2, 1); }
    if (k === 'sidepony') r(col, 10, 4, 2, 9);
    if (s.top) r(sh, 6, 3, 4, 1);
    if (back) { r(col, 4, 6, 8, back); if (s.wave) { r(sh, 3, 8, 1, 2); r(sh, 12, 10, 1, 2); } }
    return;
  }
  // side (오른쪽을 보는 옆모습: 얼굴 앞쪽이 x=9~10)
  if (k === 'mohawk') { r(col, 6, 0, 3, 4); r(hi, 6, 0, 1, 3); return; }
  if (k === 'afro') { r(col, 3, 1, 8, 5); r(col, 3, 3, 2, 5); return; }
  r(col, 5, 3, 6, rows); r(hi, 6, 3, 2, 1);
  if (k === 'spike') { r(col, 5, 1, 1, 2); r(col, 7, 0, 2, 3); }
  if (s.bangs) r(col, 8, 3, 3, 3);
  if (s.top) r(col, 6, 2, 4, 1);
  if (side) r(col, 5, 3 + rows, 2, Math.min(side, 4) + 1);
  if (k === 'bun') r(col, 5, 0, 3, 3);
  if (k === 'pony') { r(col, 3, 4, 3, s.long ? 9 : 5); r(sh, 3, s.long ? 12 : 8, 3, 1); }
  if (k === 'twin') { r(col, 3, 5, 3, 8); r(sh, 3, 12, 3, 1); }
  if (k === 'braid') { r(col, 3, 5, 2, 10); r(sh, 3, 8, 2, 1); r(sh, 3, 11, 2, 1); }
  if (k === 'sidepony') { r(col, 4, 4, 2, 8); r(sh, 4, 10, 2, 1); }
  if (back) { r(col, 4, 5, 3, back); if (s.wave) r(sh, 4, 9, 1, 2); }
}
