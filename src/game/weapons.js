// 무기 12종. fx 는 능력치/전투 보정, parts 는 [dx, dy, w, h, 색] (손 위치 기준, 위쪽이 -dy) — 스프라이트에 그려진다.
import { buildWorkshopWeapons } from './workshop.js';
const S = '#c8d0d8', D = '#7e8892', H = '#eef3f7', W = '#8a6a3c', G = '#c9a24a', L = '#3a2a1c';
export const WEAPONS = [
  { id: 'dagger', name: '단검', desc: '가볍고 빠르다. 어둠 속에서 더 날카롭다.', fx: { skl: 1, speed: 0.1, night: 0.02 }, parts: [[0, -5, 1, 4, S], [0, -5, 1, 1, H], [-1, -1, 3, 1, G], [0, 0, 1, 2, L]] },
  { id: 'shortsword', name: '쇼트소드', desc: '다루기 쉬운 표준 한손검.', fx: { str: 1, skl: 1 }, parts: [[0, -8, 1, 7, S], [0, -8, 1, 1, H], [-1, -1, 3, 1, G], [0, 0, 1, 2, L]] },
  { id: 'longsword', name: '롱소드', desc: '균형 잡힌 장검. 힘과 기술을 함께 살린다.', fx: { str: 2, skl: 1 }, parts: [[0, -11, 1, 10, S], [0, -11, 1, 1, H], [-2, -1, 5, 1, G], [0, 0, 1, 3, L], [0, 3, 1, 1, G]] },
  { id: 'greatsword', name: '그레이트소드', desc: '거대한 양손검. 위력은 크지만 둔하다.', fx: { str: 3, speed: -0.1 }, parts: [[-1, -13, 3, 12, S], [0, -13, 1, 12, D], [-2, -1, 5, 2, G], [0, 1, 1, 3, L]] },
  { id: 'spear', name: '창', desc: '긴 사거리로 안정적으로 싸운다.', fx: { skl: 2, def: 1 }, parts: [[0, -14, 1, 16, W], [0, -16, 1, 2, S], [-1, -14, 3, 1, S]] },
  { id: 'shield', name: '방패', desc: '막는 데 특화. 받는 부상이 줄어든다.', fx: { def: 3, dmg: -0.1 }, parts: [] },
  { id: 'rapier', name: '레이피어', desc: '찌르기 전용 세검. 기술과 기품.', fx: { skl: 3, cha: 1 }, parts: [[0, -10, 1, 9, H], [-2, -1, 5, 1, G], [-1, 0, 3, 1, G], [0, 1, 1, 2, L]] },
  { id: 'gauntlet', name: '건틀렛', desc: '강철 주먹. 때리고 막는다.', fx: { str: 1, def: 1, dmg: -0.05 }, parts: [] },
  { id: 'hammer', name: '망치', desc: '한손 망치. 묵직한 한 방.', fx: { str: 2, def: 1 }, parts: [[0, -8, 1, 9, W], [-2, -10, 5, 3, D], [-2, -10, 5, 1, S]] },
  { id: 'greathammer', name: '두손 망치', desc: '압도적인 파괴력, 느린 몸놀림.', fx: { str: 4, skl: -1, speed: -0.15 }, parts: [[0, -12, 1, 15, W], [-3, -14, 7, 5, D], [-3, -14, 7, 1, S]] },
  { id: 'handaxe', name: '손도끼', desc: '빠르게 휘두르는 실용 무기.', fx: { str: 1, skl: 1, speed: 0.05 }, parts: [[0, -6, 1, 7, W], [-2, -8, 3, 3, S], [-2, -8, 1, 3, D]] },
  { id: 'frostblade', name: '서리 대검', desc: '서리가 맺힌 거대한 대검. 가시 돋은 날밑이 방어를 돕는다.', fx: { str: 3, def: 1, night: 0.02, speed: -0.1 }, parts: [
    [0, -14, 1, 2, '#ffffff'], [-1, -12, 3, 9, '#eaf8fb'], [-1, -12, 1, 9, '#9fd8e6'], [1, -12, 1, 5, '#cfeff5'], [0, -11, 1, 7, '#2f6f7c'], [0, -5, 1, 2, '#1f4a55'],
    [-3, -3, 7, 1, '#3a3c42'], [-3, -4, 1, 1, '#2a2c31'], [3, -4, 1, 1, '#2a2c31'], [-2, -2, 1, 1, '#2a2c31'], [2, -2, 1, 1, '#2a2c31'], [0, -3, 1, 1, '#9fd8e6'],
    [0, -2, 1, 4, '#26272b'], [0, 2, 1, 1, '#9fd8e6']] },
  { id: 'battleaxe', name: '배틀엑스', desc: '양날 전투 도끼. 공격적이지만 허술하다.', fx: { str: 3, def: -1 }, parts: [[0, -12, 1, 15, W], [-3, -13, 3, 4, S], [1, -13, 3, 4, S], [0, -13, 1, 2, D]] },
];

/* 공방 무기 60개(마그마 · 아크 · 웨폰&아머 × 12종류 × 5개)는 workshop.js 에 있다. 도트는 무기마다 따로 설계된다. */
export { WORKSHOPS, WORKSHOP } from './workshop.js';
export const WORKSHOP_WEAPONS = buildWorkshopWeapons(WEAPONS);
export const WEAPON = Object.fromEntries([...WEAPONS, ...WORKSHOP_WEAPONS].map((w) => [w.id, w]));

/** r(color,x,y,w,h). view: down/up/side. off: 걸음 흔들림(미사용) */
export function drawWeapon(r, view, id0) {
  const w = WEAPON[id0]; if (!w) return;
  if (w.art) { drawArt(r, view, w); return; }
  const id = w.id;
  if (id === 'shield') {
    const [x, y] = view === 'down' ? [0, 11] : view === 'up' ? [5, 10] : [9, 11], wd = view === 'up' ? 6 : 5;
    r('#241c14', x, y, wd, 7); r('#4a6a8c', x + 1, y + 1, wd - 2, 5); r(G, x + Math.floor(wd / 2), y + 2, 1, 3); r('#8fb0d0', x + 1, y + 1, wd - 2, 1);
    return;
  }
  if (id === 'gauntlet') {
    const hands = view === 'side' ? [[7, 15]] : [[2, 15], [11, 15]];
    for (const [x, y] of hands) { r(D, x, y, 3, 3); r(S, x, y, 3, 1); r(H, x, y, 1, 1); }
    return;
  }
  const [cx, hy] = view === 'down' ? [13, 16] : view === 'up' ? [3, 16] : [11, 16];
  for (const [dx, dy, wd, ht, col] of w.parts) r(col, cx + dx, hy + dy, wd, ht);
}
/** 공방 무기(도트 설계): hand=손에 든 무기, shield / gauntlet=격자 */
function drawArt(r, view, w) {
  const c = (role) => w.pal[role] || '#ff00ff', a = w.art;
  if (a.kind === 'shield') { const [x, bottom] = view === 'down' ? [0, 17] : view === 'up' ? [5, 16] : [9, 17], y = bottom - a.h + 1; for (const [px, py, role] of a.px) r(c(role), x + px, y + py, 1, 1); return; }   // 바닥선을 맞추고 크기는 무기마다 다르다
  if (a.kind === 'gauntlet') { const cx = a.w >> 1, hands = view === 'side' ? [8 - cx] : [3 - cx, 12 - cx], y = 18 - a.h; for (const x of hands) for (const [px, py, role] of a.px) r(c(role), x + px, y + py, 1, 1); return; }
  const [cx, hy] = view === 'down' ? [13, 16] : view === 'up' ? [3, 16] : [11, 16];
  for (const [dx, dy, wd, ht, role] of a.rects) r(c(role), cx + dx, hy + dy, wd, ht);
}

const iconCache = new Map();
export function weaponIcon(id0) {
  if (iconCache.has(id0)) return iconCache.get(id0);
  const cv = Object.assign(document.createElement('canvas'), { width: 16, height: 20 }); const c = cv.getContext('2d');
  const w = WEAPON[id0], id = w.id, fill = (col, x, y, wd, ht) => { c.fillStyle = col; c.fillRect(x, y, wd, ht); };
  if (w.art) {
    const col = (role) => w.pal[role] || '#ff00ff', a = w.art;
    if (a.kind === 'shield') { const ox = Math.floor((16 - a.w * 2) / 2), oy = Math.floor((20 - a.h * 2) / 2); for (const [px, py, role] of a.px) fill(col(role), ox + px * 2, oy + py * 2, 2, 2); }
    else if (a.kind === 'gauntlet') { const ox = Math.floor((16 - a.w * 3) / 2), oy = Math.floor((20 - a.h * 3) / 2); for (const [px, py, role] of a.px) fill(col(role), ox + px * 3, oy + py * 3, 3, 3); }
    else for (const [dx, dy, wd, ht, role] of a.rects) fill(col(role), 8 + dx, 16 + dy, wd, ht);
  } else if (id === 'shield') { fill('#241c14', 3, 3, 10, 13); fill('#4a6a8c', 4, 4, 8, 11); fill(G, 7, 6, 2, 7); fill('#8fb0d0', 4, 4, 8, 1); }
  else if (id === 'gauntlet') { fill(D, 4, 6, 8, 9); fill(S, 4, 6, 8, 2); fill(H, 4, 6, 2, 2); fill('#4a525a', 4, 12, 8, 3); fill(D, 3, 14, 10, 2); }
  else for (const [dx, dy, wd, ht, col] of w.parts) fill(col, 8 + dx, 17 + dy, wd, ht);
  iconCache.set(id0, cv); return cv;
}
