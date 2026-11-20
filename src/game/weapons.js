// 무기 12종. fx 는 능력치/전투 보정, parts 는 [dx, dy, w, h, 색] (손 위치 기준, 위쪽이 -dy) — 스프라이트에 그려진다.
import { buildWorkshopWeapons } from './workshop.js';
import { gunArt, GUN_PALETTES, toRects } from './weapon-art.js';
import { HAND_GUNS } from './gun-art2.js';
const K1 = '#2c3036', M2 = '#59616b', M3 = '#8b95a1', BK = '#15171a', OL = '#4a5a3a', BR = '#c9a24a', RD = '#a5382a', GL = '#7fb0e8', WD = '#6a4a2a';   // 총기 색
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
  // ── 총기 6종: 기술 중심. fx.upkeep 은 탄약비(일일 유지비). 습격 전투에서는 원거리로 싸운다(gun 항목). 도트는 옆모습(총구가 앞쪽)으로 gunPixels 로 만든다.
  { id: 'pistol', name: '권총', desc: '가볍고 빠른 반자동 권총. 탄약비가 조금 든다.', fx: { skl: 1, speed: 0.05, upkeep: 40 }, gun: { range: 4, cd: 0.9, mul: 0.8 },
    art: gunArt({ body: 3, bh: 2, bar: 2, bt: 1, gp: 1, top: 'iron' }, HAND_GUNS.pistol), pal: GUN_PALETTES.gun },
  { id: 'smg', name: '기관단총', desc: '짧은 사거리에서 탄을 쏟아붓는다. 기술과 기동에 유리하고 탄약비가 든다.', fx: { skl: 2, speed: 0.03, upkeep: 100 }, gun: { range: 4.5, cd: 0.45, mul: 0.4 },
    art: gunArt({ stock: 'fold', sl: 3, body: 4, bh: 2, bar: 3, bt: 1, gp: 2, mag: 'long', mp: 2, top: 'dot' }, HAND_GUNS.smg), pal: GUN_PALETTES.gun },
  { id: 'mg', name: '기관총', desc: '묵직한 연사 화력. 이동이 느려지고 탄약비가 크다.', fx: { str: 2, skl: 1, speed: -0.12, upkeep: 220 }, gun: { range: 6.5, cd: 0.35, mul: 0.3 },
    art: gunArt({ stock: 'full', sl: 3, body: 5, bh: 3, bar: 3, bt: 1, hg: 2, gp: 2, mag: 'belt', mp: 2, top: 'carry', bipod: 1, fins: 1 }, HAND_GUNS.mg), pal: GUN_PALETTES.gun },
  { id: 'sniper', name: '저격총', desc: '멀리서 한 발에 큰 피해를 준다. 정밀하지만 연사가 느리고 탄약비가 든다.', fx: { skl: 3, wis: 1, speed: -0.05, succ: 0.02, upkeep: 160 }, gun: { range: 9, cd: 2.4, mul: 1.7 },
    art: gunArt({ stock: 'full', sl: 4, body: 4, bh: 2, bar: 6, bt: 1, mz: 'brake', gp: 2, mag: 'box', mp: 2, top: 'bigscope', bipod: 1 }, HAND_GUNS.sniper), pal: GUN_PALETTES.gun },
  { id: 'rocket', name: '로켓 런처', desc: '폭발탄을 쏘아 주변까지 피해를 준다. 느리고 탄약비가 크다.', fx: { str: 2, skl: 1, speed: -0.1, upkeep: 280 }, gun: { range: 7, cd: 2.6, mul: 0.95, splash: 1.6 },
    art: gunArt({ tube: { len: 11, th: 3, flare: 'both', head: 'rocket', pad: 1, sight: 1, grip: 2 } }, HAND_GUNS.rocket), pal: GUN_PALETTES.gun },
  { id: 'mortar', name: '박격포', desc: '먼 거리에서 포탄을 떨어뜨려 넓은 범위에 피해를 준다. 매우 느리고 탄약비가 크다.', fx: { skl: 1, wis: 2, speed: -0.18, upkeep: 300 }, gun: { range: 10, cd: 3.2, mul: 0.95, splash: 2 },
    art: gunArt({ tube: { len: 7, th: 3, flare: 'rear', head: 'shell', plate: 1, bipod: 1, grip: 0 } }, HAND_GUNS.mortar), pal: GUN_PALETTES.gun },
];

/* 공방 무기 90개(마그마 · 아크 · 웨폰&아머 × 18종류 × 5개)는 workshop.js 에 있다. 도트는 무기마다 따로 설계된다. */
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
    r('#6a5640', x, y, wd, 7); r('#5f86ae', x + 1, y + 1, wd - 2, 5); r(G, x + Math.floor(wd / 2), y + 2, 1, 3); r('#b8d4ee', x + 1, y + 1, wd - 2, 1);
    return;
  }
  if (id === 'gauntlet') {
    const hands = view === 'side' ? [[7, 15]] : [[2, 15], [11, 15]];
    for (const [x, y] of hands) { r(D, x, y, 3, 3); r(S, x, y, 3, 1); r(H, x, y, 1, 1); }
    return;
  }
  const [cx, hy] = view === 'down' ? [12, 16] : view === 'up' ? [3, 16] : [9, 16];
  for (const [dx, dy, wd, ht, col] of w.parts) r(col, cx + dx, hy + dy, wd, ht);
}
/** 긴 총은 셀 밖으로 나가지 않도록 손(그립) 위치를 몸 쪽으로 반 칸 단위로 당긴다. 총 그리기와 손 그리기가 같은 값을 쓴다. */
export function gunHandX(w, view) {
  const a = w.art, base = view === 'down' ? 12 : view === 'up' ? 3 : 10, px = a.px2; if (!px) return base;
  if (a.hx === undefined) a.hx = {};
  if (a.hx[view] !== undefined) return a.hx[view];
  const mx = Math.max(...px.map((q) => q[0])), mn = Math.min(...px.map((q) => q[0]));
  let hx = base;
  if (view === 'up') { const left = base + 0.5 - (mx + 1) / 2; if (left < -8.5) hx = base + Math.ceil((-8.5 - left) * 2) / 2; const right = hx + 0.5 - mn / 2; if (right > 24.5) hx -= Math.ceil((right - 24.5) * 2) / 2; }
  else { const right = base + (mx + 1) / 2; if (right > 24.5) hx = base - Math.ceil((right - 24.5) * 2) / 2; const left = hx + mn / 2; if (left < -8.5) hx += Math.ceil((-8.5 - left) * 2) / 2; }
  return (a.hx[view] = hx);
}
/** 공방 무기(도트 설계): hand=손에 든 무기, shield / gauntlet=격자 */
function drawArt(r, view, w) {
  const c = (role) => w.pal[role] || '#ff00ff', a = w.art;
  if (a.kind === 'shield') { const [x, bottom] = view === 'down' ? [0, 17] : view === 'up' ? [5, 16] : [9, 17], y = bottom - a.h + 1; for (const [px, py, role] of a.px) r(c(role), x + px, y + py, 1, 1); return; }   // 바닥선을 맞추고 크기는 무기마다 다르다
  if (a.kind === 'gauntlet') { const cx = a.w >> 1, hands = view === 'side' ? [8 - cx] : [3 - cx, 12 - cx], y = 18 - a.h; for (const x of hands) for (const [px, py, role] of a.px) r(c(role), x + px, y + py, 1, 1); return; }
  if (a.kind === 'gun') {   // 옆모습 총: 앞/옆 모습에서는 총구가 오른쪽, 뒷모습에서는 왼쪽(좌우 반전). 2배 해상도 도안(반 칸 단위)이 있으면 그것으로 그린다.
    const [hx0, hy, dir] = view === 'down' ? [12, 15, 1] : view === 'up' ? [3, 15, -1] : [9, 15, 1], hx = gunHandX(w, view);
    if (!a.rects2) a.rects2 = a.px2 ? toRects(a.px2) : null;
    if (a.rects2) { for (const [gx, gy, wd, , role] of a.rects2) r(c(role), dir > 0 ? hx + gx / 2 : hx + 0.5 - (gx + wd) / 2, hy + gy / 2, wd / 2, 0.5); return; }
    for (const [gx, gy, role] of a.px) r(c(role), hx + dir * gx, hy + gy, 1, 1);
    return;
  }
  const [cx, hy] = view === 'down' ? [12, 16] : view === 'up' ? [3, 16] : [9, 16];
  for (const [dx, dy, wd, ht, role] of a.rects) r(c(role), cx + dx, hy + dy, wd, ht);
}

/** 아이콘(16×20)에 그릴 사각형 목록 [색, x, y, w, h] — 순수 함수라 테스트에서 잘림·색 누락을 검사할 수 있다. */
export function iconRects(id0) {
  const w = WEAPON[id0], id = w.id, out = [], fill = (col, x, y, wd, ht) => out.push([col, x, y, wd, ht]);
  if (w.art) {
    const col = (role) => w.pal[role] || '#ff00ff', a = w.art;
    if (a.kind === 'shield') { const ox = Math.floor((16 - a.w * 2) / 2), oy = Math.floor((20 - a.h * 2) / 2); for (const [px, py, role] of a.px) fill(col(role), ox + px * 2, oy + py * 2, 2, 2); }
    else if (a.kind === 'gauntlet') { const ox = Math.floor((16 - a.w * 3) / 2), oy = Math.floor((20 - a.h * 3) / 2); for (const [px, py, role] of a.px) fill(col(role), ox + px * 3, oy + py * 3, 3, 3); }
    else if (a.kind === 'gun') { const xs = a.px.map((q) => q[0]), ys = a.px.map((q) => q[1]), ox = Math.floor((16 - (Math.max(...xs) - Math.min(...xs) + 1)) / 2) - Math.min(...xs), oy = Math.floor((20 - (Math.max(...ys) - Math.min(...ys) + 1)) / 2) - Math.min(...ys); for (const [gx, gy, role] of a.px) fill(col(role), ox + gx, oy + gy, 1, 1); }
    else for (const [dx, dy, wd, ht, role] of a.rects) fill(col(role), 8 + dx, 16 + dy, wd, ht);
  } else if (id === 'shield') { fill('#6a5640', 3, 3, 10, 13); fill('#5f86ae', 4, 4, 8, 11); fill(G, 7, 6, 2, 7); fill('#b8d4ee', 4, 4, 8, 1); }
  else if (id === 'gauntlet') { fill(D, 4, 6, 8, 9); fill(S, 4, 6, 8, 2); fill(H, 4, 6, 2, 2); fill('#4a525a', 4, 12, 8, 3); fill(D, 3, 14, 10, 2); }
  else for (const [dx, dy, wd, ht, col] of w.parts) fill(col, 8 + dx, 16 + dy, wd, ht);
  return out;
}
/** 2배 해상도 아이콘(48×40)에 그릴 사각형 [색, x, y, w, h] — 총기는 반 칸 도안, 나머지는 iconRects 를 2배로 */
export function iconRects2(id0) {
  const w = WEAPON[id0];
  if (w.art?.kind === 'gun' && w.art.px2) {
    const col = (role) => w.pal[role] || '#ff00ff', px = w.art.px2, xs = px.map((q) => q[0]), ys = px.map((q) => q[1]);
    const ox = Math.floor((48 - (Math.max(...xs) - Math.min(...xs) + 1)) / 2) - Math.min(...xs), oy = Math.floor((40 - (Math.max(...ys) - Math.min(...ys) + 1)) / 2) - Math.min(...ys);
    return toRects(px).map(([x, y, wd, ht, role]) => [col(role), ox + x, oy + y, wd, ht]);
  }
  return iconRects(id0).map(([col, x, y, wd, ht]) => [col, x * 2, y * 2, wd * 2, ht * 2]);
}
const iconCache = new Map();
export function weaponIcon(id0) {
  if (iconCache.has(id0)) return iconCache.get(id0);
  const cv = Object.assign(document.createElement('canvas'), { width: 48, height: 40 }); const c = cv.getContext('2d');
  for (const [col, x, y, wd, ht] of iconRects2(id0)) { c.fillStyle = col; c.fillRect(x, y, wd, ht); }
  iconCache.set(id0, cv); return cv;
}
