// 무기 12종. fx 는 능력치/전투 보정, parts 는 [dx, dy, w, h, 색] (손 위치 기준, 위쪽이 -dy) — 스프라이트에 그려진다.
import { adj } from './hair.js';
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

/* ───────── 공방 무기 ─────────
   3개 공방 × 12가지 무기 종류 = 종류마다 5개(Mk.1~5), 총 60개. 한 공방이 종류당 1~2개씩 맡아 공방마다 20개씩이다.
   착용할 때 착용비(fee)를 한 번 내고, 착용하는 동안 매일 유지비(upkeep)가 운영비에 더해진다. 기본 무기로 바꾸면 유지비는 사라진다.
   외형은 종류별 기본 도트에 공방 색상(티어가 높을수록 밝게)을 입힌다. */
export const WORKSHOPS = [
  { id: 'magma', name: '마그마 인더스트리 공방', short: '마그마', color: '#e0702a', desc: '지열로 벼린 중화기 공방. 근력과 파괴력에 특화됐지만 둔해지고, Mk.3부터는 무기의 열기가 한파를 막아 준다.', lex: ['용암', '화산', '분화', '마그마 코어', '대분화'] },
  { id: 'arc', name: '아크 공방', short: '아크', color: '#4fd0ff', desc: '플라즈마 방전을 쓰는 정밀 공방. 기술·기동·밤 작전에 강하고, Mk.3부터 방전광이 안개를 가르며 Mk.5는 순찰 중 부상을 막는다.', lex: ['스파크', '아크 방전', '플라즈마', '뇌광', '아크 오버로드'] },
  { id: 'wad', name: '웨폰 & 아머 디벨롭 인더스트리 공방', short: '웨폰&아머', color: '#d8b64e', desc: '무기와 방어구를 함께 개발하는 대기업 공방. 방어력과 부상 경감에 특화되고, Mk.3부터 하루를 마칠 때 사기를 북돋운다.', lex: ['개량형', '전술형', '정예형', '특수합금', '프로토타입'] },
];
export const WORKSHOP = Object.fromEntries(WORKSHOPS.map((w) => [w.id, w]));
const PAL = {
  magma: { S: '#d9622a', D: '#8c2f12', H: '#ffd27a', W: '#6a4030', G: '#ff9b3a', L: '#241512' },
  arc: { S: '#7fd4f0', D: '#2b7fa3', H: '#e6fbff', W: '#3a5a78', G: '#3fc2ff', L: '#1b232c' },
  wad: { S: '#b4bcc6', D: '#5f6b77', H: '#f2f5f8', W: '#5e6b78', G: '#d8b64e', L: '#222a31' },
};
/** 기본 무기 도트에 쓰인 색 → 공방/티어 색 */
function colorMap(wid, t) {
  const p = PAL[wid], d = (t - 3) * 9, a = (c) => adj(c, d);
  return { [S]: a(p.S), [D]: a(p.D), [H]: a(p.H), [W]: a(p.W), [G]: a(p.G), [L]: a(p.L), '#241c14': a(p.L), '#4a6a8c': a(adj(p.S, -45)), '#8fb0d0': a(p.H), '#4a525a': a(adj(p.D, -12)) };
}
const PATTERNS = [['magma', 'arc', 'wad', 'magma', 'arc'], ['wad', 'magma', 'arc', 'wad', 'magma'], ['arc', 'wad', 'magma', 'arc', 'wad']];   // 티어 1~5 를 맡는 공방 (종류 순서대로 돌려 쓴다)
const PRIM = [1, 2, 2, 3, 4];                                   // 공방 주력 능력치 증가량(티어별)
const FEE = [2500, 5500, 10000, 17000, 28000], UPKEEP = [120, 260, 480, 800, 1250];
const CLASS_MUL = { dagger: 0.9, shortsword: 0.9, handaxe: 0.9, rapier: 0.9, gauntlet: 0.9, greatsword: 1.25, greathammer: 1.25, battleaxe: 1.25 };
const r2 = (n) => Math.round(n * 100) / 100;
function workshopFx(wid, t, base) {
  const fx = { ...base }, add = (o) => { for (const [k, v] of Object.entries(o)) fx[k] = typeof v === 'boolean' ? (fx[k] || v) : r2((fx[k] || 0) + v); };
  if (wid === 'magma') { add({ str: PRIM[t - 1], speed: -0.02 * t }); if (t >= 3) add({ coldProof: true }); if (t >= 5) add({ succ: 0.03 }); }
  if (wid === 'arc') { add({ skl: PRIM[t - 1], night: 0.01 * t, speed: 0.02 * t }); if (t >= 3) add({ fogProof: true }); if (t >= 5) add({ patrolSafe: true }); }
  if (wid === 'wad') { add({ def: PRIM[t - 1], dmg: -0.03 * t }); if (t >= 3) add({ rest: 2 }); if (t >= 5) add({ succ: 0.03 }); }
  return fx;
}
const TYPES = WEAPONS.filter((w) => w.id !== 'frostblade');   // 서리 대검은 전용 무기라 공방 종류에서 제외
export const WORKSHOP_WEAPONS = TYPES.flatMap((ty, ti) => PATTERNS[ti % 3].map((wid, i) => {
  const t = i + 1, wk = WORKSHOP[wid], mul = CLASS_MUL[ty.id] || 1;
  return { id: `${wid}_${ty.id}_${t}`, name: `${wk.lex[i]} ${ty.name}`, desc: `${wk.short} 공방 Mk.${t} ${ty.name}.`, base: ty.id, workshop: wid, tier: t,
    fee: Math.round((FEE[i] * mul) / 100) * 100, upkeep: Math.round((UPKEEP[i] * mul) / 10) * 10, fx: workshopFx(wid, t, ty.fx), parts: ty.parts, map: colorMap(wid, t) };
}));
export const WEAPON = Object.fromEntries([...WEAPONS, ...WORKSHOP_WEAPONS].map((w) => [w.id, w]));

/** r(color,x,y,w,h). view: down/up/side. off: 걸음 흔들림(미사용) */
export function drawWeapon(r0, view, id0) {
  const w = WEAPON[id0]; if (!w) return;
  const id = w.base || id0, r = w.map ? (col, x, y, wd, ht) => r0(w.map[col] || col, x, y, wd, ht) : r0;   // 공방 무기는 기본 종류의 도트에 공방 색을 입힌다
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

const iconCache = new Map();
export function weaponIcon(id0) {
  if (iconCache.has(id0)) return iconCache.get(id0);
  const cv = Object.assign(document.createElement('canvas'), { width: 16, height: 20 }); const c = cv.getContext('2d');
  const w = WEAPON[id0], id = w.base || id0;
  const r = (col, x, y, wd, ht) => { c.fillStyle = (w.map && w.map[col]) || col; c.fillRect(x, y, wd, ht); };
  if (id === 'shield') { r('#241c14', 3, 3, 10, 13); r('#4a6a8c', 4, 4, 8, 11); r(G, 7, 6, 2, 7); r('#8fb0d0', 4, 4, 8, 1); }
  else if (id === 'gauntlet') { r(D, 4, 6, 8, 9); r(S, 4, 6, 8, 2); r(H, 4, 6, 2, 2); r('#4a525a', 4, 12, 8, 3); r(D, 3, 14, 10, 2); }
  else for (const [dx, dy, wd, ht, col] of w.parts) r(col, 8 + dx, 17 + dy, wd, ht);
  iconCache.set(id0, cv); return cv;
}
