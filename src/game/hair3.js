// 머리카락 생성기(실제 픽셀 단위) — 가발 참고 사진 5종을 '가닥(락)을 겹쳐 그리는' 방식으로 만든다.
// 가닥 = 시작점 · 방향 · 길이 · 휘는 정도로 정해지는 곡선 붓(끝으로 갈수록 뾰족). 나중에 그린 가닥이 위에 놓이고, 위 가닥에 가려진 아래 가닥은 경계가 어두워 입체감이 난다.
// 스타일 도안은 hair-wigs.js. 좌표는 머리 기준 상대 픽셀: u = 머리 가운데에서 오른쪽(+), v = 정수리(대머리 윗줄)에서 아래(+). 앞/뒤는 좌우 대칭이 기본, 옆모습은 오른쪽(+u)이 얼굴.
import { WIG_BUILD } from './hair-wigs.js';

const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const hs = (n) => { let h = (n * 374761393) >>> 0; h = ((h ^ (h >> 13)) * 1274126177) >>> 0; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };
const RAD = Math.PI / 180, sr = (v) => (v < 0 ? -Math.round(-v) : Math.round(v));   // 좌우 대칭 반올림

/** 그림판(상대 좌표, 범위 제한 없음). 픽셀마다 {layer, pos(가닥 폭 안 위치 -1..1), nx, ny(가닥 법선), t(가닥 길이 0..1), acc(포인트색 0/1), kind} */
export class Cv {
  constructor() { this.px = new Map(); this.layer = 0; }
  k(x, y) { return (y + 200) * 1000 + (x + 200); }
  has(x, y) { return this.px.has(this.k(x, y)); }
  put(x, y, p) { this.px.set(this.k(x, y), { ...p, x, y }); }
  del(x, y) { this.px.delete(this.k(x, y)); }
  next() { return ++this.layer; }
  /** 곡선 가닥: (x,y)에서 ang(도, 0=오른쪽 90=아래)로 시작해 길이 len, 1픽셀 갈 때마다 curv(도)씩 휜다(curv2: 끝쪽에서 더 휘는 양). 폭 w → 끝은 뾰족. */
  lock(x, y, ang, len, curv, w, o = {}) {
    const L = this.next(), step = 0.5, n = Math.max(2, Math.ceil(len / step)); let a = ang * RAD, px = x, py = y;
    for (let i = 0; i <= n; i++) {
      const t = i / n, wd = Math.max(o.minW ?? 1, w * Math.pow(1 - t, o.taper ?? 0.75) + (o.tipW ?? 0)), nx = -Math.sin(a), ny = Math.cos(a);
      const acc = o.acc === true || (o.accTip !== undefined && t >= o.accTip) || (o.accRoot !== undefined && t <= o.accRoot) ? 1 : 0;
      for (let s = -wd / 2; s <= wd / 2 + 0.01; s += 0.5) this.put(sr(px + nx * s), Math.round(py + ny * s), { layer: L, pos: wd <= 1.4 ? 0 : s / (wd / 2), nx, ny, t, acc, kind: 'lock', gap: !!o.gap });
      a += (curv + (o.curv2 || 0) * t + (o.wave ? o.wave.amp * Math.sin(o.wave.f * i + (o.wave.ph || 0)) : 0)) * 0.5 * RAD; px += Math.cos(a) * step; py += Math.sin(a) * step;
    }
  }
  /** 두피 덩어리(타원, 가닥 아래 바탕). clip(x,y) 으로 잘라낸다. */
  cap(cx, cy, rx, ry, o = {}) {
    const L = this.next();
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / (rx + 0.4), dy = (y + 0.5 - cy) / (ry + 0.4);
      if (dx * dx + dy * dy <= 1 && (!o.clip || o.clip(x, y))) this.put(x, y, { layer: L, pos: 0, nx: 0, ny: -1, t: 0, acc: o.acc ? 1 : 0, kind: 'cap', cu: x - cx, cv: y + 0.5 - cy });
    }
  }
  /** 머리 숱(덩어리): span(v) → [[u0,u1], ...] 구간 목록을 줄마다 채운다(v0..v1). 가닥 사이를 메워 속이 비지 않게 한다. */
  mass(span, v0, v1, o = {}) {
    const L = this.next();
    for (let v = Math.ceil(v0); v <= v1; v++) for (const [a, b] of span(v) || []) for (let u = Math.ceil(a); u <= Math.floor(b); u++) if (!o.clip || !o.clip(u, v)) this.put(u, v, { layer: L, pos: 0, nx: 0, ny: -1, t: 0, acc: o.acc ? 1 : 0, kind: 'mass', mu: u + 0.5, mv: v, sheen: o.sheen ?? -3, bandV: o.bandV ?? 99, dim: o.dim ?? 1 });
  }
  /** 땋은 머리/묶음 꼬리: (x,y)에서 아래로 len 칸, 폭 w(끝으로 갈수록 가늘어짐), 어긋난 마디 + 포인트색 마디. */
  braid(x, y, len, w, o = {}) {
    const L = this.next();
    for (let i = 0; i <= len; i++) {
      const t = i / len, wd = Math.max(1, Math.round(w * (1 - (o.taper ?? 0.5) * t))), sway = o.sway ? Math.round(Math.sin(i * (o.swayF ?? 0.5)) * o.sway) : 0, drift = Math.round((o.drift || 0) * t);
      for (let s = 0; s < wd; s++) this.put(Math.round(x - wd / 2 + s + sway + drift), y + i, { layer: L, pos: wd > 1 ? (s / (wd - 1)) * 2 - 1 : 0, nx: 1, ny: 0, t, acc: (o.accTip !== undefined && t >= o.accTip) || (o.accMid && i % 4 === 2) ? 1 : 0, kind: 'lock', knot: !!o.knot && i % 3 === 0 });
    }
  }
}

/** 한 줄 위에 n개의 가닥을 부채꼴로 깐다: 시작점이 (x0,y0)→(x1,y1)로, 방향은 a0→a1, 길이는 len0→len1, 휘는 정도 curv(+curvS: 끝쪽 가닥이 더 휨). seed 로 길이에 변화(jit). */
export function fan(cv, f) {
  const n = f.n;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1), x = f.x0 + (f.x1 - f.x0) * t, y = f.y0 + (f.y1 - f.y0) * t, a = f.a0 + (f.a1 - f.a0) * t;
    const len = f.len0 + (f.len1 - f.len0) * t + (hs((f.seed || 1) * 31 + i * 7) - 0.5) * (f.jit ?? 2);
    cv.lock(x, y, a, Math.max(2, len), f.curv + (f.curvS ? f.curvS * (t - 0.5) * 2 : 0), f.w, { acc: f.acc, accTip: f.accTip, accRoot: f.accRoot, curv2: f.curv2, taper: f.taper, tipW: f.tipW, minW: f.minW, wave: f.wave && { ...f.wave, ph: (f.wave.ph || 0) + (f.wavePhS || 0) * i } });
  }
}
/** 좌우 대칭 부채꼴: 오른쪽 절반(f)과 거울상(왼쪽)을 같이 그린다. */
export function fanSym(cv, f) {
  fan(cv, { ...f, x0: -f.x0, x1: -f.x1, a0: 180 - f.a0, a1: 180 - f.a1, curv: -f.curv, curv2: f.curv2 ? -f.curv2 : 0, curvS: f.curvS ? -f.curvS : 0, wave: f.wave && { ...f.wave, amp: -f.wave.amp }, seed: (f.seed || 1) });
  fan(cv, f);
}
export function lockSym(cv, x, y, ang, len, curv, w, o = {}) { cv.lock(-x, y, 180 - ang, len, -curv, w, { ...o, curv2: o.curv2 ? -o.curv2 : 0 }); cv.lock(x, y, ang, len, curv, w, o); }

/** 가장자리 거칠게(층진 끝): 아래·옆 윤곽 픽셀에서 일부를 1~2칸 뾰족하게 뻗거나 한 칸 파낸다. 앞/뒤는 |u| 로 해시해 좌우 같은 모양. 얼굴 영역은 건드리지 않는다. */
function rough(cv, view, amt = 1) {
  const sym = view !== 'side', key = (u) => (sym ? Math.abs(u) : u), face = (u, v) => (view === 'down' ? v >= 3 && v <= 14 && Math.abs(u) < 6 : view === 'side' ? u >= 4 && v >= 2 && v <= 14 : false);
  const add = [], del = [];
  for (const p of cv.px.values()) {
    const { x: u, y: v } = p; if (v < 2) continue; const r = hs(key(u) * 17 + v * 29 + 3), r2 = hs(key(u) * 7 + v * 13 + 11), low = v > 16 ? 0.6 : 1;
    if (!cv.has(u, v + 1) && !face(u, v + 1)) { if (r < 0.34 * amt * low) { add.push([u, v + 1, p]); if (r < 0.12 * amt * low && !face(u, v + 2)) add.push([u, v + 2, p]); } else if (r < 0.46 * amt) del.push([u, v]); }
    const sx = sym ? Math.sign(u) || 1 : 1; if (sym && !cv.has(u + sx, v) && !face(u + sx, v) && r2 < 0.16 * amt * low && Math.abs(u) > 6) add.push([u + sx, v, p]);
    if (!sym && !cv.has(u - 1, v) && u < 0 && r2 < 0.16 * amt * low) add.push([u - 1, v, p]);
  }
  for (const [u, v] of del) cv.del(u, v);
  for (const [u, v, p] of add) if (!cv.has(u, v)) cv.put(u, v, { ...p, t: Math.min(1, (p.t || 0) + 0.2) });
}

/** 칠하기: 가닥/덩어리 → 5단계 톤 + 겹침 그림자 + 윤곽 */
const LV = [-70, -40, 0, 26, 54];
function render(cv, view, c0, cA) {
  const luma = c0[0] * 0.3 + c0[1] * 0.59 + c0[2] * 0.11, dark = luma < 80, bright = luma > 200, hi = dark ? 1.7 : bright ? 0.8 : 1, lo = dark ? 0.5 : bright ? 1.15 : 1;
  const side = view === 'side', Lx = side ? 0.35 : -0.3, Ly = -0.93, out = [];
  const lay = (x, y) => (cv.px.get(cv.k(x, y)) || { layer: -1 }).layer;
  for (const p of cv.px.values()) {
    const { x, y } = p; let lv = 2;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !cv.has(x + dx, y + dy));
    if (p.kind === 'cap') {
      const u = p.cu, v = p.cv; lv = 2 + (v < -1.5 ? 1 : 0) + (Math.hypot(u + (side ? -1 : 0), v + 2.6) < 2.4 ? 1 : 0) - (Math.abs(u) > 5.8 ? 1 : 0) - (v > 3 ? 1 : 0);
    } else if (p.kind === 'mass') {
      // 숱 덩어리: 위쪽·정수리 쪽이 밝고, 세로 결(어긋난 줄) + 빛 줄기(sheen) + 아래·바깥으로 갈수록 어두움
      const u = p.mu, v = p.mv, streak = (((Math.round(u) + 40 + Math.floor(v / 5)) % 4) + 4) % 4 === 0 && v > 1;
      lv = 2 + (v < -1.5 ? 1 : 0) + (Math.abs(u - (side ? p.sheen + 3 : p.sheen)) < 1.1 && v > -2 ? 1 : 0) - (streak ? 1 : 0) - (v > p.bandV ? 1 : 0) - (p.dim || 0);
      if (side ? u > 3.5 : Math.abs(u) > 8.2) lv -= 1;
    } else {
      const facing = p.nx * Lx + p.ny * Ly, wide = p.pos !== 0;
      lv = 2 + (wide ? Math.round(1.5 * p.pos * Math.sign(facing || 1) * Math.min(1, Math.abs(facing) * 1.6 + 0.2)) : 0);
      if (wide && Math.abs(p.pos) < 0.34 && facing * p.pos >= 0) lv += 1;      // 가닥 가운데 윤기
      if (p.t > 0.86) lv -= 1;                                                  // 끝
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (lay(x + dx, y + dy) > p.layer) { lv -= 1; break; }   // 위 가닥에 눌린 경계
    }
    if (p.gap) lv = 0;                                                            // 가닥 사이 어두운 틈
    lv = Math.max(0, Math.min(4, lv));
    let off = LV[lv] * (lv >= 3 ? hi : lo); const base = p.acc ? cA : c0;
    if (edge) off = -92 * lo - (cv.has(x, y + 1) ? 0 : 8);                      // 윤곽
    out.push([x, y, toHex(base.map((c) => c + off))]);
  }
  return out;
}

/** 스타일 → 그리기. style.id 로 hair-wigs.js 의 도안을 찾는다. 포인트색(tip) 이 없으면 스타일의 기본 포인트색(머리색에서 계산). */
export function drawHair3(P, view, style, col, tip, box) {
  const build = WIG_BUILD[style.id]; if (!build) return;
  const bx = box || { x0: 10, x1: 22, top: 5 }, cx = Math.floor((bx.x0 + bx.x1 + 1) / 2), T = bx.top, c0 = hex(col), cA = hex(tip || (style.accent ? style.accent(col) : toHex(c0.map((v) => v + 90))));
  const cv = new Cv(); build(cv, view); rough(cv, view, style.rough ?? 1);
  const m = new Cv(); for (const p of cv.px.values()) { const x = cx + p.x, y = T + p.y; if (x >= 0 && x <= 31 && y >= 0 && y <= 47) m.put(x, y, { ...p }); }
  m.layer = cv.layer;
  const px = render(m, view, c0, cA), rows = new Map();
  for (const [x, y, c] of px) { if (!rows.has(y)) rows.set(y, []); rows.get(y).push([x, c]); }
  for (const [y, list] of rows) { list.sort((a, b) => a[0] - b[0]); let i = 0; while (i < list.length) { let j = i; while (j + 1 < list.length && list[j + 1][0] === list[j][0] + 1 && list[j + 1][1] === list[i][1]) j++; P(list[i][1], list[i][0], y, j - i + 1, 1); i = j + 1; } }
}
export const tint = (col, d) => toHex(hex(col).map((v) => v + d));
