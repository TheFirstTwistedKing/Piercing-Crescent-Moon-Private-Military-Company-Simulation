// 머리카락 스타일: 남성 10 + 여성 10. 16×24 스프라이트의 머리(x5..10, y3..8) 위에 그린다.
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
];
export const HAIR = Object.fromEntries(HAIR_STYLES.map((s) => [s.id, s]));

// 자연색 + 염색색 견본
export const HAIR_COLORS = ['#1c1a1f', '#3a2418', '#6b4a2b', '#8a5a34', '#c9a063', '#e6d39a', '#d9d9dc', '#8a8a92', '#a5382a', '#d9692e', '#e58fb0', '#4a78b8', '#3f9a86', '#7a5aa8'];

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

export function drawHair(r0, view, id, col, tip = null) {
  const r = tip ? gradient(r0, col, tip) : r0;
  const s = HAIR[id] || HAIR.m1; const sh = adj(col, -34), hi = adj(col, 26);
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
