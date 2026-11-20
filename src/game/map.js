// 기지 타일맵: 56×36 타일(타일 16px). 8개 부서 방 + 중앙 복도 + 마당/울타리/정문.
// 정적 레이어는 한 번만 캔버스에 구워 두고(renderStatic), 이후 프레임에서는 복사만 한다.
export const TS = 16;
export const MW = 56, MH = 36;
export const WORLD_W = MW * TS, WORLD_H = MH * TS;

export const PAL = {
  wallCap: '#3b2e23', wallFace: '#1c1511', wallLow: '#120d0a', gold: '#c9a24a', goldDim: '#7c6029',
  floorA: '#2d231b', floorB: '#281f18', plank: '#1f1813',
  corA: '#262019', corB: '#221c16', corLine: '#19140f',
  void: '#05070a', yardA: '#1e251f', yardB: '#1a211c', yardTuft: '#243028', road: '#23211e', fence: '#4a4a46',
  wood: '#4b3b2b', woodDark: '#2e231a', ice: '#cfe1f2',
};

// 방 정의: 바깥 사각형(벽 포함). 위 4개는 문이 아래쪽, 아래 4개는 문이 위쪽.
const RX = [4, 16, 28, 40];
export const ROOMS = {
  operation: { x: RX[0], y: 4, top: true },
  requester: { x: RX[1], y: 4, top: true },
  medical: { x: RX[2], y: 4, top: true },
  aerial: { x: RX[3], y: 4, top: true },
  rager: { x: RX[0], y: 21, top: false },
  raider: { x: RX[1], y: 21, top: false },
  defencer: { x: RX[2], y: 21, top: false },
  carrier: { x: RX[3], y: 21, top: false },
};
const RW = 12, RH = 11;
for (const r of Object.values(ROOMS)) {
  r.w = RW; r.h = RH;
  r.ix = r.x + 1; r.iy = r.y + 1; r.iw = RW - 2; r.ih = RH - 2; // 내부 10×9
  r.doorY = r.top ? r.y + RH - 1 : r.y;
  r.doorX = r.x + 5; // 문 폭 2타일 (doorX, doorX+1)
}
export const CORRIDOR = { x0: 5, y0: 15, x1: 50, y1: 20 };
export const GATE = { x: 27, y: 35 }; // 정문 타일(27,28) — 맵 밖으로 나가는 지점

// 가구: [종류, 내부col, 내부row, w, h, solid]
const FURN = {
  operation: [['monitors', 1, 0, 8, 1, 1], ['maptable', 3, 3, 4, 2, 1], ['desk', 0, 5, 2, 1, 1], ['desk', 8, 5, 2, 1, 1], ['chair', 0, 6, 1, 1, 0], ['chair', 9, 6, 1, 1, 0], ['cabinet', 9, 1, 1, 2, 1], ['cabinet', 0, 1, 1, 2, 1]],
  requester: [['board', 3, 0, 4, 1, 1], ['counter', 2, 2, 6, 1, 1], ['cabinet', 0, 0, 1, 3, 1], ['cabinet', 9, 0, 1, 3, 1], ['bench', 1, 5, 3, 1, 1], ['bench', 6, 5, 3, 1, 1], ['plant', 9, 8, 1, 1, 1]],
  medical: [['bed', 1, 1, 2, 3, 1], ['bed', 4, 1, 2, 3, 1], ['bed', 7, 1, 2, 3, 1], ['cabinet', 0, 6, 2, 1, 1], ['desk', 7, 6, 3, 1, 1], ['chair', 8, 7, 1, 1, 0]],
  aerial: [['pad', 2, 1, 6, 6, 0], ['mast', 0, 0, 1, 1, 1], ['fuel', 9, 0, 1, 2, 1], ['crate', 8, 7, 2, 1, 1], ['crate', 0, 6, 2, 1, 1]],
  rager: [['dummy', 1, 2, 1, 1, 1], ['dummy', 3, 2, 1, 1, 1], ['dummy', 5, 2, 1, 1, 1], ['dummy', 7, 2, 1, 1, 1], ['weights', 1, 6, 3, 1, 1], ['weights', 6, 6, 3, 1, 1], ['targets', 1, 8, 8, 1, 1]],
  raider: [['locker', 0, 2, 1, 4, 1], ['locker', 9, 2, 1, 4, 1], ['maptable', 3, 4, 4, 2, 1], ['rack', 2, 8, 6, 1, 1]],
  defencer: [['barricade', 1, 3, 3, 1, 1], ['barricade', 6, 3, 3, 1, 1], ['monitors', 3, 7, 4, 1, 1], ['chair', 4, 8, 1, 1, 0], ['shieldrack', 0, 6, 1, 2, 1], ['crate', 9, 7, 1, 1, 1]],
  carrier: [['truck', 1, 2, 4, 2, 1], ['van', 6, 5, 3, 2, 1], ['crate', 7, 1, 2, 2, 1], ['pallet', 0, 7, 3, 1, 1]],
  yard: [['furnace', 53, 9, 2, 2, 1]],
  lobby: [['sofa', 25, 15, 5, 1, 1], ['vending', 32, 15, 1, 1, 1], ['plant', 6, 15, 1, 1, 1], ['plant', 49, 15, 1, 1, 1], ['plant', 6, 20, 1, 1, 1], ['plant', 49, 20, 1, 1, 1], ['board', 14, 15, 3, 1, 1], ['board', 38, 15, 3, 1, 1]],
};

export const PATROLS = {
  perimeter: [[27, 33], [3, 33], [3, 2], [52, 2], [52, 33], [28, 33]],
  corridor: [[10, 16], [22, 16], [34, 16], [46, 16], [46, 19], [34, 19], [22, 19], [10, 19]],
  gate: [[22, 33], [22, 32], [33, 32], [33, 33], [27, 34]],
};

// 카메라: 부서 방 8 + 복도 + 정문. 크롭 240×150px(16:10).
export const CAMERAS = [
  ...['operation', 'requester', 'medical', 'aerial', 'rager', 'raider', 'defencer', 'carrier'].map((k, i) => {
    const r = ROOMS[k];
    return { id: `CAM-${String(i + 1).padStart(2, '0')}`, key: k, cx: (r.ix + r.iw / 2) * TS, cy: (r.iy + r.ih / 2) * TS };
  }),
  { id: 'CAM-09', key: 'lobby', cx: 28 * TS, cy: 18 * TS },
  { id: 'CAM-10', key: 'gate', cx: 28 * TS, cy: 32 * TS },
];
export const CAM_W = 240, CAM_H = 150;

// 조명(밤): x,y,반경(px) — 방마다 1개, 복도 5개, 정문/마당
export const LAMPS = [
  ...Object.values(ROOMS).map((r) => ({ x: (r.ix + r.iw / 2) * TS, y: (r.iy + r.ih / 2) * TS, r: 92 })),
  ...[10, 18, 28, 38, 46].map((x) => ({ x: x * TS, y: 18 * TS, r: 76 })),
  { x: 27.5 * TS, y: 33 * TS, r: 96 }, { x: 5 * TS, y: 33 * TS, r: 70 }, { x: 50 * TS, y: 33 * TS, r: 70 },
  { x: 5 * TS, y: 3 * TS, r: 70 }, { x: 50 * TS, y: 3 * TS, r: 70 }, { x: 28 * TS, y: 2.5 * TS, r: 80 },
  { x: 2 * TS, y: 17.5 * TS, r: 60 }, { x: 53 * TS, y: 17.5 * TS, r: 60 },
];

/* ───── 충돌/바닥 격자 ───── */
export const solid = new Uint8Array(MW * MH);      // 1 = 이동 불가
export const floorKind = new Uint8Array(MW * MH);  // 0 yard, 1 corridor, 2 room, 3 wall(wall tile), 4 fence
export const objects = [];                          // 배치된 가구(절대 타일 좌표)
const idx = (x, y) => y * MW + x;
export const inBounds = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
export const isSolid = (x, y) => !inBounds(x, y) || solid[idx(x, y)] === 1;

(function build() {
  // 울타리
  for (let x = 0; x < MW; x++) for (const y of [0, MH - 1]) { solid[idx(x, y)] = 1; floorKind[idx(x, y)] = 4; }
  for (let y = 0; y < MH; y++) for (const x of [0, MW - 1]) { solid[idx(x, y)] = 1; floorKind[idx(x, y)] = 4; }
  for (const gx of [GATE.x, GATE.x + 1]) { solid[idx(gx, MH - 1)] = 0; }
  // 복도
  for (let y = CORRIDOR.y0; y <= CORRIDOR.y1; y++) for (let x = CORRIDOR.x0; x <= CORRIDOR.x1; x++) floorKind[idx(x, y)] = 1;
  // 복도 좌우 벽 + 출입문(2타일)
  for (let y = CORRIDOR.y0; y <= CORRIDOR.y1; y++) for (const x of [4, 51]) { if (y === 17 || y === 18) continue; solid[idx(x, y)] = 1; floorKind[idx(x, y)] = 3; }
  for (const x of [4, 51]) for (const y of [17, 18]) floorKind[idx(x, y)] = 1;
  // 방
  for (const r of Object.values(ROOMS)) {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      const edge = x === r.x || y === r.y || x === r.x + r.w - 1 || y === r.y + r.h - 1;
      floorKind[idx(x, y)] = edge ? 3 : 2; if (edge) solid[idx(x, y)] = 1;
    }
    for (const dx of [0, 1]) { solid[idx(r.doorX + dx, r.doorY)] = 0; floorKind[idx(r.doorX + dx, r.doorY)] = 1; }
  }
  // 가구
  for (const [room, list] of Object.entries(FURN)) {
    const r = ROOMS[room], abs = room === 'lobby' || room === 'yard';
    for (const [type, c, ro, w, h, sol] of list) {
      const ox = abs ? c : r.ix + c, oy = abs ? ro : r.iy + ro;
      objects.push({ type, x: ox, y: oy, w, h, solid: !!sol, room });
      if (sol) for (let yy = oy; yy < oy + h; yy++) for (let xx = ox; xx < ox + w; xx++) solid[idx(xx, yy)] = 1;
    }
  }
})();

// 정문에서 걸어서 닿을 수 있는 타일만 사용(가구에 둘러싸인 구석 칸 제외)
let reach = null;
function reachable() {
  if (reach) return reach;
  reach = new Uint8Array(MW * MH);
  const stack = [[GATE.x, GATE.y]]; reach[idx(GATE.x, GATE.y)] = 1;
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(nx, ny) || reach[idx(nx, ny)] || isSolid(nx, ny)) continue;
      reach[idx(nx, ny)] = 1; stack.push([nx, ny]);
    }
  }
  return reach;
}

// 방 안 서성일 수 있는 타일(문 앞 2줄은 비워 통로 확보)
function roomFreeTilesRaw(roomKey) {
  const out = [];
  const rc = reachable();
  if (roomKey === 'lobby') {
    for (let y = CORRIDOR.y0 + 1; y <= CORRIDOR.y1; y++) for (let x = 20; x <= 36; x++) if (!isSolid(x, y) && rc[idx(x, y)]) out.push([x, y]);
    return out;
  }
  const r = ROOMS[roomKey];
  for (let y = r.iy; y < r.iy + r.ih; y++) for (let x = r.ix; x < r.ix + r.iw; x++) {
    const nearDoor = r.top ? y >= r.iy + r.ih - 2 && x >= r.doorX - 1 && x <= r.doorX + 2 : y <= r.iy + 1 && x >= r.doorX - 1 && x <= r.doorX + 2;
    if (!isSolid(x, y) && !nearDoor && rc[idx(x, y)]) out.push([x, y]);
  }
  return out;
}
export const roomFreeTiles = (roomKey) => roomFreeTilesRaw(roomKey).filter(([x, y]) => !SLOT_SET.has(idx(x, y)));
export const roomDoorTile = (roomKey) => {
  if (roomKey === 'lobby') return [28, 17];
  const r = ROOMS[roomKey];
  return [r.doorX, r.top ? r.doorY + 1 : r.doorY - 1]; // 복도 쪽 문 앞
};

/* ───── 가구 자리(방마다 4칸) ─────
   문에서 먼 칸부터 고르되, 4칸을 모두 채워도 정문까지 길이 끊기지 않는 칸만 쓴다. 가구를 놓을 때만 solid 가 된다. */
export const FURN_SLOT_COUNT = 4;
export const SLOTS = {};
const SLOT_SET = new Set();
function reachCount() {
  const seen = new Uint8Array(MW * MH), st = [[GATE.x, GATE.y]]; seen[idx(GATE.x, GATE.y)] = 1; let n = 1;
  while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!inBounds(nx, ny) || seen[idx(nx, ny)] || isSolid(nx, ny)) continue; seen[idx(nx, ny)] = 1; n++; st.push([nx, ny]); } }
  return n;
}
(function computeSlots() {
  const keys = [...Object.keys(ROOMS), 'lobby'], base = reachCount(); let placed = 0; const all = [];
  for (const k of keys) {
    const door = roomDoorTile(k), chosen = [];
    const cand = roomFreeTilesRaw(k).sort((a, b) => (Math.abs(b[0] - door[0]) + Math.abs(b[1] - door[1])) - (Math.abs(a[0] - door[0]) + Math.abs(a[1] - door[1])));
    for (const [x, y] of cand) {
      if (chosen.length >= FURN_SLOT_COUNT) break;
      if (chosen.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 3)) continue;
      solid[idx(x, y)] = 1;
      if (reachCount() === base - placed - 1) { chosen.push([x, y]); placed++; all.push([x, y]); } else solid[idx(x, y)] = 0;
    }
    SLOTS[k] = chosen;
  }
  for (const [x, y] of all) { solid[idx(x, y)] = 0; SLOT_SET.add(idx(x, y)); }
})();
export const setSlotSolid = (room, i, on) => { const t = SLOTS[room]?.[i]; if (t) solid[idx(t[0], t[1])] = on ? 1 : 0; };

/* ───── 야외 / 용광로 ───── */
export const isOutdoor = (x, y) => inBounds(x, y) && (floorKind[idx(x, y)] === 0 || floorKind[idx(x, y)] === 4);
export const FURNACE = { x: 53, y: 9, w: 2, h: 2, spot: [52, 10] };   // 작업자는 서쪽 칸에 선다
export function yardWorkTiles() {   // 재설 작업을 할 마당 타일(정문에서 걸어갈 수 있는 곳, 길가 제외)
  const rc = reachable(), out = [];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (floorKind[idx(x, y)] === 0 && rc[idx(x, y)] && !solid[idx(x, y)] && !(x === 52 && y >= 8 && y <= 11)) out.push([x, y]);
  return out;
}

/* ───── 경로 탐색 (A*, 4방향) ───── */
export function findPath(sx, sy, tx, ty) {
  if (isSolid(tx, ty)) return null;
  if (sx === tx && sy === ty) return [];
  const N = MW * MH, g = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const open = [[Math.abs(sx - tx) + Math.abs(sy - ty), idx(sx, sy)]];
  g[idx(sx, sy)] = 0;
  const heapPush = (it) => { open.push(it); let i = open.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (open[p][0] <= open[i][0]) break; [open[p], open[i]] = [open[i], open[p]]; i = p; } };
  const heapPop = () => { const top = open[0], last = open.pop(); if (open.length) { open[0] = last; let i = 0; for (;;) { let l = i * 2 + 1, r = l + 1, m = i; if (l < open.length && open[l][0] < open[m][0]) m = l; if (r < open.length && open[r][0] < open[m][0]) m = r; if (m === i) break; [open[m], open[i]] = [open[i], open[m]]; i = m; } } return top; };
  const goal = idx(tx, ty);
  while (open.length) {
    const [, cur] = heapPop();
    if (closed[cur]) continue; closed[cur] = 1;
    if (cur === goal) {
      const path = []; let c = cur;
      while (c !== idx(sx, sy)) { path.push([c % MW, (c / MW) | 0]); c = from[c]; }
      return path.reverse();
    }
    const cx = cur % MW, cy = (cur / MW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (!inBounds(nx, ny)) continue;
      if (isSolid(nx, ny)) continue;
      const ni = idx(nx, ny), ng = g[cur] + 1;
      if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; heapPush([ng + Math.abs(nx - tx) + Math.abs(ny - ty), ni]); }
    }
  }
  return null;
}

/* ───── 정적 레이어 렌더 ───── */
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, w | 0, h | 0); };

export function renderStatic() {
  const cv = document.createElement('canvas'); cv.width = WORLD_W; cv.height = WORLD_H;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  const rnd = rng(7);
  const roomAt = (x, y) => Object.entries(ROOMS).find(([, r]) => x > r.x && x < r.x + r.w - 1 && y > r.y && y < r.y + r.h - 1)?.[0];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const k = floorKind[idx(x, y)], px = x * TS, py = y * TS, a = (x + y) % 2 === 0;
    if (k === 0) {
      R(c, a ? PAL.yardA : PAL.yardB, px, py, TS, TS);
      if (rnd() < 0.18) R(c, PAL.yardTuft, px + ((rnd() * 12) | 0), py + ((rnd() * 12) | 0), 2, 1);
      // 도로(정문→건물)
      if ((x === 27 || x === 28) && y > 31) R(c, PAL.road, px, py, TS, TS);
    } else if (k === 1) {
      R(c, a ? PAL.corA : PAL.corB, px, py, TS, TS); R(c, PAL.corLine, px, py + TS - 1, TS, 1);
      if (rnd() < 0.1) R(c, '#1c160f', px + ((rnd() * 10) | 0), py + ((rnd() * 10) | 0), 3, 1);
    } else if (k === 2) {
      const room = roomAt(x, y);
      const concrete = room === 'aerial' || room === 'carrier' || room === 'rager';
      R(c, concrete ? (a ? '#2a2a29' : '#262625') : (a ? PAL.floorA : PAL.floorB), px, py, TS, TS);
      if (!concrete) { R(c, PAL.plank, px, py + 7, TS, 1); R(c, PAL.plank, px, py + 15, TS, 1); if ((x * 7 + y) % 5 === 0) R(c, PAL.plank, px + 8, py, 1, 7); }
      else if (rnd() < 0.25) R(c, '#1e1e1d', px + ((rnd() * 12) | 0), py + ((rnd() * 12) | 0), 2, 2);
    } else if (k === 4) {
      // 울타리 타일: 울타리 안쪽만 마당 바닥, 바깥쪽은 지도 밖(빈 공간)으로 둔다 — 바닥이 울타리를 넘어가 보이지 않게
      const gate = y === MH - 1 && (x === GATE.x || x === GATE.x + 1);
      R(c, PAL.yardB, px, py, TS, TS);
      if (!gate) {
        if (y === 0) R(c, PAL.void, px, py, TS, 6);
        else if (y === MH - 1) R(c, PAL.void, px, py + 10, TS, 6);
        else if (x === MW - 1) R(c, PAL.void, px + 3, py, TS - 3, TS);
      }
    }
  }
  // 울타리
  const fence = (x, y, horiz) => { const px = x * TS, py = y * TS; R(c, PAL.fence, px, py + (horiz ? 6 : 0), horiz ? TS : 3, horiz ? 3 : TS); R(c, '#2c2c29', px, py + (horiz ? 9 : 0), horiz ? TS : 1, horiz ? 1 : TS); if (horiz && x % 2 === 0) R(c, '#6a6a64', px + 2, py + 3, 2, 9); if (!horiz && y % 2 === 0) R(c, '#6a6a64', px - 1, py + 2, 5, 2); };
  for (let x = 0; x < MW; x++) { if (x !== GATE.x && x !== GATE.x + 1) fence(x, 0, true), fence(x, MH - 1, true); }
  for (let y = 1; y < MH - 1; y++) { fence(0, y, false); fence(MW - 1, y, false); }
  // 정문 기둥(금장식)
  for (const px of [GATE.x * TS - 4, (GATE.x + 2) * TS - 2]) { R(c, '#2a2118', px, (MH - 1) * TS - 6, 6, 22); R(c, PAL.gold, px + 2, (MH - 1) * TS - 6, 1, 22); }

  // 벽
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (floorKind[idx(x, y)] !== 3) continue;
    const px = x * TS, py = y * TS;
    R(c, PAL.wallFace, px, py, TS, TS);
    const below = !isSolidWall(x, y + 1), above = !isSolidWall(x, y - 1), left = !isSolidWall(x - 1, y), right = !isSolidWall(x + 1, y);
    if (above) R(c, PAL.wallCap, px, py, TS, 5), R(c, PAL.wallLow, px, py + 5, TS, 1);
    if (below) { R(c, PAL.wallCap, px, py, TS, 3); R(c, '#241b15', px, py + 3, TS, 8); R(c, PAL.goldDim, px, py + 11, TS, 1); R(c, PAL.gold, px, py + 12, TS, 1); R(c, PAL.wallLow, px, py + 13, TS, 3); }
    if (left) R(c, '#2a2019', px, py, 2, TS);
    if (right) R(c, '#120d0a', px + TS - 2, py, 2, TS);
  }
  // 문 금장식(세로 금테) — 첨부 스타일 참고
  const doorTrim = (x, y, w) => { const px = x * TS, py = y * TS; for (const dx of [-3, w * TS + 1]) { R(c, '#3a2b18', px + dx, py - 2, 3, TS + 4); R(c, PAL.gold, px + dx + 1, py - 2, 1, TS + 4); } };
  for (const r of Object.values(ROOMS)) doorTrim(r.doorX, r.doorY, 2);
  for (const x of [4, 51]) { const px = x * TS; R(c, '#3a2b18', px, 16 * TS + 8, TS, 3); R(c, PAL.gold, px, 16 * TS + 9, TS, 1); R(c, '#3a2b18', px, 19 * TS + 5, TS, 3); R(c, PAL.gold, px, 19 * TS + 6, TS, 1); }

  for (const o of objects) drawObject(c, o);
  // 방 이름 바닥 표식(희미한 선) — 방 구분용
  c.fillStyle = 'rgba(201,162,74,.05)';
  return cv;
}
const isSolidWall = (x, y) => inBounds(x, y) && floorKind[idx(x, y)] === 3;

function drawObject(c, o) {
  const x = o.x * TS, y = o.y * TS, w = o.w * TS, h = o.h * TS;
  const wood = PAL.wood, dark = PAL.woodDark;
  switch (o.type) {
    case 'monitors': {
      R(c, '#1a1c1f', x, y + 2, w, h - 4); R(c, '#0d0f11', x, y + h - 4, w, 4);
      for (let i = 0; i < o.w; i++) { R(c, '#0b1a22', x + i * TS + 2, y + 3, 12, 8); R(c, '#6f95a8', x + i * TS + 4, y + 5, 6 - (i % 3) * 1, 1); R(c, '#3d6173', x + i * TS + 4, y + 8, 8, 1); }
      break;
    }
    case 'maptable': {
      R(c, dark, x, y + 4, w, h - 4); R(c, wood, x, y, w, h - 6); R(c, '#cbb98c', x + 4, y + 3, w - 8, h - 12);
      R(c, '#9d8a5d', x + 4, y + 3, w - 8, 1); for (let i = 0; i < 5; i++) R(c, i % 2 ? PAL.gold : '#a5493a', x + 8 + i * 9, y + 8 + (i % 3) * 5, 3, 3);
      R(c, '#4a3e2a', x + 10, y + 10, 18, 1); break;
    }
    case 'desk': case 'counter': { R(c, dark, x, y + 6, w, h - 6); R(c, wood, x, y, w, 10); R(c, '#5d4b37', x, y, w, 1); R(c, '#0d0f11', x + 4, y + 2, 8, 5); R(c, '#6f95a8', x + 5, y + 3, 5, 1); break; }
    case 'chair': R(c, '#241b15', x + 3, y + 3, 10, 10); R(c, '#3a2c20', x + 3, y + 3, 10, 3); break;
    case 'cabinet': { R(c, '#2e3338', x, y, w, h); R(c, '#454c52', x, y, w, 2); for (let j = 0; j < o.h * 2; j++) for (let i = 0; i < o.w; i++) { R(c, '#1d2124', x + i * TS + 2, y + j * 8 + 3, 12, 4); R(c, '#8a8f93', x + i * TS + 7, y + j * 8 + 4, 3, 1); } break; }
    case 'bench': R(c, dark, x + 1, y + 8, w - 2, 5); R(c, '#5b4631', x, y + 3, w, 6); R(c, '#6d563b', x, y + 3, w, 1); break;
    case 'plant': R(c, '#4a3322', x + 4, y + 9, 8, 6); R(c, '#2d5538', x + 2, y + 1, 12, 9); R(c, '#3d7048', x + 4, y + 2, 5, 4); break;
    case 'bed': for (let i = 0; i < 1; i++) { R(c, '#2d3135', x, y, w, h); R(c, '#cdc8ba', x + 2, y + 3, w - 4, h - 8); R(c, '#e6e1d4', x + 4, y + 5, w - 8, 8); R(c, '#72b79d', x + 2, y + 20, w - 4, h - 26); R(c, '#4f8470', x + 2, y + 20, w - 4, 1); } break;
    case 'board': R(c, '#241b15', x, y + 1, w, 13); R(c, '#4b3a28', x + 1, y + 2, w - 2, 11); for (let i = 0; i < o.w * 2; i++) R(c, i % 3 ? '#d6d0bf' : '#c9a24a', x + 3 + i * 7, y + 4, 5, 6); break;
    case 'pad': {
      R(c, '#2f3234', x, y, w, h); R(c, '#3a3d40', x + 2, y + 2, w - 4, h - 4);
      c.strokeStyle = '#c9a24a'; c.lineWidth = 2; c.beginPath(); c.arc(x + w / 2, y + h / 2, w / 2 - 8, 0, Math.PI * 2); c.stroke();
      R(c, '#d5dadd', x + w / 2 - 14, y + h / 2 - 16, 5, 32); R(c, '#d5dadd', x + w / 2 + 9, y + h / 2 - 16, 5, 32); R(c, '#d5dadd', x + w / 2 - 14, y + h / 2 - 3, 28, 6);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; R(c, i % 2 ? '#c9a24a' : '#1c1c1c', x + w / 2 + Math.cos(a) * (w / 2 - 4) - 1, y + h / 2 + Math.sin(a) * (h / 2 - 4) - 1, 3, 3); }
      break;
    }
    case 'mast': R(c, '#2a2d30', x + 6, y + 4, 4, 12); R(c, '#7a7f84', x + 7, y, 2, 6); R(c, '#a5493a', x + 7, y - 1, 2, 2); break;
    case 'fuel': for (let j = 0; j < o.h; j++) { R(c, '#2e3b2c', x + 2, y + j * TS + 2, 12, 13); R(c, '#4a5c47', x + 2, y + j * TS + 2, 12, 2); R(c, '#1d261c', x + 2, y + j * TS + 8, 12, 1); } break;
    case 'crate': for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) { const cx = x + i * TS, cy = y + j * TS; R(c, '#3a2a16', cx, cy + 1, TS, 14); R(c, '#5b4326', cx + 1, cy + 2, 14, 12); R(c, '#3a2a16', cx + 1, cy + 7, 14, 2); R(c, '#3a2a16', cx + 7, cy + 2, 2, 12); } break;
    case 'dummy': R(c, '#3a2c20', x + 6, y + 4, 4, 12); R(c, '#a58a5e', x + 3, y + 4, 10, 7); R(c, '#c3a876', x + 5, y, 6, 5); R(c, '#7a6540', x + 3, y + 10, 10, 1); break;
    case 'weights': R(c, '#232526', x, y + 7, w, 4); R(c, '#4a4d50', x + 4, y + 2, 4, 12); R(c, '#4a4d50', x + w - 8, y + 2, 4, 12); R(c, '#8d9296', x + 6, y + 7, w - 12, 2); break;
    case 'targets': for (let i = 0; i < o.w; i++) { R(c, '#1a1a1a', x + i * TS + 2, y + 2, 12, 12); R(c, '#d6d0bf', x + i * TS + 3, y + 3, 10, 10); R(c, '#a5493a', x + i * TS + 5, y + 5, 6, 6); R(c, '#d6d0bf', x + i * TS + 7, y + 7, 2, 2); } break;
    case 'locker': R(c, '#27303a', x + 1, y, w - 2, h); for (let j = 0; j < o.h; j++) { R(c, '#3c4856', x + 2, y + j * TS + 1, 12, 14); R(c, '#1c232a', x + 4, y + j * TS + 3, 8, 2); R(c, '#8a8f93', x + 11, y + j * TS + 8, 2, 3); } break;
    case 'rack': R(c, '#1c1816', x, y + 3, w, 10); for (let i = 0; i < o.w * 3; i++) { R(c, '#3c3f43', x + 3 + i * 5, y + 4, 3, 8); R(c, '#5a5f64', x + 3 + i * 5, y + 4, 1, 8); } break;
    case 'barricade': for (let i = 0; i < o.w * 2; i++) { R(c, '#4a3f2c', x + i * 8, y + 3, 8, 9); R(c, '#6d5e41', x + i * 8 + 1, y + 4, 6, 4); } break;
    case 'shieldrack': for (let j = 0; j < o.h; j++) { R(c, '#2a3a4c', x + 2, y + j * TS + 2, 12, 13); R(c, '#4a6a8c', x + 4, y + j * TS + 4, 8, 3); } break;
    case 'truck': R(c, '#241c14', x, y + 2, w, h - 4); R(c, '#6b4a2c', x + 22, y + 4, w - 24, h - 8); R(c, '#8a6038', x + 22, y + 4, w - 24, 2); R(c, '#4a3a28', x + 2, y + 5, 18, h - 10); R(c, '#0b1a22', x + 4, y + 8, 6, h - 16); R(c, '#111', x + 6, y, 8, 3); R(c, '#111', x + 6, y + h - 3, 8, 3); R(c, '#111', x + 40, y, 8, 3); R(c, '#111', x + 40, y + h - 3, 8, 3); break;
    case 'van': R(c, '#1f1f1f', x, y + 2, w, h - 4); R(c, '#3d4a55', x + 2, y + 4, w - 4, h - 8); R(c, '#0b1a22', x + w - 12, y + 8, 8, h - 16); R(c, '#5d6d7a', x + 2, y + 4, w - 4, 2); break;
    case 'pallet': R(c, '#3a2a16', x, y + 3, w, 11); for (let i = 0; i < o.w; i++) { R(c, '#5b4326', x + i * TS + 1, y + 1, 14, 9); R(c, '#7a5a34', x + i * TS + 1, y + 1, 14, 2); } break;
    case 'furnace': {
      R(c, '#2a2623', x, y + 2, w, h - 2); R(c, '#4a443e', x + 1, y + 3, w - 2, h - 5); R(c, '#6a635a', x + 1, y + 3, w - 2, 2);
      R(c, '#15110f', x + 7, y + 14, 14, 11); R(c, '#3a1a0c', x + 8, y + 15, 12, 9); R(c, '#2a2623', x + 4, y - 6, 6, 10); R(c, '#4a443e', x + 4, y - 6, 6, 2); // 굴뚝
      break;
    }
    case 'sofa': R(c, '#2e1c1c', x, y + 2, w, 13); R(c, '#4d2f2f', x + 2, y + 5, w - 4, 8); for (let i = 1; i < o.w; i++) R(c, '#2e1c1c', x + i * TS, y + 5, 1, 8); break;
    case 'vending': R(c, '#1c2229', x + 1, y, 14, 16); R(c, '#0d2a33', x + 3, y + 2, 10, 8); R(c, '#6f95a8', x + 4, y + 3, 8, 1); R(c, '#c9a24a', x + 4, y + 12, 8, 2); break;
    default: break;
  }
}
