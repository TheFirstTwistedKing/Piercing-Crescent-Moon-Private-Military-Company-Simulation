// 긴급 습격 화면: 준비(진형 선택·예상 승률) → 전투(자동 진행, 속도 조절) → 결과(승리 / 패배 → 다시 도전).
// 메인 패널 계열 화면에서만 동작하며, 습격은 닫을 수 없다(결판을 내야 시간이 다시 흐른다).
import * as Audio from '../core/audio.js';
import { engine } from '../game/engine.js';
import { drawCellAt, finishCanvas, OX } from '../game/sprites.js';
import { RES } from '../game/res.js';
import { ARENA, ENEMY_TYPES, FORMATIONS, ABILITY_INFO } from '../game/raid.js';
import { DEPTS } from '../game/data.js';
import { fmtCredits, clockInfo } from '../game/sim.js';
import { h, pad } from '../core/ui.js';

const TILE = 16, GW = ARENA.w * TILE, GH = ARENA.h * TILE + 24;
let back = null, card = null, raf = 0, battle = null, speed = 1, phase = '', installed = false, floats = [], lastResult = null, cv = null, bars = null, odds = null, oddsTok = 0;
const ODDS_RUNS = 12;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───── 무법자 도트(코드로 그림, 왼쪽을 보는 모습) ───── */
const eCache = {};
function enemySprite(type, dir) {
  const k = type + dir; if (eCache[k]) return eCache[k];
  const c = Object.assign(document.createElement('canvas'), { width: 26 * RES, height: 30 * RES }), g = c.getContext('2d', { willReadFrequently: true }), R = (col, x, y, w, hh) => { g.fillStyle = col; g.fillRect(x, y, w, hh); };
  g.setTransform(RES, 0, 0, RES, 0, 0); g.translate(1, 1);   // 2배 해상도 + 외곽선용 1칸 여백
  if (dir === 'right') { g.translate(24, 0); g.scale(-1, 1); }
  const skin = '#c99a76', boot = '#15110f';
  if (type === 'grunt') { R(boot, 8, 24, 3, 3); R(boot, 12, 24, 3, 3); R('#2b2320', 8, 19, 7, 6); R('#5a3f2a', 7, 11, 9, 9); R('#3a281b', 7, 11, 9, 2); R(skin, 8, 4, 7, 7); R('#a5382a', 8, 4, 7, 2); R('#15110f', 9, 7, 1, 1); R('#15110f', 12, 7, 1, 1); R('#6a4a2a', 3, 8, 2, 12); R('#8a8a90', 2, 6, 4, 3); }
  else if (type === 'brute') { R(boot, 7, 24, 4, 3); R(boot, 13, 24, 4, 3); R('#241c18', 7, 19, 10, 6); R('#3a3a40', 5, 10, 14, 10); R('#26262b', 5, 10, 14, 2); R(skin, 8, 3, 8, 7); R('#15110f', 9, 6, 1, 1); R('#15110f', 13, 6, 1, 1); R('#2a2018', 8, 3, 8, 2); R('#6a4a2a', 1, 5, 2, 18); R('#9a9aa2', 0, 3, 6, 6); R('#4a4a50', 0, 3, 6, 1); }
  else if (type === 'archer') { R(boot, 9, 24, 2, 3); R(boot, 12, 24, 2, 3); R('#2c3a2a', 8, 12, 7, 12); R('#1d2a1c', 8, 12, 2, 12); R('#2c3a2a', 7, 3, 9, 9); R(skin, 9, 6, 5, 5); R('#15110f', 10, 8, 1, 1); R('#15110f', 12, 8, 1, 1); R('#6a4a2a', 3, 7, 1, 14); R('#c8c0a0', 4, 8, 1, 12); }
  else { R(boot, 7, 24, 4, 3); R(boot, 13, 24, 4, 3); R('#1a1a1f', 6, 11, 12, 13); R('#7a1d18', 4, 12, 3, 13); R('#2a2a30', 6, 11, 12, 2); R(skin, 8, 3, 8, 7); R('#15110f', 9, 6, 1, 1); R('#15110f', 13, 6, 1, 1); R('#2a2a30', 7, 1, 2, 4); R('#2a2a30', 15, 1, 2, 4); R('#8a1f18', 8, 3, 8, 2); R('#6a4a2a', 1, 6, 2, 17); R('#b0b0b8', 0, 3, 6, 7); R('#7a1d18', 0, 3, 6, 1); }
  finishCanvas(g, c.width, c.height);
  return (eCache[k] = c);
}
const ESCALE = { grunt: 1, archer: 1, brute: 1.2, boss: 1.45 };
const FX_COLOR = { dmg: '#e6eef8', hurt: '#ff8a70', heal: '#8fe3b8', skill: '#ffb23e', down: '#9aa6b4' };

function drawArena(g, b, t) {
  g.setTransform(RES, 0, 0, RES, 0, 0); g.clearRect(0, 0, GW, GH); g.imageSmoothingEnabled = false;
  for (let y = 0; y < ARENA.h; y++) for (let x = 0; x < ARENA.w; x++) { g.fillStyle = (x + y) % 2 ? '#1c231f' : '#1f2722'; g.fillRect(x * TILE, 24 + y * TILE - 8, TILE, TILE); }
  g.fillStyle = '#0d1014'; g.fillRect(0, 0, GW, 18); g.fillStyle = '#d8b45a'; g.fillRect(0, 18, GW, 1);               // 기지 외벽(왼쪽 위 장식선)
  g.fillStyle = '#4a4a46'; g.fillRect(GW - 5, 24, 3, GH - 24); g.fillStyle = '#6a6a64'; for (let y = 28; y < GH; y += 18) g.fillRect(GW - 6, y, 5, 2);   // 오른쪽: 울타리(무법자가 들어온 쪽)
  const items = b.units.slice().sort((p, q) => p.y - q.y);
  for (const u of items) {
    const px = u.x * TILE, py = 24 + u.y * TILE - 8, ratio = u.maxhp ? Math.max(0, u.hp) / u.maxhp : 0, dead = u.hp <= 0, moving = (u._px !== undefined) && (Math.abs(u._px - u.x) + Math.abs(u._py - u.y) > 0.001); u._px = u.x; u._py = u.y;
    g.save(); g.globalAlpha = dead ? 0.3 : 1;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(Math.round(px - 5), Math.round(py - 1), 10, 2);
    if (u.side === 'd') { const ch = engine.sim.byId[u.id]; if (ch) drawCellAt(g, ch, moving ? [1, 0, 2, 0][Math.floor(t * 8) % 4] : 0, u.dir === 'left' ? 'left' : 'right', Math.round(px - 8 - OX), Math.round(py - 22 + (dead ? 5 : 0))); }
    else { const s = ESCALE[u.type] || 1, spr = enemySprite(u.type, u.dir); g.drawImage(spr, 0, 0, spr.width, spr.height, Math.round(px - 12 * s) - s, Math.round(py - 27 * s + (dead ? 5 : 0)) - s, Math.round(26 * s), Math.round(30 * s)); }
    g.restore();
    if (!dead) {
      const w = u.side === 'e' && u.type === 'boss' ? 22 : 12, top = py - (u.side === 'e' ? 29 * (ESCALE[u.type] || 1) : 25);
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(Math.round(px - w / 2) - 1, Math.round(top) - 1, w + 2, 4); g.fillStyle = ratio > 0.5 ? '#8fe3b8' : ratio > 0.25 ? '#ffb23e' : '#ff6b4f'; g.fillRect(Math.round(px - w / 2), Math.round(top), Math.round(w * ratio), 2);
      if (u.shield > 0) { g.fillStyle = '#7fb0e8'; g.fillRect(Math.round(px - w / 2), Math.round(top) - 2, Math.round(Math.min(1, u.shield / 14) * w), 1); }
      if (u.stun > 0) { g.fillStyle = '#e6eef8'; g.fillRect(Math.round(px - 1), Math.round(top) - 5, 3, 2); }
    }
  }
  g.font = 'bold 8px sans-serif'; g.textAlign = 'center';
  for (const f of floats) { const a = Math.max(0, 1 - f.age / 1.0); g.globalAlpha = a * 0.95; g.fillStyle = FX_COLOR[f.kind] || '#fff'; g.fillText(f.text, Math.round(f.x * TILE), Math.round(24 + f.y * TILE - 30 - f.age * 12)); }
  g.globalAlpha = 1;
}

function stopLoop() { cancelAnimationFrame(raf); raf = 0; }
function closeNow() { oddsTok++; stopLoop(); back?.remove(); back = card = cv = bars = null; battle = null; phase = ''; floats = []; lastResult = null; }

const head = (sim, label) => [h('p', { class: 'eyebrow' }, `${label} · DAY ${pad(sim.day)} · ${clockInfo(sim.clock).text}`), h('div', { class: 'ev-tag rd-tag' }, '긴급 습격')];
const compText = (comp) => Object.entries(comp).map(([t, n]) => `${ENEMY_TYPES[t].ko} ${n}`).join(' · ');

/* ───── 1. 준비 ───── */
function showPrep() {
  const sim = engine.sim, info = sim.raidInfo(); if (!info || !card) return; phase = 'prep'; stopLoop(); battle = null; floats = [];
  odds = {}; const tok = ++oddsTok;
  let sel = FORMATIONS[info.formation] ? info.formation : 'balanced';
  const avg = info.defenders.length ? Math.round(info.defenders.reduce((a, d) => a + d.hp, 0) / info.defenders.length) : 0;
  const byDept = DEPTS.map((d) => ({ d, n: info.defenders.filter((x) => x.dept === d.key).length })).filter((x) => x.n);
  const forms = h('div', { class: 'rd-forms', role: 'radiogroup', 'aria-label': '진형' });
  const paintForms = () => forms.replaceChildren(...Object.entries(FORMATIONS).map(([k, f]) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(k === sel), class: `rd-form ${k === sel ? 'on' : ''}`, onclick: () => { sel = k; Audio.sfx('click'); paintForms(); } },
    h('b', {}, f.ko), h('small', {}, f.desc), h('span', { class: `rd-odds ${odds[k] >= 0.7 ? 'good' : odds[k] < 0.4 ? 'bad' : ''}` }, odds[k] === undefined ? '예상 승률 계산 중…' : `예상 승률 약 ${Math.round(odds[k] * 100)}%`))));
  paintForms();
  // 모의 전투를 한 판씩 나눠 돌려 화면이 멈추지 않게 한다
  const jobs = []; for (const f of Object.keys(FORMATIONS)) for (let i = 0; i < ODDS_RUNS; i++) jobs.push([f, i]); const wins = {};
  const work = () => { if (tok !== oddsTok || phase !== 'prep') return; const [f, i] = jobs.shift(); if (sim.raidBattle(f, 100003 * (i + 1), false).finish().win) wins[f] = (wins[f] || 0) + 1; if (i === ODDS_RUNS - 1) { odds[f] = (wins[f] || 0) / ODDS_RUNS; paintForms(); } if (jobs.length) setTimeout(work, 0); };
  setTimeout(work, 30);
  card.replaceChildren(...head(sim, 'ALERT'), h('h2', {}, '무법자가 기지를 덮쳤다'),
    h('p', { class: 'ev-text rd-lede' }, `무법자 ${info.size}명이 울타리를 넘었습니다. (${compText(info.comp)})${info.tries ? ` — 재도전 ${info.tries}회째` : ''}`),
    h('p', { class: 'rd-force' }, `방어 병력 ${info.defenders.length}명 · 평균 HP ${avg}`, info.away.length ? h('em', {}, ` · 임무 중이라 참전 불가: ${info.away.join(', ')}`) : null),
    h('p', { class: 'rd-depts' }, ...byDept.map((x) => h('span', { style: `--c:${x.d.color}` }, `${x.d.en} ${x.n}`))),
    h('p', { class: 'f-label rd-fl' }, '진형 (예상 승률은 같은 전투 로직으로 12회 모의한 값 — 참고용)'), forms,
    h('div', { class: 'ev-foot' }, h('small', {}, '팀장도 함께 싸웁니다. 치료·방어·공격 등 부서마다 특수 능력이 있습니다.'), h('button', { class: 'btn primary', type: 'button', onclick: () => { Audio.sfx('send'); startFight(sel); } }, '방어 시작')));
}

/* ───── 2. 전투 ───── */
function startFight(formation) {
  const sim = engine.sim; battle = sim.raidBattle(formation); if (!battle || !card) return; phase = 'fight'; speed = 1; floats = [];
  cv = Object.assign(document.createElement('canvas'), { width: GW * RES, height: GH * RES, className: 'rd-cv px', 'aria-label': '전투 장면' }); const g = cv.getContext('2d');
  bars = { d: h('i'), e: h('i'), dn: h('b'), en: h('b'), time: h('small') };
  const spd = h('div', { class: 'rd-speed' }, ...[1, 2, 4].map((v) => h('button', { type: 'button', class: `icon-btn ${v === speed ? 'on' : ''}`, 'data-v': v, onclick: (e) => { speed = v; Audio.sfx('click'); spd.querySelectorAll('button').forEach((b) => b.classList.toggle('on', +b.dataset.v === v)); } }, `${v}x`)),
    h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { Audio.sfx('click'); battle.finish(); endFight(); } }, '결과 바로 보기'));
  card.replaceChildren(...head(sim, 'BATTLE'), h('h2', {}, `진형: ${(FORMATIONS[formation] || FORMATIONS.balanced).ko}`), cv,
    h('div', { class: 'rd-bars' }, h('div', {}, h('span', {}, '아군 ', bars.dn), h('div', { class: 'rd-meter d' }, bars.d)), h('div', {}, h('span', {}, '무법자 ', bars.en), h('div', { class: 'rd-meter e' }, bars.e))),
    h('div', { class: 'ev-foot' }, bars.time, spd));
  let last = performance.now(), t = 0;
  const frame = (now) => {
    if (!battle || phase !== 'fight') return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt;
    if (!battle.done) battle.step(dt * speed);
    for (const f of battle.drainFx()) floats.push({ ...f, age: 0 }); floats.forEach((f) => { f.age += dt; }); floats = floats.filter((f) => f.age < 1.0).slice(-40);
    drawArena(g, battle, t); paintBars();
    if (battle.done) { endFight(); return; }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}
function paintBars() {
  const b = battle, d = b.defenders, e = b.enemies, dh = d.reduce((a, u) => a + Math.max(0, u.hp), 0) / Math.max(1, d.reduce((a, u) => a + u.maxhp, 0)), eh = e.reduce((a, u) => a + Math.max(0, u.hp), 0) / Math.max(1, e.reduce((a, u) => a + u.maxhp, 0));
  bars.d.style.width = `${Math.round(dh * 100)}%`; bars.e.style.width = `${Math.round(eh * 100)}%`; bars.dn.textContent = `${b.alive('d').length}/${d.length}`; bars.en.textContent = `${b.alive('e').length}/${e.length}`; bars.time.textContent = `경과 ${Math.round(b.real)}초`;
}

/* ───── 3. 결과 ───── */
function endFight() {
  stopLoop(); const sim = engine.sim; if (!battle || !card) return; phase = 'result'; lastResult = battle.result(); const r = lastResult, p = sim.pendingRaid;
  const names = r.downed.map((id) => sim.byId[id]?.name).filter(Boolean), loot = 2500 + 450 * (p?.size || r.size), loss = Math.min(sim.funds, 3000 + 700 * (p?.size || r.size));
  Audio.sfx(r.win ? 'confirm' : 'error');
  const done = () => { const rr = sim.finishRaid(r); if (!rr.ok) { closeNow(); return; } closeNow(); const s = engine.sim; if (s && !s.ended && !s.pendingEvent && !s.pendingRaid) s.setSpeed(rr.resume || 0); engine.save(); };
  const lines = r.win
    ? [h('p', { class: 'ev-text' }, `무법자 ${r.size}명을 모두 물리쳤습니다. (${Math.round(r.t)}초)`), h('ul', { class: 'ev-chips' }, h('li', { class: 'good' }, `전리품 +${loot.toLocaleString('ko-KR')} CR`), h('li', { class: 'good' }, '평판 +2'), h('li', { class: 'good' }, '참전 인원 사기 +6'))]
    : [h('p', { class: 'ev-text' }, `방어선이 무너졌습니다. 남은 무법자 ${r.enemiesLeft}명이 기지를 약탈합니다. 다시 도전하면 같은 습격을 처음부터 다시 치르며, 지금 결과는 반영되지 않습니다.`), h('ul', { class: 'ev-chips' }, h('li', { class: 'bad' }, `포기하면 약탈 -${loss.toLocaleString('ko-KR')} CR`), h('li', { class: 'bad' }, '평판 -3'), h('li', { class: 'bad' }, '참전 인원 사기 -10'))];
  card.replaceChildren(...head(sim, 'RESULT'), h('h2', { class: r.win ? 'rd-win' : 'rd-lose' }, r.win ? '방어 성공' : '방어 실패'), ...lines,
    names.length ? h('p', { class: 'rd-force' }, `쓰러진 인원 ${names.length}명: ${names.join(', ')} (HP 5로 반영)`) : h('p', { class: 'rd-force' }, '쓰러진 인원 없음'),
    h('div', { class: 'ev-foot' }, h('small', {}, r.win ? '확인하면 이전 속도로 다시 흐릅니다.' : '재도전 횟수에는 제한이 없습니다.'),
      r.win ? h('button', { class: 'btn primary', type: 'button', onclick: () => { Audio.sfx('click'); done(); } }, '확인')
        : h('span', { class: 'rd-btns' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => { Audio.sfx('click'); done(); } }, '피해를 감수하고 종료'), h('button', { class: 'btn primary', type: 'button', onclick: () => { Audio.sfx('select'); sim.retryRaid(); showPrep(); } }, '다시 도전'))));
}

function open() {
  const sim = engine.sim; if (!sim?.pendingRaid || back) return; Audio.sfx('notify');
  card = h('div', { class: 'ev rd frame', role: 'dialog', 'aria-modal': 'true', 'aria-label': '긴급 습격' }); back = h('div', { class: 'ev-back rd-back' }, card); document.body.append(back); showPrep();
}
function sync() {
  const sim = engine.sim, p = engine.running && sim ? sim.pendingRaid : null, onPanel = (document.body.dataset.screen || '').startsWith('panel');
  if (!p || !onPanel) { if (back) closeNow(); return; }
  if (!back) open();
}
export function installRaidHost() {
  if (installed) return; installed = true;
  engine.onRaid(() => sync()); setInterval(sync, 400);
}
