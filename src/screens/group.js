// 단체 임무 창: 임무 선택 → 인원 선택(3~6명, 부서 무관) → 예상 성공률·보상 확인 → 출동
import * as Audio from '../core/audio.js';
import { DEPTS, GROUP_MISSIONS, GMISSION } from '../game/data.js';
import { fmtCredits } from '../game/sim.js';
import { h, modal } from '../core/ui.js';

const STAT = { cmb: '전투', def: '방어', mob: '기동', med: '의료', int: '정보' };

export function openGroupMission(sim, { onDone, toast } = {}) {
  let mid = GROUP_MISSIONS[0].id; const picked = new Set();
  const m = () => GMISSION[mid];
  const summary = h('p', { class: 'gm-sum', 'aria-live': 'polite' }), go = { el: null };
  const missionRows = h('div', { class: 'gm-missions', role: 'radiogroup', 'aria-label': '단체 임무 선택' });
  const list = h('div', { class: 'gm-list' });

  const ready = (u) => (u.mode === 'mission' ? '임무 중' : sim.isInjured(u) ? '부상' : '');
  const paintMissions = () => missionRows.replaceChildren(...GROUP_MISSIONS.map((x) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(x.id === mid), class: `gm-m ${x.id === mid ? 'on' : ''}`, onclick: () => { mid = x.id; Audio.sfx('click'); paintMissions(); paintSummary(); } },
    h('b', {}, x.name), h('small', {}, x.desc), h('span', { class: 'gm-meta' }, ...[`${STAT[x.stat]} 중심`, `${x.min}~${x.max}명`, `약 ${Math.round(x.dur / 60 * 10) / 10}시간`, `위험 ${Math.round(x.risk * 100)}%`, `보상 ${fmtCredits(x.reward)}~`].map((t) => h('span', {}, t))))));
  const paintList = () => list.replaceChildren(...DEPTS.map((d) => {
    const us = sim.units.filter((u) => u.dept === d.key), ok = us.filter((u) => !ready(u));
    return h('section', {}, h('h5', {}, h('i', { class: 'dot', style: `background:${d.color}` }), d.en, h('small', {}, d.ko),
      h('button', { class: 'regroup', type: 'button', disabled: !ok.length, onclick: () => { const all = ok.every((u) => picked.has(u.id)); for (const u of ok) { if (all) picked.delete(u.id); else if (picked.size < m().max) picked.add(u.id); } Audio.sfx('click'); paintList(); paintSummary(); } }, ok.every((u) => picked.has(u.id)) && ok.length ? '해제' : '전원')),
      ...us.map((u) => { const why = ready(u), on = picked.has(u.id);
        return h('button', { type: 'button', class: `gm-u ${on ? 'on' : ''}`, disabled: !!why, 'aria-pressed': String(on), onclick: () => {
          if (on) picked.delete(u.id); else if (picked.size >= m().max) { Audio.sfx('error'); toast?.(`최대 ${m().max}명까지 보낼 수 있습니다.`, 'bad'); return; } else picked.add(u.id);
          Audio.sfx('click'); paintList(); paintSummary(); } },
          h('i', { class: 'gm-box', 'aria-hidden': 'true' }, on ? '✓' : ''), h('b', {}, u.name), u.isLeader ? h('span', { class: 'chip l ldchip' }, '팀장') : null, h('small', {}, why ? why : `HP ${Math.round(u.hp)} · 사기 ${Math.round(u.mor)}`)); }));
  }));
  const paintSummary = () => {
    const ids = [...picked], x = m(), chk = sim.groupCheck(ids, mid);
    if (go.el) go.el.disabled = !chk.ok;
    if (!chk.ok) { summary.className = 'gm-sum'; summary.textContent = `선택 ${ids.length}명 · ${chk.reason}`; return; }
    const p = sim.groupChance(ids, mid); summary.className = `gm-sum ${p >= 0.6 ? 'good' : p < 0.4 ? 'bad' : ''}`;
    summary.textContent = `선택 ${ids.length}명 · 예상 성공률 ${Math.round(p * 100)}% · 성공 보상 약 ${fmtCredits(sim.groupReward(ids, mid))} · 실패하면 전원 부상`;
  };

  const body = h('div', { class: 'gm' }, h('p', { class: 'f-label' }, '임무'), missionRows, h('p', { class: 'f-label' }, '출동 인원 (부서 무관 · 부서가 섞이면 성공률 +2%)'), list, summary);
  paintMissions(); paintList(); paintSummary();
  const dlg = modal({ title: '단체 임무', body, actions: [{ label: '취소' }, { label: '출동', kind: 'primary', keep: true, onClick: (close) => {
    const r = sim.sendGroupMission([...picked], mid);
    if (!r.ok) { Audio.sfx('error'); toast?.(r.reason, 'bad'); return; }
    Audio.sfx('send'); close(); onDone?.(r);
  } }] });
  go.el = [...document.querySelectorAll('.modal-actions .btn.primary')].pop(); paintSummary();
  setTimeout(() => document.querySelector('.modal:has(.gm)')?.scrollTo(0, 0), 60);   // 자동 포커스로 아래로 밀리는 것을 되돌림
  return dlg;
}
