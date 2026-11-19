// 정지 / 재생 / 2배속 / 3배속(연구로 해금) 컨트롤 — 현장 지휘와 CCTV 가 함께 쓴다.
import * as Audio from '../core/audio.js';
import { h, icon } from '../core/ui.js';

export function buildSpeed(sim) {
  const defs = [['pause', 0, '정지 (Space)'], ['play', 1, '재생 (1)'], ['fast', 2, '2배속 (2)'], ['fast3', 3, '3배속 (3)']];
  const el = h('div', { class: 'speed' }, ...defs.map(([ic, v, label]) => h('button', {
    class: 'icon-btn', type: 'button', 'data-s': v, 'aria-label': label, title: label, html: icon(ic, 18),
    onclick: () => { if (v === 3 && !sim.research.speed3) { Audio.sfx('error'); paint(); return; } sim.setSpeed(v); Audio.sfx('click'); paint(); },
  })));
  const paint = () => el.querySelectorAll('button').forEach((b) => {
    const v = +b.dataset.s; b.classList.toggle('on', v === sim.speed);
    if (v === 3) { const lock = !sim.research.speed3; b.classList.toggle('locked', lock); b.title = lock ? '3배속 — 연구에서 해금하세요' : '3배속 (3)'; b.setAttribute('aria-disabled', String(lock)); }
  });
  paint();
  return { el, paint };
}
