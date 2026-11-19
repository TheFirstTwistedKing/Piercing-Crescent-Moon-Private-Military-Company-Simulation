// CCTV: 10개 채널. 그리드(모니터 월) ↔ 확대 보기. 카메라 영상은 월드 캔버스를 잘라 확대한 것(흑백+노이즈 필터).
import * as Audio from '../core/audio.js';
import { engine } from '../game/engine.js';
import { drawFeed, CAMERAS, CAM_W, CAM_H } from '../game/render.js';
import { ROOM_LABEL, DEPT } from '../game/data.js';
import { clockInfo } from '../game/sim.js';
import { h, icon } from '../core/ui.js';
import { buildSpeed } from './speed.js';

const NAMES = { gate: '정문 / 마당' };

export function mountCctv(root, ctx) {
  const sim = engine.sim;
  let focus = -1;
  const feeds = CAMERAS.map((cam, i) => {
    const cv = h('canvas', { class: 'feed-cv', width: CAM_W * 2, height: CAM_H * 2 });
    const label = NAMES[cam.key] || ROOM_LABEL[cam.key];
    const rec = h('i', { class: 'rec' }), ts = h('span', { class: 'ts' }), count = h('span', { class: 'cnt' });
    const el = h('button', { class: 'feed', type: 'button', 'aria-label': `${cam.id} ${label} 확대`, onclick: () => { Audio.sfx('select'); setFocus(focus === i ? -1 : i); } },
      cv, h('span', { class: 'noise' }), h('span', { class: 'ov tl' }, h('b', {}, cam.id), h('span', { class: 'nm' }, ' ' + label)), h('span', { class: 'ov tr' }, rec, 'REC'), h('span', { class: 'ov bl' }, ts), h('span', { class: 'ov br' }, count));
    return { el, cv, ctx: cv.getContext('2d'), cam, ts, count };
  });
  const grid = h('div', { class: 'feeds' }, feeds.map((f) => f.el));
  const roster = h('div', { class: 'cam-roster' });
  const setFocus = (i) => { focus = i; grid.classList.toggle('has-focus', i >= 0); feeds.forEach((f, k) => f.el.classList.toggle('focus', k === i)); paintRoster(); };
  const paintRoster = () => {
    if (focus < 0) { roster.replaceChildren(h('p', { class: 'hint' }, '채널을 누르면 확대됩니다.')); return; }
    const f = feeds[focus], here = sim.units.filter((u) => !u.away && inCam(u, f.cam));
    roster.replaceChildren(h('h4', {}, `${f.cam.id} · ${NAMES[f.cam.key] || ROOM_LABEL[f.cam.key]}`), here.length ? h('ul', {}, ...here.map((u) => h('li', {}, h('i', { class: 'dot', style: `background:${DEPT[u.dept].color}` }), u.name, h('em', { class: 'lat' }, u.latin), h('small', {}, sim.statusText(u))))) : h('p', { class: 'hint' }, '화면 안에 인원이 없습니다.'));
  };
  const inCam = (u, cam) => Math.abs(u.x - cam.cx) < CAM_W / 2 && Math.abs(u.y - cam.cy) < CAM_H / 2;

  let acc = 0, frameNo = 0, rosterT = 0;
  const off = engine.addView((now, dt) => {
    acc += dt; frameNo++;
    const q = engine.quality, every = q >= 2 ? 1 : q === 1 ? 2 : 4;   // 썸네일 갱신 간격(프레임) — 품질에 따라 감소
    const c = clockInfo(sim.clock);
    feeds.forEach((f, i) => {
      const big = i === focus;
      if (!big && (frameNo + i) % every) return;
      if (focus >= 0 && !big && (frameNo + i) % (every * 3)) return;   // 확대 중엔 나머지를 더 느리게
      drawFeed(f.ctx, engine.world, i, f.cv.width, f.cv.height);
      // 흑백 CCTV 화면: CSS filter 대신 캔버스 'saturation' 블렌드로 채도 제거(10개 피드를 CSS 필터로 매 프레임 다시 그리는 비용을 피함)
      f.ctx.globalCompositeOperation = 'saturation'; f.ctx.fillStyle = '#808080'; f.ctx.fillRect(0, 0, f.cv.width, f.cv.height); f.ctx.globalCompositeOperation = 'source-over';
      f.ts.textContent = `DAY ${String(sim.day).padStart(3, '0')} ${c.text}`;
      f.count.textContent = `${sim.units.filter((u) => !u.away && inCam(u, f.cam)).length}명`;
    });
    if ((rosterT += dt) > 0.5) { rosterT = 0; paintRoster(); }
  });

  const sp = buildSpeed(sim), speed = sp.el, paintSpeed = sp.paint;
  const clk = h('span', { class: 'clk' }); const tick = setInterval(() => { const c = clockInfo(sim.clock); clk.textContent = `DAY ${String(sim.day).padStart(3, '0')} · ${c.text} ${c.phase}`; paintSpeed(); }, 400);

  root.append(h('div', { class: 'cctv screen' },
    h('header', { class: 'bar' }, h('button', { class: 'back', type: 'button', onclick: () => { Audio.sfx('select'); ctx.go('#/panel'); }, html: `${icon('back', 18)}<span>메인 패널</span>` }),
      h('div', { class: 'bar-title' }, h('b', {}, 'CCTV'), h('small', {}, '10 CHANNELS')), h('span', { class: 'grow' }), clk, speed),
    h('div', { class: 'cctv-body' }, grid, roster)));
  setFocus(-1);
  return () => { off(); clearInterval(tick); };
}
