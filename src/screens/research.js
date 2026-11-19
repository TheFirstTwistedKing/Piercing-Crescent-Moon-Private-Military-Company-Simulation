// 연구: 연구 포인트(보고서를 올릴 때마다 +1)로 능력 해금, 3배속, 수입 증가 등을 연구한다.
import * as Audio from '../core/audio.js';
import { engine } from '../game/engine.js';
import { RESEARCH } from '../game/research.js';
import { h, icon } from '../core/ui.js';

export function mountResearch(root, ctx) {
  const sim = engine.sim;
  const wrap = h('div', { class: 'rs screen' });
  const row = (d) => {
    const st = sim.researchState(d.key);
    let state = st.done ? '완료' : `필요 ${st.cost} pt`;
    if (d.kind === 'level') state = st.done ? `최대 단계 (${st.level}/${st.max})` : `Lv ${st.level}/${st.max} → 다음 ${st.cost} pt`;
    let extra = '';
    if (d.key === 'income') extra = ` · 현재 +${(sim.research.income * 0.5).toFixed(1)}%`;
    if (d.key === 'pulls') extra = ` · 현재 +${sim.research.pulls}회`;
    if (d.key === 'heal') extra = ` · 현재 +${sim.research.heal * 10}%`;
    return h('li', { class: `rrow ${st.done ? 'done' : st.can ? 'can' : ''}` }, h('div', {}, h('b', {}, d.name), h('small', {}, d.desc + extra), h('small', { class: 'cost' }, state)),
      h('button', { class: `btn ${st.can ? 'primary' : 'ghost'} sm`, type: 'button', disabled: st.done || !st.can, onclick: () => { const r = sim.doResearch(d.key); if (!r.ok) { Audio.sfx('error'); ctx.toast(r.reason, 'bad'); return; } Audio.sfx('report'); ctx.toast(`연구 완료: ${d.name}`, 'good'); engine.save(); paint(); } }, st.done ? '완료' : '연구'));
  };
  const paint = () => {
    wrap.replaceChildren(
      h('header', { class: 'bar' }, h('button', { class: 'back', type: 'button', onclick: () => { Audio.sfx('select'); ctx.go('#/panel'); }, html: `${icon('back', 18)}<span>메인 패널</span>` }), h('div', { class: 'bar-title' }, h('b', {}, '연구'), h('small', {}, 'RESEARCH'))),
      h('main', { class: 'rs-body' },
        h('section', { class: 'rs-hero' }, h('p', { class: 'eyebrow' }, '연구 포인트'), h('p', { class: 'bigday' }, String(sim.research.points)), h('p', { class: 'lede' }, '오늘의 보고서를 올릴 때마다 1포인트를 얻습니다.')),
        h('section', {}, h('h3', { class: 'rs-h' }, '능력 연구'), h('p', { class: 'hint' }, '연구한 능력은 커스터마이징의 “능력” 탭에서 캐릭터에 장착합니다.'), h('ul', { class: 'rlist' }, ...RESEARCH.filter((d) => d.kind === 'ability').map(row))),
        h('section', {}, h('h3', { class: 'rs-h' }, '강화 연구'), h('ul', { class: 'rlist' }, ...RESEARCH.filter((d) => d.kind !== 'ability').map(row)))));
  };
  paint(); root.append(wrap);
  return () => {};
}
