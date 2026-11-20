// 사건(이벤트) 창: 시뮬레이션에서 사건이 터지면 화면 위에 띄우고, 선택 결과를 보여 준다.
// 메인 패널 계열 화면에서만 동작한다. "나중에 결정"을 누르면 접히고 화면 아래에 '사건 대기' 버튼이 남는다. (시간은 결정할 때까지 멈춘다)
import * as Audio from '../core/audio.js';
import { engine } from '../game/engine.js';
import { clockInfo } from '../game/sim.js';
import { h, pad, toast } from '../core/ui.js';

let back = null, chip = null, card = null, typer = 0, shown = null, resultMode = false, installed = false;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 글자가 한 줄씩 나타나는 연출. 클릭하면 건너뛴다. 보조기기에는 전체 문장을 바로 읽어 준다. */
function typeInto(el, text, done) {
  clearInterval(typer);
  const full = h('span', { class: 'sr-only' }, text), vis = h('span', { 'aria-hidden': 'true' }); el.replaceChildren(full, vis);
  if (reduced()) { vis.textContent = text; done?.(); return; }
  let i = 0; const step = Math.max(1, Math.ceil(text.length / 70));
  const finish = () => { clearInterval(typer); vis.textContent = text; el.removeEventListener('pointerdown', finish); done?.(); };
  el.addEventListener('pointerdown', finish);
  typer = setInterval(() => { i += step; if (i >= text.length) finish(); else vis.textContent = text.slice(0, i); }, 32);
}

const chipOff = () => { chip?.remove(); chip = null; };
function closeNow() { clearInterval(typer); back?.remove(); back = card = null; resultMode = false; }

function chipOn() {
  const v = engine.sim?.eventView(); if (!v || chip) return;
  chip = h('button', { class: 'ev-chip', type: 'button', onclick: () => { Audio.sfx('select'); open(); } }, h('i', { 'aria-hidden': 'true' }), h('span', {}, `사건 대기 · ${v.title}`), h('small', {}, '시간 정지 중'));
  document.body.append(chip);
}

function head(label, v, sim) {
  return [h('p', { class: 'eyebrow' }, `${label} · DAY ${pad(sim.day)} · ${clockInfo(sim.clock).text}`), h('div', { class: 'ev-tag' }, v.deptKo)];
}

function open() {
  const sim = engine.sim, v = sim?.eventView(); if (!v || back) return;
  shown = v.id; chipOff(); Audio.sfx('notify');
  const text = h('p', { class: 'ev-text' });
  const list = h('div', { class: 'ev-choices' }, ...v.choices.map((c) => h('button', { class: 'ev-choice', type: 'button', disabled: c.disabled, onclick: () => pick(c.i) },
    h('span', { class: 'ev-c-label' }, c.label),
    h('span', { class: 'ev-c-meta' },
      c.cost ? h('em', { class: c.disabled ? 'bad' : '' }, `비용 ${c.cost.toLocaleString('ko-KR')} CR`) : null,
      c.check ? h('em', {}, `${c.check.stat} 판정 ${Math.round(c.check.chance * 100)}% · ${c.check.best}`) : null,
      c.reason ? h('em', { class: 'bad' }, c.reason) : null))));
  card = h('div', { class: 'ev frame', role: 'dialog', 'aria-modal': 'true', 'aria-label': v.title },
    ...head('INCIDENT', v, sim), h('h2', {}, v.title), text, list,
    h('div', { class: 'ev-foot' }, h('small', {}, '결정할 때까지 시간이 멈춥니다.'), h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { Audio.sfx('click'); closeNow(); chipOn(); } }, '나중에 결정')));
  back = h('div', { class: 'ev-back' }, card); document.body.append(back);
  typeInto(text, v.text, () => list.classList.add('ready'));
  setTimeout(() => card?.querySelector('.ev-text')?.focus?.(), 0);
}

function pick(i) {
  const sim = engine.sim; if (!sim || !card) return;
  const v = sim.eventView(); resultMode = true;          // chooseEvent 가 'event' 신호를 보내면 sync 가 창을 닫으려 하므로 먼저 켜 둔다
  const r = sim.chooseEvent(i);
  if (!r.ok) { resultMode = false; Audio.sfx('error'); toast(r.reason, 'bad'); return; }
  Audio.sfx(r.passed === false ? 'error' : 'confirm');
  const text = h('p', { class: 'ev-text' }), chips = h('ul', { class: 'ev-chips' }, ...r.chips.map((c) => h('li', { class: c.good ? 'good' : 'bad' }, c.t)));
  const verdict = r.passed === null ? null : h('p', { class: `ev-verdict ${r.passed ? 'good' : 'bad'}` }, `${r.best} — 판정 ${r.passed ? '성공' : '실패'}`);
  const ok = h('button', { class: 'btn primary', type: 'button', onclick: () => {
    Audio.sfx('click'); closeNow(); const s = engine.sim;
    if (s && !s.ended && !s.pendingEvent) s.setSpeed(s.ev.resume || 0);
    engine.save();
  } }, '확인');
  card.replaceChildren(...[...head('RESULT', v, sim), h('h2', {}, r.title), h('p', { class: 'ev-picked' }, `▸ ${r.choice}`), verdict, text, chips, h('div', { class: 'ev-foot' }, h('small', {}, '확인하면 이전 속도로 다시 흐릅니다.'), ok)].filter(Boolean));
  chips.classList.add('hide'); typeInto(text, r.text, () => chips.classList.remove('hide'));
}

function sync() {
  const sim = engine.sim, p = engine.running && sim ? sim.pendingEvent : null, onPanel = (document.body.dataset.screen || '').startsWith('panel');
  if (resultMode && back) return;
  if (!p || !onPanel) { chipOff(); if (back) closeNow(); if (!p) shown = null; return; }
  if (back) { chipOff(); return; }
  if (shown !== p.id) open(); else chipOn();
}

/** 앱 시작 시 한 번만 설치 */
export function installEventHost() {
  if (installed) return; installed = true;
  engine.onEvent(() => sync());
  document.addEventListener('pcm:open-event', () => { if (engine.sim?.pendingEvent && !back) { chipOff(); open(); } });
  setInterval(sync, 400);
}
