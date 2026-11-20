// 현장 지휘(쯔꾸르 스타일): 화면을 움직이고, 캐릭터를 눌러 방 이동 / 임무 / 순찰 / 대화 엿듣기 명령을 내린다.
import * as Audio from '../core/audio.js';
import { engine } from '../game/engine.js';
import { blitView } from '../game/render.js';
import { DEPTS, DEPT, ROOM_LABEL, MISSIONS, MISSION, PATROL_META, STAT_KO } from '../game/data.js';
import { clockInfo, successChance, fmtCredits, MIN_PER_SEC } from '../game/sim.js';
import { WORLD_W, WORLD_H } from '../game/map.js';
import { h, icon, modal, clamp, pad } from '../core/ui.js';
import { buildSpeed } from './speed.js';
import { WEATHERS, TASKS } from '../game/weather.js';
import { WEAPON } from '../game/weapons.js';
import { TRAIT, ABILITY } from '../game/traits.js';

const fmtReal = (sec) => { const s = Math.round(sec); return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`; };
const fmtGame = (m) => `${m >= 60 ? `${Math.floor(m / 60)}시간 ` : ''}${m % 60 ? `${m % 60}분` : ''}`.trim();

export function mountField(root, ctx) {
  const sim = engine.sim, world = engine.world, cam = engine.cam;
  let sel = null, step = 'main', follow = null, rect = null, dpr = 1, cssW = 0, cssH = 0, rosterOpen = matchMedia('(min-width: 900px)').matches, tab = 'units';

  /* ── 캔버스 ── */
  const cv = h('canvas', { class: 'fv', tabindex: '0', 'aria-label': '기지 지도. 드래그로 이동, 캐릭터를 눌러 명령' });
  const c2 = cv.getContext('2d');
  const resize = () => { const r = cv.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2); cssW = r.width; cssH = r.height; cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); };
  const ro = new ResizeObserver(resize);

  const draw = (now) => {
    if (!cssW) return;
    if (follow && sim.byId[follow] && !sim.byId[follow].away) { const u = sim.byId[follow]; cam.cx += (u.x - cam.cx) * 0.12; cam.cy += (u.y - 8 - cam.cy) * 0.12; }
    const scale = cam.zoom * dpr;
    rect = blitView(c2, world, cam, cv.width, cv.height, scale);
    // 이름표(캔버스 위에 또렷한 해상도로)
    c2.font = `500 ${Math.round(10.5 * dpr)}px "IBM Plex Mono", "Noto Sans KR Variable", monospace`; c2.textBaseline = 'middle'; c2.textAlign = 'center';
    for (const u of sim.units) {
      if (u.away) continue;
      const isSel = sel === u.id; if (!isSel && cam.zoom < 2.8) continue;
      const sx = (u.x - rect.x) * scale, sy = (u.y - 26 - rect.y) * scale; if (sx < -80 || sy < -20 || sx > cv.width + 80 || sy > cv.height + 20) continue;
      const w = c2.measureText(u.name).width + 14 * dpr, hh = 15 * dpr;
      c2.fillStyle = 'rgba(4,6,10,.78)'; c2.fillRect(Math.round(sx - w / 2), Math.round(sy - hh / 2), Math.round(w), Math.round(hh));
      c2.fillStyle = DEPT[u.dept].color; c2.fillRect(Math.round(sx - w / 2), Math.round(sy - hh / 2), Math.round(2 * dpr), Math.round(hh));
      c2.fillStyle = isSel ? '#ffb23e' : u.hp < 25 ? '#ff6b4f' : '#dbe7f4'; c2.fillText(u.name, Math.round(sx + 1 * dpr), Math.round(sy + 0.5));
    }
  };
  const offView = engine.addView(draw);

  const toWorld = (cx, cy) => { const r = cv.getBoundingClientRect(); return [rect.x + (cx - r.left) / cam.zoom, rect.y + (cy - r.top) / cam.zoom]; };
  const setZoom = (z) => { cam.zoom = clamp(z, 1.4, 6); };

  /* ── 포인터: 드래그 이동 / 탭 선택 / 핀치 줌 ── */
  const ptrs = new Map(); let pinch = 0, dragged = false;
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }); dragged = false; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
  cv.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    if (ptrs.size === 2) { p.x = e.clientX; p.y = e.clientY; const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) setZoom(cam.zoom * (d / pinch)); pinch = d; dragged = true; return; }
    if (!dragged && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 6) return;
    dragged = true; follow = null;
    cam.cx -= (e.clientX - p.x) / cam.zoom; cam.cy -= (e.clientY - p.y) / cam.zoom; p.x = e.clientX; p.y = e.clientY;
  });
  const up = (e) => {
    const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = 0;
    if (p && !dragged && e.type === 'pointerup' && rect) {
      const [wx, wy] = toWorld(e.clientX, e.clientY); const u = world.pick(sim, wx, wy);
      if (u) select(u.id, false); else if (sel) deselect();
    }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', (e) => { e.preventDefault(); setZoom(cam.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); }, { passive: false });
  const keys = new Set();
  const onKey = (e) => {
    if (e.target.matches('input,textarea')) return;
    if (e.type === 'keydown') {
      if (e.code === 'Space') { e.preventDefault(); sim.setSpeed(sim.speed === 0 ? 1 : 0); paintSpeed(); Audio.sfx('click'); }
      else if (e.key === '1') { sim.setSpeed(1); paintSpeed(); } else if (e.key === '2') { sim.setSpeed(2); paintSpeed(); } else if (e.key === '3') { sim.setSpeed(3); paintSpeed(); }
      else if (e.key === 'Escape') { if (dlg.open) closeDlg(); else deselect(); }
      else keys.add(e.key.toLowerCase());
    } else keys.delete(e.key.toLowerCase());
  };
  addEventListener('keydown', onKey); addEventListener('keyup', onKey);
  const pan = setInterval(() => { const v = 8 / cam.zoom * 2.2; if (keys.has('a') || keys.has('arrowleft')) cam.cx -= v; if (keys.has('d') || keys.has('arrowright')) cam.cx += v; if (keys.has('w') || keys.has('arrowup')) cam.cy -= v; if (keys.has('s') || keys.has('arrowdown')) cam.cy += v; if (keys.size) follow = null; }, 16);

  /* ── 상단 HUD ── */
  const clk = h('div', { class: 'hud-clock' }); const phase = h('em');
  const sp = buildSpeed(sim), speed = sp.el, paintSpeed = sp.paint;
  const bar = h('div', { class: 'meter' }, h('i'));
  const wchip = h('span', { class: 'hud-weather' });
  const paintHud = () => { const w = WEATHERS[sim.weather.today]; wchip.textContent = `${w.ko} · 적설 ${Math.round(sim.snow)}%`; wchip.title = w.desc; wchip.dataset.w = sim.weather.today; const c = clockInfo(sim.clock); clk.replaceChildren(h('b', {}, `DAY ${pad(sim.day)}`), h('span', {}, c.text), h('em', { class: c.night ? 'night' : '' }, c.phase)); bar.firstChild.style.width = `${(sim.clock / 1260) * 100}%`; paintSpeed(); };
  const hud = h('header', { class: 'hud' },
    h('button', { class: 'back', type: 'button', onclick: () => { Audio.sfx('select'); ctx.go('#/panel'); }, html: `${icon('back', 18)}<span>메인 패널</span>` }), clk, wchip, speed, h('span', { class: 'grow' }),
    h('button', { class: 'btn primary sm rep', type: 'button', onclick: () => { Audio.sfx('select'); ctx.go('#/panel/report'); } }, '보고서 올리기'), bar);
  const zoomBox = h('div', { class: 'zoombox' }, h('button', { class: 'icon-btn', type: 'button', 'aria-label': '확대', html: icon('plus'), onclick: () => setZoom(cam.zoom * 1.25) }), h('button', { class: 'icon-btn', type: 'button', 'aria-label': '축소', html: icon('minus'), onclick: () => setZoom(cam.zoom / 1.25) }),
    h('button', { class: 'icon-btn rtoggle', type: 'button', 'aria-label': '인원 목록', html: icon('list'), onclick: () => { rosterOpen = !rosterOpen; paintRoster(); } }));

  /* ── 인원/로그 패널 ── */
  const roster = h('aside', { class: 'roster', 'aria-label': '인원 목록' });
  const paintRoster = () => {
    roster.classList.toggle('open', rosterOpen);
    const tabs = h('div', { class: 'tabs' }, ...[['units', '인원'], ['log', '로그']].map(([k, l]) => h('button', { type: 'button', class: tab === k ? 'on' : '', onclick: () => { tab = k; paintRoster(); } }, l)), h('button', { class: 'icon-btn x', type: 'button', 'aria-label': '닫기', html: icon('close', 16), onclick: () => { rosterOpen = false; paintRoster(); } }));
    let body;
    if (tab === 'units') body = h('div', { class: 'rbody' }, ...DEPTS.map((d) => h('section', {}, h('h5', {}, h('i', { class: 'dot', style: `background:${d.color}` }), d.en, h('small', {}, d.ko), h('button', { class: 'regroup', type: 'button', title: `${d.ko} 전원을 ${d.roomKo}(으)로 재집결`, 'aria-label': `${d.ko} 재집결`, onclick: () => regroup(d) }, '재집결')),
      ...sim.units.filter((u) => u.dept === d.key).map((u) => h('button', { type: 'button', class: `ru ${sel === u.id ? 'on' : ''} ${u.hp < 25 ? 'hurt' : ''}`, onclick: () => select(u.id, true) }, h('b', {}, u.name, h('em', { class: 'lat' }, u.latin), u.isLeader ? h('span', { class: 'chip l ldchip' }, '팀장') : null), h('small', {}, sim.statusText(u)), h('span', { class: 'hpbar' }, h('i', { style: `width:${u.hp}%` })))))));
    else body = h('ol', { class: 'rbody log' }, ...sim.log.slice().reverse().map((e) => h('li', { class: e.kind }, h('time', {}, clockInfo(e.clock).text), h('span', {}, e.text))));
    roster.replaceChildren(tabs, body);
  };

  /* ── 선택 시트 ── */
  const sheet = h('aside', { class: 'sheet', hidden: true, 'aria-live': 'polite' });
  const select = (id, center) => { if (matchMedia('(max-width: 899px)').matches) { rosterOpen = false; } sel = id; world.selected = id; step = 'main'; Audio.sfx('select'); const u = sim.byId[id]; if (center && !u.away) { follow = id; if (cam.zoom < 2.6) cam.zoom = 3; } else if (!center) follow = null; paintSheet(); paintRoster(); };
  const deselect = () => { sel = null; world.selected = null; follow = null; sheet.hidden = true; paintRoster(); };
  const bars = (u) => h('div', { class: 'bars' }, ...[['HP', u.hp, u.hp < 25 ? 'bad' : ''], ['MOR', u.mor, '']].map(([l, v, k]) => h('div', {}, h('span', {}, l), h('span', { class: `hpbar ${k}` }, h('i', { style: `width:${Math.round(v)}%` })), h('b', {}, String(Math.round(v))))));
  const paintSheet = () => {
    const u = sel && sim.byId[sel]; if (!u) { sheet.hidden = true; return; }
    sheet.hidden = false; const d = DEPT[u.dept], can = sim.canCommand(u), hurt = sim.isInjured(u);
    const head = h('header', {}, h('i', { class: 'dot big', style: `background:${d.color}` }), h('div', {}, h('b', {}, u.name), h('small', { class: 'lat' }, u.latin.toUpperCase()), h('small', {}, `${u.role} · ${d.no} ${d.en}`)), h('button', { class: 'icon-btn', type: 'button', 'aria-label': '닫기', html: icon('close', 16), onclick: deselect }));
    const chips = h('p', { class: 'chips' }, u.isLeader ? h('span', { class: 'chip l' }, '팀장') : null, h('span', { class: 'chip' }, WEAPON[u.weapon].name), ...u.eq.map((t) => h('span', { class: `chip ${TRAIT[t].rarity}` }, TRAIT[t].name)), ...u.ab.map((a) => h('span', { class: 'chip ab' }, ABILITY[a].name)));
    const info = h('div', { class: 'info' }, h('p', { class: 'stat-line' }, sim.statusText(u)), chips, bars(u), h('p', { class: 'stats' }, ...Object.entries(STAT_KO).map(([k, l]) => h('span', {}, l, h('b', {}, String(Math.round(u.dv[k])))))));
    let body;
    if (step === 'main') {
      const cmd = (label, sub, fn, disabled, why) => h('button', { class: 'cmd', type: 'button', disabled, title: disabled ? why : '', onclick: fn }, h('b', {}, label), h('small', {}, disabled ? why : sub), h('span', { html: icon('arrow', 18) }));
      body = h('div', { class: 'steps' },
        cmd('방으로 보내기', '지정한 방으로 이동·배치', () => { step = 'room'; paintSheet(); }, !can.ok && u.mode === 'mission', can.reason),
        cmd('임무 보내기', '정문을 나가 임무 수행 · 성공 시 보상', () => { step = 'mission'; paintSheet(); }, !can.ok || hurt, hurt ? '부상(HP 25 미만)' : can.reason),
        cmd('순찰 보내기', '정해진 경로를 돌며 경계', () => { step = 'patrol'; paintSheet(); }, !can.ok || hurt, hurt ? '부상(HP 25 미만)' : can.reason),
        cmd('대화 엿듣기', '혼잣말을 몰래 듣는다', () => openDlg(u.id), false, ''),
        cmd('야외 작업', '재설 작업 · 용광로 발전으로 눈을 치운다', () => { step = 'work'; paintSheet(); }, !can.ok || hurt, hurt ? '부상(HP 25 미만)' : can.reason),
        u.isLeader ? cmd('팀장 면담', '관리자와 직접 대화한다', () => { Audio.sfx('select'); ctx.go('#/panel/leader/' + u.dept); }, false, '') : null,
        cmd('커스터마이징', '머리·무기·스탯·장비·특성·능력', () => { Audio.sfx('select'); ctx.go('#/panel/custom/' + u.id); }, false, ''));
    } else {
      const back = h('button', { class: 'link', type: 'button', onclick: () => { step = 'main'; paintSheet(); } }, '← 명령 목록');
      const done = (r, okMsg) => { if (!r.ok) { Audio.sfx('error'); toastLocal(r.reason); return; } Audio.sfx('send'); follow = u.id; if (okMsg) toastLocal(okMsg, 'order'); step = 'main'; paintSheet(); };
      if (step === 'room') body = h('div', { class: 'steps list' }, back, ...Object.entries(ROOM_LABEL).map(([k, l]) => h('button', { class: `opt ${u.home === k ? 'cur' : ''}`, type: 'button', onclick: () => done(sim.sendToRoom(u.id, k), `${u.name} → ${l}`) }, h('b', {}, l), h('small', {}, u.home === k ? '현재 배치' : DEPTS.find((x) => x.room === k)?.en || 'Lobby'))));
      else if (step === 'work') body = h('div', { class: 'steps list' }, back, h('p', { class: 'sub-h' }, `현재 ${WEATHERS[sim.weather.today].ko} · 적설 ${Math.round(sim.snow)}%`), ...Object.entries(TASKS).map(([k, T]) => h('button', { class: 'opt', type: 'button', onclick: () => done(sim.sendWork(u.id, k), `${u.name} ${T.ko} 시작`) }, h('b', {}, T.ko), h('small', {}, `${T.desc} · 게임 ${fmtGame(T.dur)} (실제 약 ${fmtReal(T.dur / MIN_PER_SEC)})`))));
      else if (step === 'patrol') body = h('div', { class: 'steps list' }, back, ...PATROL_META.map((p) => h('button', { class: 'opt', type: 'button', onclick: () => done(sim.sendPatrol(u.id, p.id), `${u.name} 순찰 출발: ${p.name}`) }, h('b', {}, p.name), h('small', {}, `${p.desc} · 게임 ${fmtGame(p.dur)} (실제 약 ${fmtReal(p.dur / MIN_PER_SEC)})`))));
      else {
        const mk = (m) => { const p = sim.chance(u, m); return h('button', { class: 'opt', type: 'button', onclick: () => done(sim.sendMission(u.id, m.id)) }, h('b', {}, m.name), h('small', {}, `게임 ${fmtGame(m.dur)}(약 ${fmtReal(m.dur / MIN_PER_SEC)}) · 위험 ${Math.round(m.risk * 100)}% · ${fmtCredits(m.reward)} · 주요능력 ${STAT_KO[m.stat]}`), h('span', { class: `pct ${p < 0.5 ? 'low' : ''}` }, `${Math.round(p * 100)}%`)); };
        body = h('div', { class: 'steps list' }, back, h('p', { class: 'sub-h' }, `${d.ko} 임무`), ...MISSIONS.filter((m) => m.dept === u.dept).map(mk),
          h('details', { class: 'more' }, h('summary', {}, '타 부서 임무로 지원 투입 (성공률 감소)'), ...MISSIONS.filter((m) => m.dept !== u.dept).map(mk)));
      }
    }
    sheet.replaceChildren(head, info, body);
  };
  const refreshSheetLive = () => { const u = sel && sim.byId[sel]; if (!u || sheet.hidden) return; const sl = sheet.querySelector('.stat-line'); if (sl) sl.textContent = sim.statusText(u); const b = sheet.querySelector('.bars'); if (b) b.replaceWith(bars(u)); };
  const toastLocal = (t, kind = 'bad') => ctx.toast(t, kind);
  const regroup = (d) => {
    const r = sim.regroup(d.key);
    if (!r.ok) { Audio.sfx('error'); toastLocal(r.reason || '재집결할 수 없습니다.'); return; }
    Audio.sfx('send'); toastLocal(`${d.ko} ${r.moved.length}명 재집결${r.skipped.length ? ` · 제외 ${r.skipped.map((x) => `${x.name}(${x.why})`).join(', ')}` : ''}`, 'good'); paintRoster();
  };

  /* ── 대화 엿듣기 ── */
  const dlg = h('div', { class: 'dlg', hidden: true, role: 'dialog', 'aria-label': '대화 엿듣기' }); dlg.open = false;
  let typeAbort = 0;
  const closeDlg = () => { typeAbort++; dlg.hidden = true; dlg.open = false; };
  const openDlg = async (id) => {
    const u = sim.byId[id]; if (!u) return;
    if (!u.away) { follow = id; if (cam.zoom < 3) cam.zoom = 3; }
    Audio.sfx('notify'); dlg.hidden = false; dlg.open = true;
    const lines = sim.listen(id); const mine = ++typeAbort;
    const where = u.away ? '무전 너머' : ROOM_LABEL[u.home];
    const text = h('p', { class: 'dlg-text' }); const more = h('button', { class: 'btn ghost sm', type: 'button', onclick: () => openDlg(id) }, '계속 듣기'); more.disabled = true;
    dlg.replaceChildren(h('header', {}, h('i', { class: 'dot', style: `background:${DEPT[u.dept].color}` }), h('b', {}, u.name), h('small', { class: 'lat' }, u.latin.toUpperCase()), h('small', {}, `(혼잣말) ${where}`), h('button', { class: 'icon-btn', type: 'button', 'aria-label': '닫기', html: icon('close', 16), onclick: closeDlg })), text, h('footer', {}, more, h('span', { class: 'hint' }, '엿들은 내용은 오늘의 보고서에 기록됩니다.')));
    const full = lines.map((l) => `“${l}”`).join('\n');
    for (let i = 1; i <= full.length; i++) {
      if (mine !== typeAbort) return;
      text.textContent = full.slice(0, i); if (i % 3 === 0) Audio.sfx('type');
      await new Promise((r) => setTimeout(r, full[i - 1] === '\n' ? 420 : 30));
    }
    more.disabled = false;
  };

  /* ── 하루 종료 안내 ── */
  const offEnd = sim.on('dayend', () => modal({ title: '하루가 종료되었습니다', body: '게임 내 03:00 — 하루 플레이 타임이 끝났습니다. 오늘의 보고서를 제출하세요.', actions: [{ label: '나중에', kind: 'ghost' }, { label: '보고서 작성', kind: 'primary', onClick: () => ctx.go('#/panel/report') }], dismiss: false }));

  root.append(h('div', { class: 'field screen' }, cv, hud, roster, sheet, dlg, zoomBox));
  ro.observe(cv); resize(); paintHud(); paintRoster();
  if (sel) paintSheet();
  const tick = setInterval(() => { paintHud(); refreshSheetLive(); if (rosterOpen) { if (tab === 'log' || !roster.matches(':hover,:focus-within')) paintRoster(); } }, 500);
  cv.focus({ preventScroll: true });

  return () => { offView(); offEnd(); ro.disconnect(); clearInterval(tick); clearInterval(pan); removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); typeAbort++; world.selected = null; };
}
