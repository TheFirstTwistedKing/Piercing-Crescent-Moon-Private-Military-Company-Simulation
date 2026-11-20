// 용병 모집(Rager 공격팀): 오늘의 후보 4명 → 면접(정확한 능력치·특성 공개) → 고용. 고용한 용병 목록과 계약 해지.
import * as Audio from '../core/audio.js';
import { engine } from '../game/engine.js';
import { fmtCredits } from '../game/sim.js';
import { DEPT } from '../game/data.js';
import { WEAPON } from '../game/weapons.js';
import { drawPreview } from '../game/sprites.js';
import { fxLines } from '../game/traits.js';
import { h, icon, modal } from '../core/ui.js';

const STATS = [['cmb', '전투'], ['def', '방어'], ['mob', '기동'], ['med', '의료'], ['int', '정보']];
const GRADE_COLOR = { rookie: '#aebccd', veteran: '#7fc8ff', elite: '#ffb23e' };

export function mountRecruit(root, ctx) {
  const sim = engine.sim, dept = 'rager', D = DEPT[dept];
  let saveT = 0;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => engine.save(), 1200); };
  const funds = h('b', { class: 'shop-funds' }), body = h('div', { class: 'rc-body' });
  const portrait = (c, scale = 4) => { const cv = Object.assign(document.createElement('canvas'), { width: 32, height: 24, className: 'px rc-portrait', 'aria-hidden': 'true' }); const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; drawPreview(g, c, { dir: 'down', frame: 0 }); cv.style.width = `${32 * scale}px`; cv.style.height = `${24 * scale}px`; return cv; };

  const act = (fn, okSound = 'confirm') => { const r = fn(); if (!r.ok) { Audio.sfx('error'); ctx.toast(r.reason, 'bad'); return r; } Audio.sfx(okSound); save(); paint(); return r; };

  const card = (c, v) => {
    const poor = sim.funds < c.fee, full = v.hired >= v.cap, tr = c.trait;
    const stats = h('ul', { class: 'rc-stats' }, ...STATS.map(([k, ko]) => { const s = c.stats[k], val = s.exact ?? s.mid; return h('li', {}, h('span', {}, ko), h('div', { class: `rc-bar ${s.exact === undefined ? 'fuzzy' : ''}` }, h('i', { style: `width:${Math.min(100, val)}%` })), h('b', {}, s.exact ?? s.band)); }));
    const traitEl = !c.interviewed ? h('p', { class: 'rc-trait hidden' }, '특성: 면접 후 공개') : tr.none ? h('p', { class: 'rc-trait' }, '특성: 없음') : h('div', { class: 'rc-trait' }, h('b', {}, `특성: ${tr.name}`), h('small', {}, tr.desc), h('ul', { class: 'fxl' }, ...fxLines(tr.fx).map((l) => h('li', { class: l.good ? 'good' : 'bad' }, l.t))));
    return h('li', { class: `rc-card ${c.interviewed ? 'seen' : ''}` },
      h('div', { class: 'rc-top' }, portrait(c), h('div', { class: 'rc-id' }, h('b', {}, c.name), h('small', {}, c.latin.toUpperCase()), h('span', { class: 'rc-grade', style: `--g:${GRADE_COLOR[c.grade]}` }, c.gradeKo), h('small', {}, `${c.role} · ${WEAPON[c.weapon].name}`))),
      stats, traitEl,
      h('p', { class: 'rc-price' }, h('span', {}, `고용 수수료 ${fmtCredits(c.fee)}`), h('span', {}, `일일 급여 ${fmtCredits(c.wage)}`)),
      h('div', { class: 'rc-btns' },
        h('button', { class: 'btn ghost sm', type: 'button', disabled: c.interviewed, onclick: () => act(() => sim.interviewCandidate(c.id), 'select'), 'aria-label': `${c.name} 면접` }, c.interviewed ? '면접 완료' : `면접 ${fmtCredits(v.interviewCost)}`),
        h('button', { class: `btn ${poor || full ? 'ghost' : 'primary'} sm`, type: 'button', onclick: () => hire(c), 'aria-label': `${c.name} 고용` }, '고용')));
  };
  const hire = (c) => { const r = act(() => sim.hireCandidate(c.id), 'send'); if (r.ok) ctx.toast(`${c.name}이(가) ${D.en} 팀에 합류했습니다.`, 'good'); };
  const dismiss = (m) => modal({ title: `${m.name} 계약 해지`, body: `${m.name}(${m.grade === 'elite' ? '정예' : m.grade === 'veteran' ? '숙련' : '신입'})과의 계약을 해지합니다. 고용 수수료는 돌려받지 못하며, 일일 급여는 더 이상 나가지 않습니다.`,
    actions: [{ label: '취소' }, { label: '계약 해지', kind: 'primary', keep: true, onClick: (close) => { const r = sim.dismissRecruit(m.id); if (!r.ok) { Audio.sfx('error'); ctx.toast(r.reason, 'bad'); return; } Audio.sfx('select'); close(); save(); paint(); } }] });

  const paint = () => {
    const v = sim.recruitView(dept); funds.textContent = fmtCredits(sim.funds);
    const team = v.team.length ? h('ul', { class: 'rc-team' }, ...v.team.map((m) => h('li', {}, h('div', {}, h('b', {}, m.name), h('small', {}, `${m.latin.toUpperCase()} · ${m.role} · 일일 급여 ${fmtCredits(m.wage)}`)), h('button', { class: 'btn ghost sm', type: 'button', disabled: m.busy, title: m.busy ? '임무 수행 중에는 해지할 수 없습니다.' : '', onclick: () => dismiss(m) }, '계약 해지')))) : h('p', { class: 'hint' }, '아직 고용한 용병이 없습니다.');
    body.replaceChildren(
      h('section', { class: 'rc-head', style: `--c:${D.color}` }, h('p', { class: 'eyebrow' }, `RECRUIT · DAY ${String(v.day).padStart(3, '0')}`), h('h2', {}, `${D.en} 용병 모집`, h('small', {}, D.ko)),
        h('p', { class: 'hint' }, `오늘의 후보 ${v.cands.length}명입니다. 면접 전에는 능력치를 10단위 범위로만 알 수 있고, 면접을 보면 정확한 능력치와 특성이 공개됩니다. 후보는 매일 새로 바뀝니다. (현재는 공격팀만 모집합니다)`),
        h('p', { class: 'rc-meta' }, h('span', {}, `고용한 용병 ${v.hired} / ${v.cap}`), h('span', {}, `면접비 ${fmtCredits(v.interviewCost)}`),
          h('button', { class: 'btn ghost sm', type: 'button', disabled: v.rerollsLeft <= 0, onclick: () => act(() => sim.rerollCandidates(), 'select') }, `새로 구하기 ${fmtCredits(v.rerollCost)} (오늘 ${v.rerollsLeft}회 남음)`))),
      v.cands.length ? h('ul', { class: 'rc-cards' }, ...v.cands.map((c) => card(c, v))) : h('p', { class: 'hint rc-empty' }, '오늘의 후보를 모두 고용했습니다. “새로 구하기”로 공고를 다시 낼 수 있습니다.'),
      h('section', { class: 'rc-teamwrap' }, h('p', { class: 'f-label' }, `고용한 ${D.en} 용병`), team));
  };

  root.append(h('div', { class: 'shop rc screen' },
    h('header', { class: 'bar' }, h('button', { class: 'back', type: 'button', onclick: () => { Audio.sfx('select'); ctx.go('#/panel'); }, html: `${icon('back', 18)}<span>메인 패널</span>` }), h('div', { class: 'bar-title' }, h('b', {}, '용병 모집'), h('small', {}, 'MERCENARY RECRUITMENT')), h('span', { class: 'grow' }), h('span', { class: 'who' }, '보유 자금', funds)),
    h('main', { class: 'shop-main' }, body)));
  paint();
  return () => { clearTimeout(saveT); engine.save(); };
}
