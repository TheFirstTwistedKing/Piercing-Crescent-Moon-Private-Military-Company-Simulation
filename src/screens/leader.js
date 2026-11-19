// 팀장 면담: 부서마다 고정된 팀장 8명은 관리자와 대화하는 유일한 인물이다. 보고 / 격려 / 지원 요청.
import * as Audio from '../core/audio.js';
import { engine } from '../game/engine.js';
import { DEPTS, DEPT } from '../game/data.js';
import { AFF_MAX, REQUEST_COST } from '../game/leaders.js';
import { WEATHERS } from '../game/weather.js';
import { drawPreview } from '../game/sprites.js';
import { h, icon } from '../core/ui.js';

const portrait = (u, scale, dir = 'down') => { const cv = Object.assign(document.createElement('canvas'), { width: 32, height: 24, className: 'px' }); const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; drawPreview(c, u, { dir }); cv.style.width = 32 * scale + 'px'; cv.style.height = 24 * scale + 'px'; return cv; };

export function mountLeader(root, ctx, arg) {
  const sim = engine.sim;
  let dept = DEPT[arg] ? arg : 'operation', abort = 0, saveT = 0;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => engine.save(), 1500); };
  const list = h('aside', { class: 'ld-list', 'aria-label': '팀장 목록' });
  const stage = h('section', { class: 'ld-stage' });
  const log = h('div', { class: 'ld-log', role: 'log', 'aria-live': 'polite' });
  let logs = {};   // 부서별 대화 기록 유지

  const aff = (u) => h('span', { class: 'aff', role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': AFF_MAX, 'aria-valuenow': u.aff, 'aria-label': '친밀도' }, ...Array.from({ length: AFF_MAX }, (_, i) => h('i', { class: i < u.aff ? 'on' : '' })));
  const paintList = () => list.replaceChildren(...DEPTS.map((d) => { const u = sim.leaderUnit(d.key); return h('button', { type: 'button', class: `ldr ${d.key === dept ? 'on' : ''}`, onclick: () => { dept = d.key; abort++; Audio.sfx('select'); paintAll(); } }, portrait(u, 2), h('div', {}, h('b', {}, u.name), h('small', {}, `${d.no} ${d.en}`), aff(u))); }));

  const bubble = (who, text, cls = '') => { const p = h('p', { class: `bub ${who} ${cls}` }, ''); log.append(p); log.scrollTop = log.scrollHeight; (logs[dept] ||= []).push({ who, text }); return p; };
  const type = async (el, text, mine) => { for (let i = 1; i <= text.length; i++) { if (mine !== abort) { el.textContent = text; return; } el.textContent = text.slice(0, i); if (i % 3 === 0) Audio.sfx('type'); log.scrollTop = log.scrollHeight; await new Promise((r) => setTimeout(r, 26)); } };
  const say = async (u, lines, effects) => {
    const mine = ++abort;
    for (const t of lines) { if (mine !== abort) return; const el = h('p', { class: 'bub leader' }, ''); log.append(el); await type(el, t, mine); (logs[dept] ||= []).push({ who: 'leader', text: t }); await new Promise((r) => setTimeout(r, 250)); }
    if (effects?.length && mine === abort) { const p = h('p', { class: 'bub fx' }, effects.join(' · ')); log.append(p); (logs[dept] ||= []).push({ who: 'fx', text: p.textContent }); }
    log.scrollTop = log.scrollHeight;
  };

  const act = async (topic, label) => {
    const u = sim.leaderUnit(dept), r = sim.talkLeader(dept, topic);
    if (!r.ok) { Audio.sfx('error'); ctx.toast(r.reason, 'bad'); return; }
    Audio.sfx(topic === 'report' ? 'select' : 'confirm'); const p = h('p', { class: 'bub me' }, label); log.append(p); (logs[dept] ||= []).push({ who: 'me', text: label });
    save(); paintList(); paintHead(); paintBtns(); await say(u, r.lines, r.effects);
  };

  const head = h('div', { class: 'ld-head' }); const btns = h('div', { class: 'ld-btns' });
  const paintHead = () => {
    const u = sim.leaderUnit(dept), d = DEPT[dept], w = WEATHERS[sim.weather.today];
    head.replaceChildren(portrait(u, 6), h('div', {}, h('p', { class: 'eyebrow' }, `${d.no} · ${d.en}`), h('h2', {}, u.name, h('em', { class: 'lat' }, u.latin)), h('p', { class: 'sub' }, `${u.role} · ${d.ko} 팀장`), aff(u),
      h('p', { class: 'sub' }, `친밀도 ${u.aff}/${AFF_MAX} — 높을수록 팀원에게 주는 감화가 커집니다.`),
      h('p', { class: 'chips' }, h('span', { class: 'chip l' }, '팀장 · 고정'), h('span', { class: 'chip' }, `감화 +${Math.round((0.004 * u.csBase.cha + 0.003 * u.aff) * 1000) / 10}%p`), h('span', { class: 'chip' }, `오늘 ${w.ko}`))));
  };
  const paintBtns = () => {
    const u = sim.leaderUnit(dept), done = u.talked === sim.day, asked = u.asked === sim.day;
    btns.replaceChildren(
      h('button', { class: 'btn ghost', type: 'button', onclick: () => act('report', '“오늘의 보고를 듣겠네.”') }, '보고 듣기'),
      h('button', { class: 'btn ghost', type: 'button', disabled: done, onclick: () => act('encourage', '“수고하고 있네. 힘내게.”') }, done ? '격려 (오늘 완료)' : '격려하기 · 사기 +8'),
      h('button', { class: 'btn ghost', type: 'button', disabled: asked, onclick: () => act('request', '“필요한 게 있으면 말해 보게.”') }, asked ? '지원 (오늘 완료)' : `지원 요청 · ${REQUEST_COST.toLocaleString('ko-KR')} CR`));
  };
  const paintLog = () => { log.replaceChildren(...((logs[dept] || []).map((e) => h('p', { class: `bub ${e.who}` }, e.text)))); if (!(logs[dept] || []).length) log.append(h('p', { class: 'hint' }, '팀장은 관리자와 직접 대화하는 유일한 인물입니다. 대화를 시작해 보세요.')); log.scrollTop = log.scrollHeight; };
  const paintAll = () => { paintList(); paintHead(); paintBtns(); paintLog(); };
  stage.append(head, log, btns);
  root.append(h('div', { class: 'ld screen' },
    h('header', { class: 'bar' }, h('button', { class: 'back', type: 'button', onclick: () => { Audio.sfx('select'); ctx.go('#/panel'); }, html: `${icon('back', 18)}<span>메인 패널</span>` }), h('div', { class: 'bar-title' }, h('b', {}, '팀장 면담'), h('small', {}, 'DEPARTMENT LEADERS'))),
    h('div', { class: 'ld-body' }, list, stage)));
  paintAll();
  return () => { abort++; clearTimeout(saveT); engine.save(); };
}
