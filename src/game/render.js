// 월드 렌더러: 896×576 픽셀 월드를 한 번 그리고, 각 화면(현장/CCTV)이 잘라서 확대해 보여준다.
import { WORLD_W, WORLD_H, MW, MH, TS, floorKind, renderStatic, LAMPS, CAMERAS, CAM_W, CAM_H, SLOTS, FURNACE } from './map.js';
import { ITEM } from './shop.js';
import { drawFurnitureIcon } from './furniture-art.js';
import { getSheet, drawShadow, CW, CH, OX, DIR_INDEX } from './sprites.js';
import { DEPT } from './data.js';
import { clockInfo } from './sim.js';

const WALK_FRAMES = [1, 0, 2, 0];
const hash1 = (n) => { let x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const hash2 = (x, y) => { let h = (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export class World {
  constructor() {
    this.cv = Object.assign(document.createElement('canvas'), { width: WORLD_W, height: WORLD_H });
    this.ctx = this.cv.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
    this.static = renderStatic();
    this.lightCv = Object.assign(document.createElement('canvas'), { width: WORLD_W, height: WORLD_H });
    this.lightCtx = this.lightCv.getContext('2d');
    this.lightKey = -1;
    this.lamp = this.makeLampSprite(); this.glow = this.makeGlowSprite();
    this.selected = null; this.quality = 2;
    this.snowCv = Object.assign(document.createElement('canvas'), { width: WORLD_W, height: WORLD_H }); this.snowKey = -1;
    this.fog = this.makeFogSprite();
    this.seeds = Array.from({ length: 130 }, (_, i) => [hash1(i * 3 + 1), hash1(i * 3 + 2), hash1(i * 3 + 3)]);
  }
  makeFogSprite() {
    const c = Object.assign(document.createElement('canvas'), { width: 128, height: 128 }), g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64); gr.addColorStop(0, 'rgba(214,222,232,.62)'); gr.addColorStop(1, 'rgba(214,222,232,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c;
  }
  // 마당의 적설: 칸마다 정해진 임계값보다 적설이 많으면 눈이 덮인다. 5% 단위로만 다시 그린다.
  rebuildSnow(level) {
    const g = this.snowCv.getContext('2d'); g.clearRect(0, 0, WORLD_W, WORLD_H); const th = level / 100;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      if (floorKind[y * MW + x] !== 0) continue;
      const h = hash2(x, y), px = x * TS, py = y * TS;
      if (h < th) { g.fillStyle = '#dce7f2'; g.fillRect(px, py, TS, TS); g.fillStyle = '#c4d4e6'; g.fillRect(px + ((h * 977) % 11 | 0), py + ((h * 613) % 11 | 0), 3, 1); g.fillStyle = '#f2f8fc'; g.fillRect(px + ((h * 331) % 12 | 0), py + ((h * 719) % 12 | 0), 2, 2); }
      else if (h < th + 0.18) { g.fillStyle = '#e4edf6'; g.fillRect(px + ((h * 421) % 8 | 0), py + ((h * 233) % 8 | 0), 5, 3); g.fillRect(px + ((h * 877) % 9 | 0), py + 9, 4, 2); }
    }
  }
  drawFurniture(sim) {
    for (const room of Object.keys(sim.placed)) sim.placed[room].forEach((id, i) => { if (id && SLOTS[room]?.[i]) { const [x, y] = SLOTS[room][i]; drawFurnitureIcon(this.ctx, ITEM[id], x * TS, y * TS); } });
  }
  // 날씨 연출: 움직임은 느리고 투명도는 낮게(깜빡임·번쩍임 없음). 품질 0 에서는 입자를 생략한다.
  drawWeather(key, t, furnace) {
    const c = this.ctx, W = WORLD_W, H = WORLD_H, q = this.quality;
    if (key === 'rain') {
      c.fillStyle = 'rgba(70,90,120,.10)'; c.fillRect(0, 0, W, H);
      if (q >= 1) { c.fillStyle = 'rgba(176,200,232,.42)'; for (const [a, b, d] of this.seeds) { const x = (((a * W + t * 0.045 * (0.8 + d * 0.4)) % W) + W) % W, y = (((b * H + t * 0.28 * (0.8 + d * 0.4)) % H) + H) % H; c.fillRect(x | 0, y | 0, 1, 4); } }
    } else if (key === 'cold') {
      c.fillStyle = 'rgba(110,150,214,.13)'; c.fillRect(0, 0, W, H);
      if (q >= 1) { c.fillStyle = 'rgba(244,248,255,.85)'; for (const [a, b, d] of this.seeds) { const x = (((a * W + Math.sin(t / 900 + d * 9) * 10 + t * 0.012) % W) + W) % W, y = (((b * H + t * (0.022 + d * 0.02)) % H) + H) % H; c.fillRect(x | 0, y | 0, d > 0.7 ? 2 : 1, d > 0.7 ? 2 : 1); } }
    } else if (key === 'fog') {
      c.fillStyle = 'rgba(204,213,224,.24)'; c.fillRect(0, 0, W, H);
      if (q >= 1) for (let i = 0; i < 6; i++) { const x = (((i * 190 + t * 0.006 * (1 + i % 3)) % (W + 300)) + W + 300) % (W + 300) - 150, y = 60 + ((i * 97) % 440); c.drawImage(this.fog, x - 120, y - 120, 280, 240); }
    }
    if (furnace) {   // 용광로 불빛과 연기
      const fx = FURNACE.x * TS + 14, fy = FURNACE.y * TS + 20;
      c.fillStyle = 'rgba(255,150,60,.30)'; c.fillRect(fx - 14, fy - 12, 28, 24); c.fillStyle = 'rgba(255,196,110,.5)'; c.fillRect(fx - 4, fy - 3, 8, 6);
      if (q >= 1) for (let i = 0; i < 4; i++) { const p = ((t / 1800 + i / 4) % 1); c.fillStyle = `rgba(200,200,205,${0.35 * (1 - p)})`; const sz = 3 + p * 5; c.fillRect(FURNACE.x * TS + 7 + Math.sin(p * 6 + i) * 3 - sz / 2, FURNACE.y * TS - 8 - p * 34, sz, sz); }
    }
  }
  makeLampSprite() {
    const c = Object.assign(document.createElement('canvas'), { width: 128, height: 128 }), g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c;
  }
  makeGlowSprite() {
    const c = Object.assign(document.createElement('canvas'), { width: 64, height: 64 }), g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 1, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,214,150,.55)'); gr.addColorStop(1, 'rgba(255,214,150,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c;
  }
  // 낮/밤 어둠 정도. 06:00 새벽 → 점차 밝아지고, 17~19시에 어두워짐, 밤 최대 0.6(가독성을 위해 완전한 암전은 쓰지 않음)
  nightAlpha(clock) {
    const h = clock / 60;
    if (h < 1) return 0.38 * (1 - h);
    if (h < 11) return 0;
    if (h < 13) return 0.6 * ((h - 11) / 2);
    return 0.6;
  }
  rebuildLight(alpha) {
    const c = this.lightCtx; c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, WORLD_W, WORLD_H);
    c.fillStyle = `rgba(6,10,24,${alpha})`; c.fillRect(0, 0, WORLD_W, WORLD_H);
    if (this.quality >= 1) { c.globalCompositeOperation = 'destination-out'; for (const l of LAMPS) c.drawImage(this.lamp, l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); }
    c.globalCompositeOperation = 'source-over';
  }
  draw(sim, t) {
    const c = this.ctx;
    c.drawImage(this.static, 0, 0);
    const lv = Math.round(sim.snow / 5); if (lv !== this.snowKey) { this.rebuildSnow(lv * 5); this.snowKey = lv; }
    c.drawImage(this.snowCv, 0, 0);
    this.drawFurniture(sim);
    const list = sim.units.filter((u) => !u.away).sort((a, b) => a.y - b.y);
    for (const u of list) {
      drawShadow(c, u.x, u.y);
      const f = u.moving ? WALK_FRAMES[Math.floor(u.anim) % 4] : 0;
      c.drawImage(getSheet(u), f * CW, DIR_INDEX[u.dir] * CH, CW, CH, Math.round(u.x - 8 - OX), Math.round(u.y - 22), CW, CH);
    }
    const a = this.nightAlpha(sim.clock);
    if (a > 0.01) {
      const key = Math.round(a * 50) + this.quality * 100;
      if (key !== this.lightKey) { this.rebuildLight(a); this.lightKey = key; }
      c.drawImage(this.lightCv, 0, 0);
      if (this.quality >= 2) { c.globalCompositeOperation = 'lighter'; for (const u of list) if (u.mode === 'patrol') c.drawImage(this.glow, u.x - 30, u.y - 40, 60, 60); c.globalCompositeOperation = 'source-over'; }
    }
    this.drawWeather(sim.weather.today, t, sim.furnaceActive);
    // 선택 표시(어둠 위에 그림)
    const sel = this.selected && sim.byId[this.selected];
    if (sel && !sel.away) {
      const col = DEPT[sel.dept].color, bob = Math.round(Math.sin(t / 380) * 1.5);
      c.fillStyle = col; c.globalAlpha = 0.9;
      c.fillRect(sel.x - 7, sel.y, 14, 1); c.fillRect(sel.x - 5, sel.y + 1, 10, 1); c.fillRect(sel.x - 5, sel.y - 1, 10, 1);
      c.globalAlpha = 1; c.fillStyle = '#ffb23e';
      c.fillRect(sel.x - 2, sel.y - 31 + bob, 5, 1); c.fillRect(sel.x - 1, sel.y - 30 + bob, 3, 1); c.fillRect(sel.x, sel.y - 29 + bob, 1, 1);
    }
  }
  pick(sim, wx, wy) {
    let best = null;
    for (const u of sim.units) {
      if (u.away) continue;
      if (wx >= u.x - 9 && wx <= u.x + 9 && wy >= u.y - 24 && wy <= u.y + 3 && (!best || u.y > best.y)) best = u;
    }
    return best;
  }
}

/** 카메라 시점 계산 + 블릿. cam = {cx, cy, zoom} (zoom = 월드 1px 당 CSS px) */
export function viewRect(cam, w, h, scale) {
  const vw = w / scale, vh = h / scale;
  let cx = cam.cx, cy = cam.cy;
  cx = vw >= WORLD_W ? WORLD_W / 2 : Math.max(vw / 2, Math.min(WORLD_W - vw / 2, cx));
  cy = vh >= WORLD_H ? WORLD_H / 2 : Math.max(vh / 2, Math.min(WORLD_H - vh / 2, cy));
  cx = Math.round(cx * scale) / scale; cy = Math.round(cy * scale) / scale;
  return { x: cx - vw / 2, y: cy - vh / 2, w: vw, h: vh, cx, cy };
}
export function blitView(dst, world, cam, w, h, scale) {
  dst.imageSmoothingEnabled = false;
  dst.fillStyle = '#050403'; dst.fillRect(0, 0, w, h);
  const r = viewRect(cam, w, h, scale);
  const sx = Math.max(0, r.x), sy = Math.max(0, r.y), ex = Math.min(WORLD_W, r.x + r.w), ey = Math.min(WORLD_H, r.y + r.h);
  if (ex > sx && ey > sy) dst.drawImage(world.cv, sx, sy, ex - sx, ey - sy, (sx - r.x) * scale, (sy - r.y) * scale, (ex - sx) * scale, (ey - sy) * scale);
  return r;
}
export function drawFeed(dst, world, camIdx, w, h) {
  const cam = CAMERAS[camIdx]; const scale = w / CAM_W;
  return blitView(dst, world, { cx: cam.cx, cy: cam.cy }, w, h, scale);
}
export { CAMERAS, CAM_W, CAM_H, clockInfo };
