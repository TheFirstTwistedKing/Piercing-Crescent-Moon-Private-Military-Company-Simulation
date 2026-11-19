// 엔진: Sim + World 를 하나로 묶고 rAF 루프/자동저장/성능 적응을 담당한다. (현장·CCTV 화면이 공유)
import { Sim } from './sim.js';
import { World } from './render.js';
import { backend } from '../core/backend.js';
import { assertHolder } from '../core/session.js';

const listeners = new Set();
export const engine = {
  sim: null, world: null, uid: null, running: false, raf: 0, last: 0, views: new Set(),
  lastWall: 0, bg: { sec: 0, game: 0, missions: 0, ended: false }, fps: 60, quality: 2, lastSave: 0, saving: false, cam: { cx: 28 * 16, cy: 18 * 16, zoom: 3 }, loaded: false,

  async start(uid) {
    if (this.running && this.uid === uid) return;
    this.stop();
    this.uid = uid;
    let saved = null;
    try { saved = await backend.loadGame(uid); } catch (e) { console.warn('불러오기 실패, 새 게임으로 시작', e); }
    this.sim = new Sim(saved);
    this.world = new World();
    this.sim.on('toast', (e) => { for (const f of listeners) f(e); });
    this.running = true; this.last = performance.now(); this.lastSave = this.last; this.loaded = true; this.lastWall = Date.now();
    const frame = (now) => {
      if (!this.running) return;
      const dtReal = Math.min(0.1, (now - this.last) / 1000); this.last = now;
      // 화면이 멈춰 있던 동안(Android 백그라운드 등) 흐른 실제 시간만큼 따라잡는다
      const wall = Date.now(), gap = (wall - this.lastWall) / 1000; this.lastWall = wall;
      if (gap > 0.6) this.catchUp(gap - dtReal);
      if (this.bg.sec > 0) this.flushBg();
      this.adapt(dtReal);
      this.sim.update(dtReal);
      if (this.views.size) { this.world.quality = this.quality; this.world.draw(this.sim, now); for (const v of this.views) v(now, dtReal); }
      if (now - this.lastSave > 25000) { this.lastSave = now; this.save(); }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
    this._vis = () => { if (document.hidden) this.save(); };
    // 백그라운드(숨김) 상태에서도 1초마다 실제 경과 시간만큼 시뮬레이션을 진행한다. (브라우저가 타이머를 늦추면 gap 이 커질 뿐 시간은 정확히 따라잡는다)
    this._bgTimer = setInterval(() => { if (!document.hidden || !this.sim) return; const w = Date.now(), g = (w - this.lastWall) / 1000; this.lastWall = w; if (g > 0) this.catchUp(g); }, 1000);
    document.addEventListener('visibilitychange', this._vis);
    window.addEventListener('pagehide', this._vis);
  },
  stop() {
    this.running = false; cancelAnimationFrame(this.raf); clearInterval(this._bgTimer); this.bg = { sec: 0, game: 0, missions: 0, ended: false };
    if (this._vis) { document.removeEventListener('visibilitychange', this._vis); window.removeEventListener('pagehide', this._vis); this._vis = null; }
    this.sim = null; this.world = null; this.uid = null; this.loaded = false; this.views.clear();
  },
  /** 실제 sec 초만큼 조용히 진행(토스트 없이)하고 결과를 모아 둔다 */
  catchUp(sec) {
    const sim = this.sim; if (!sim || sec <= 0) return;
    const m0 = sim.dayLog.missions.length, c0 = sim.clock, was = sim.ended;
    sim.quiet = true; try { sim.advance(Math.min(sec, 3600)); } finally { sim.quiet = false; }
    this.bg.sec += sec; this.bg.game += sim.clock - c0; this.bg.missions += sim.dayLog.missions.length - m0; this.bg.ended = this.bg.ended || (!was && sim.ended);
  },
  flushBg() {
    const b = this.bg; this.bg = { sec: 0, game: 0, missions: 0, ended: false };
    if (b.sec < 3 || (b.game < 0.5 && !b.ended)) return;
    const text = `백그라운드에서 ${Math.round(b.sec)}초 동안 게임 시간 ${Math.round(b.game)}분이 지났습니다${b.missions ? ` · 임무 ${b.missions}건 종료` : ''}${b.ended ? ' · 하루가 종료되었습니다' : ''}`;
    for (const f of listeners) f({ text, kind: 'info' });
  },
  onToast(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  addView(fn) { this.views.add(fn); return () => this.views.delete(fn); },
  async save() {
    if (!this.sim || !this.uid || this.saving) return;
    this.saving = true;
    try { await assertHolder(); await backend.saveGame(this.uid, this.sim.serialize()); } catch (e) { if (e.message !== 'session-lost') console.warn('자동 저장 실패', e); }
    this.saving = false;
  },
  // 성능 적응: 평균 FPS 가 40 아래로 2초 지속되면 품질을 낮추고, 58 이상이 8초 지속되면 올린다. (최저 30fps 유지가 목표)
  _lowT: 0, _highT: 0,
  adapt(dt) {
    if (!this.views.size) return;
    this.fps += (1 / Math.max(dt, 0.001) - this.fps) * 0.05;
    if (this.fps < 40) { this._lowT += dt; this._highT = 0; } else if (this.fps > 58) { this._highT += dt; this._lowT = 0; } else { this._lowT = this._highT = 0; }
    if (this._lowT > 2 && this.quality > 0) { this.quality--; this._lowT = 0; document.body.classList.toggle('lowfx', this.quality === 0); }
    if (this._highT > 8 && this.quality < 2) { this.quality++; this._highT = 0; document.body.classList.toggle('lowfx', this.quality === 0); }
  },
};
