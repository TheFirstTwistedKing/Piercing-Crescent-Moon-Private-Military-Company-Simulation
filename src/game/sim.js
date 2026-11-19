// 시뮬레이션 코어. 렌더/DOM 과 완전히 분리되어 Node 에서도 테스트된다.
import { ROSTER, DEPT, DEPTS, MISSION, PATROL_META, PATROL_EVENTS, MONO, ROOM_LABEL } from './data.js';
import { TS, GATE, PATROLS, roomFreeTiles, findPath, ROOMS } from './map.js';

// 하루 = 아침(낮) 12시간 + 밤 9시간 = 게임 내 21시간(06:00 → 03:00), 실제 플레이타임 12분(1배속).
export const DAY_PHASE_MIN = 12 * 60;
export const DAY_MINUTES = 21 * 60;
export const DAY_REAL_SECONDS = 12 * 60;
export const MIN_PER_SEC = DAY_MINUTES / DAY_REAL_SECONDS; // 1.75 게임분 / 실초
const WALK = 4.0;            // 타일/초 (1배속)
const UPKEEP_PER_UNIT = 300; // 일일 운영비
const START_FUNDS = 100000;

export function clockInfo(clock) {
  const total = 6 * 60 + Math.floor(clock);
  const hh = Math.floor(total / 60) % 24, mm = total % 60;
  return { text: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, phase: clock < DAY_PHASE_MIN ? '아침' : '밤', night: clock >= DAY_PHASE_MIN, hours: clock / 60 };
}
export const fmtCredits = (n) => `${n < 0 ? '-' : ''}${Math.abs(Math.round(n)).toLocaleString('ko-KR')} CR`;

export function successChance(u, m) {
  const stat = u.stats[m.stat] ?? 50;
  const same = u.dept === m.dept;
  let p = 0.9 - m.risk * 0.95 + (stat - 55) / 220 + (u.mor - 50) / 400 + (same ? 0.07 : -0.13);
  if (u.hp < 50) p -= (50 - u.hp) / 250;
  return Math.max(0.05, Math.min(0.97, p));
}

class Unit {
  constructor(base) {
    Object.assign(this, base);
    this.hp = 100; this.mor = 60;
    this.home = base.dept === 'operation' ? 'operation' : base.dept; // 부서 방 = 부서 key
    this.mode = 'idle';          // idle | goto | mission | patrol
    this.phase = null;           // mission: out | away | back
    this.mission = null; this.patrol = null;
    this.path = []; this.moving = false; this.dir = 'down'; this.anim = 0;
    this.tx = 0; this.ty = 0; this.x = 0; this.y = 0;
    this.away = false; this.wait = 1 + Math.random() * 5; this.heard = new Set();
  }
  place(tx, ty) { this.tx = tx; this.ty = ty; this.x = tx * TS + 8; this.y = ty * TS + 15; this.path = []; this.moving = false; }
}

export class Sim {
  constructor(saved = null, rand = Math.random) {
    this.rand = rand;
    this.units = ROSTER.map((b) => new Unit({ ...b, stats: { ...b.stats }, look: { ...b.look } }));
    this.byId = Object.fromEntries(this.units.map((u) => [u.id, u]));
    this.day = 1; this.clock = 0; this.funds = START_FUNDS; this.rep = 0; this.speed = 0; this.ended = false;
    this.dayStartFunds = this.funds; this.dayLog = this.freshLog(); this.log = [];
    this.listeners = {}; this.dirty = false;
    for (const u of this.units) { const s = this.spot(u.home); u.place(s[0], s[1]); }
    if (saved) this.restore(saved);
  }

  /* ── 이벤트/로그 ── */
  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); return () => { this.listeners[evt] = this.listeners[evt].filter((f) => f !== fn); }; }
  emit(evt, data) { for (const f of this.listeners[evt] || []) f(data); }
  note(text, kind = 'info', toast = true) {
    const e = { day: this.day, clock: Math.floor(this.clock), text, kind };
    this.log.push(e); if (this.log.length > 80) this.log.shift();
    if (toast) this.emit('toast', e);
    this.dirty = true;
  }
  freshLog() { return { missions: [], patrols: [], overheard: [], orders: 0 }; }

  spot(room) { const t = roomFreeTiles(room); return t[Math.floor(this.rand() * t.length)] || [28, 18]; }

  /* ── 명령 ── */
  canCommand(u) {
    if (this.ended) return { ok: false, reason: '하루가 종료되었습니다. 보고서를 제출하세요.' };
    if (u.mode === 'mission') return { ok: false, reason: '임무 수행 중입니다.' };
    return { ok: true };
  }
  isInjured(u) { return u.hp < 25; }

  sendToRoom(id, room, auto = false) {
    const u = this.byId[id]; const c = this.canCommand(u);
    if (!c.ok && !auto) return c;
    if (u.mode === 'mission') return c;
    if (!ROOM_LABEL[room]) return { ok: false, reason: '알 수 없는 방' };
    if (u.mode === 'patrol') { u.patrol = null; this.note(`${u.name} — 순찰 중단, ${ROOM_LABEL[room]} 으로 이동`, 'info', false); }
    const s = this.spot(room);
    const path = findPath(u.tx, u.ty, s[0], s[1]);
    if (!path) return { ok: false, reason: '길을 찾을 수 없습니다.' };
    u.home = room; u.mode = 'goto'; u.path = path; u.wait = 2;
    if (!auto) { this.dayLog.orders++; this.note(`${u.name} → ${ROOM_LABEL[room]} 이동 명령`, 'order', false); }
    return { ok: true };
  }

  sendMission(id, missionId) {
    const u = this.byId[id]; const m = MISSION[missionId]; const c = this.canCommand(u);
    if (!c.ok) return c;
    if (this.isInjured(u)) return { ok: false, reason: '부상이 심해 임무에 나설 수 없습니다. (HP 25 미만)' };
    if (u.mode === 'patrol') u.patrol = null;
    const path = findPath(u.tx, u.ty, GATE.x, GATE.y);
    if (!path) return { ok: false, reason: '정문까지의 길을 찾을 수 없습니다.' };
    u.mode = 'mission'; u.phase = 'out'; u.path = path; u.mission = { id: m.id, remaining: m.dur, total: m.dur };
    this.dayLog.orders++;
    this.note(`${u.name} 임무 출발: ${m.name}`, 'order');
    return { ok: true };
  }

  sendPatrol(id, routeId) {
    const u = this.byId[id]; const meta = PATROL_META.find((p) => p.id === routeId); const c = this.canCommand(u);
    if (!c.ok) return c;
    if (this.isInjured(u)) return { ok: false, reason: '부상이 심해 순찰할 수 없습니다. (HP 25 미만)' };
    const wp = PATROLS[routeId];
    const path = findPath(u.tx, u.ty, wp[0][0], wp[0][1]);
    if (!path) return { ok: false, reason: '순찰 경로로 갈 수 없습니다.' };
    u.mode = 'patrol'; u.patrol = { id: routeId, wi: 0, remaining: meta.dur, evAcc: 0, incidents: [] }; u.path = path;
    this.dayLog.orders++;
    this.note(`${u.name} 순찰 출발: ${meta.name}`, 'order', false);
    return { ok: true };
  }

  /** 혼잣말 엿듣기 → 줄 배열 */
  listen(id) {
    const u = this.byId[id];
    const night = this.clock >= DAY_PHASE_MIN;
    const ctx = u.hp < 25 ? 'injured' : u.mode === 'patrol' ? 'patrol' : u.mode === 'mission' ? 'mission' : u.mor < 35 ? 'lowmor' : night && this.rand() < 0.5 ? 'night' : u.dept;
    const pick = (key) => {
      const pool = MONO[key] || MONO.generic;
      const fresh = pool.filter((t) => !u.heard.has(t));
      if (!fresh.length) { for (const t of pool) u.heard.delete(t); return pool[Math.floor(this.rand() * pool.length)]; }
      const t = fresh[Math.floor(this.rand() * fresh.length)]; u.heard.add(t); return t;
    };
    const lines = [pick(ctx)];
    const second = ctx === u.dept ? 'generic' : u.dept;
    lines.push(pick(second));
    if (this.rand() < 0.4) lines.push(pick(night ? 'night' : 'generic'));
    const uniq = [...new Set(lines)];
    for (const t of uniq) this.dayLog.overheard.push({ who: u.name, dept: u.dept, text: t, clock: Math.floor(this.clock) });
    if (this.dayLog.overheard.length > 40) this.dayLog.overheard.splice(0, this.dayLog.overheard.length - 40);
    return uniq;
  }

  statusText(u) {
    if (u.mode === 'mission') {
      const m = MISSION[u.mission.id];
      if (u.phase === 'away') return `임무 수행 중 · ${m.name} (남은 ${Math.ceil(u.mission.remaining)}분)`;
      return `임무 ${u.phase === 'out' ? '출발' : '복귀'} 중 · ${m.name}`;
    }
    if (u.mode === 'patrol') return `순찰 중 · ${PATROL_META.find((p) => p.id === u.patrol.id).name} (남은 ${Math.ceil(u.patrol.remaining)}분)`;
    if (u.mode === 'goto') return `이동 중 → ${ROOM_LABEL[u.home]}`;
    if (this.isInjured(u)) return `부상 · ${ROOM_LABEL[u.home]}`;
    return `대기 · ${ROOM_LABEL[u.home]}`;
  }

  /* ── 진행 ── */
  setSpeed(s) { if (this.ended) s = 0; this.speed = s; }

  update(dtReal) {
    if (this.speed === 0 || this.ended) return;
    const dt = Math.min(dtReal, 0.1) * this.speed;
    const dm = dt * MIN_PER_SEC;
    this.clock += dm;
    if (this.clock >= DAY_MINUTES) { this.clock = DAY_MINUTES; this.ended = true; this.speed = 0; this.note('하루가 종료되었습니다. 오늘의 보고서를 제출하세요.', 'alert'); this.emit('dayend'); }
    for (const u of this.units) this.updateUnit(u, dt, dm);
  }

  updateUnit(u, dt, dm) {
    // 이동
    const was = u.path.length > 0;
    if (was) this.stepMove(u, dt);
    u.moving = was && u.path.length > 0;
    if (u.moving) u.anim += dt * 8;
    if (was && !u.path.length) this.arrive(u);

    if (u.mode === 'mission' && u.phase === 'away') {
      u.mission.remaining -= dm;
      if (u.mission.remaining <= 0) this.finishMission(u);
    } else if (u.mode === 'patrol' && u.patrol) {
      u.patrol.remaining -= dm; u.patrol.evAcc += dm;
      if (u.patrol.evAcc >= 45) { u.patrol.evAcc -= 45; this.patrolEvent(u); }
      if (u.patrol.remaining <= 0) this.finishPatrol(u);
    } else if (u.mode === 'idle') {
      // 치료: 의무실에 있으면 회복(의무팀 동석 시 2배)
      if (u.home === 'medical') {
        const medics = this.units.filter((x) => x.dept === 'medical' && x.mode === 'idle' && x.home === 'medical').length;
        if (u.hp < 100) u.hp = Math.min(100, u.hp + dm * (0.1 + 0.06 * Math.min(2, medics)));
      }
      if (this.isInjured(u) && u.home !== 'medical') { this.note(`${u.name} 부상 — 의무실로 이동`, 'alert'); this.sendToRoom(u.id, 'medical', true); return; }
      u.wait -= dt;
      if (u.wait <= 0) {
        u.wait = 3 + this.rand() * 7;
        if (this.rand() < 0.65) { const s = this.spot(u.home); const p = findPath(u.tx, u.ty, s[0], s[1]); if (p && p.length < 14) u.path = p; }
      }
    }
  }

  stepMove(u, dt) {
    let remain = WALK * dt * TS;
    while (remain > 0 && u.path.length) {
      const [tx, ty] = u.path[0];
      const gx = tx * TS + 8, gy = ty * TS + 15, dx = gx - u.x, dy = gy - u.y, d = Math.hypot(dx, dy);
      if (d > 0.01) u.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (d <= remain) { u.x = gx; u.y = gy; u.tx = tx; u.ty = ty; u.path.shift(); remain -= d; }
      else { u.x += (dx / d) * remain; u.y += (dy / d) * remain; remain = 0; }
    }
  }

  arrive(u) {
    if (u.mode === 'goto') { u.mode = 'idle'; u.wait = 2 + this.rand() * 4; }
    else if (u.mode === 'mission') {
      if (u.phase === 'out') { u.phase = 'away'; u.away = true; this.note(`${u.name} 정문 통과 — 임무 지역으로 이동`, 'info', false); }
      else if (u.phase === 'back') { u.mode = 'idle'; u.phase = null; u.mission = null; u.wait = 2; }
    } else if (u.mode === 'patrol' && u.patrol) {
      const wp = PATROLS[u.patrol.id]; u.patrol.wi = (u.patrol.wi + 1) % wp.length;
      const nx = wp[u.patrol.wi]; const p = findPath(u.tx, u.ty, nx[0], nx[1]);
      if (p) u.path = p; else this.finishPatrol(u);
    }
  }

  finishMission(u) {
    const m = MISSION[u.mission.id]; const p = successChance(u, m); const r = this.rand();
    let result = 'fail', reward = 0, loss = 0;
    if (r < p * 0.8) { result = 'success'; reward = m.reward; u.mor = Math.min(100, u.mor + 5); this.rep += m.risk > 0.4 ? 2 : 1; }
    else if (r < p) { result = 'partial'; reward = Math.round(m.reward * 0.5); loss = Math.round(this.rand() * 10); u.mor = Math.min(100, u.mor + 1); }
    else { loss = Math.round(8 + this.rand() * 22 + m.risk * 20); u.mor = Math.max(0, u.mor - 9); this.rep -= 1; }
    u.hp = Math.max(5, u.hp - loss); this.funds += reward;
    this.dayLog.missions.push({ who: u.name, id: u.id, dept: u.dept, name: m.name, result, reward, loss, clock: Math.floor(this.clock) });
    const label = { success: '성공', partial: '부분 성공', fail: '실패' }[result];
    this.note(`${u.name} 임무 ${label}: ${m.name}${reward ? ` (+${reward.toLocaleString('ko-KR')} CR)` : ''}${loss ? ` · 부상 -${loss}` : ''}`, result === 'fail' ? 'bad' : 'good');
    // 정문으로 복귀
    u.phase = 'back'; u.away = false; u.place(GATE.x, GATE.y);
    const s = this.spot(u.home); u.path = findPath(u.tx, u.ty, s[0], s[1]) || [];
  }

  patrolEvent(u) {
    const incident = this.rand() < 0.18;
    const ev = incident ? PATROL_EVENTS.incident[Math.floor(this.rand() * PATROL_EVENTS.incident.length)] : [PATROL_EVENTS.clear[Math.floor(this.rand() * PATROL_EVENTS.clear.length)], 'clear'];
    u.patrol.incidents.push({ text: ev[0], kind: ev[1] });
    if (ev[1] === 'bad') u.hp = Math.max(5, u.hp - 5);
    if (incident) { this.note(`${u.name} 순찰 보고: ${ev[0]}`, ev[1] === 'bad' ? 'bad' : 'good'); if (ev[1] === 'good') this.rep += 1; }
  }

  finishPatrol(u) {
    const p = u.patrol; if (!p) return;
    const meta = PATROL_META.find((x) => x.id === p.id);
    this.dayLog.patrols.push({ who: u.name, dept: u.dept, route: meta.name, events: p.incidents, clock: Math.floor(this.clock) });
    this.note(`${u.name} 순찰 종료 (${meta.name}) — 특이 보고 ${p.incidents.filter((e) => e.kind !== 'clear').length}건`, 'info', false);
    u.patrol = null; u.mode = 'idle';
    this.sendToRoom(u.id, u.home, true);
  }

  /* ── 하루 마감 ── */
  buildReport(preview = false) {
    // 진행 중인 임무/순찰은 제출 시 마감 정산 (미리보기에서는 상태를 바꾸지 않는다)
    if (!preview) for (const u of this.units) {
      if (u.mode === 'mission' && u.mission) { u.mission.remaining = 0; this.finishMission(u); u.phase = null; u.mode = 'idle'; u.mission = null; const s = this.spot(u.home); u.place(s[0], s[1]); }
      if (u.mode === 'patrol' && u.patrol) { this.finishPatrol(u); }
    }
    const L = this.dayLog;
    const income = L.missions.reduce((a, m) => a + m.reward, 0);
    const upkeep = UPKEEP_PER_UNIT * this.units.length;
    const depts = DEPTS.map((d) => {
      const members = this.units.filter((u) => u.dept === d.key);
      const ms = L.missions.filter((m) => m.dept === d.key);
      return { key: d.key, ko: d.ko, en: d.en, no: d.no, members: members.length, missions: ms.length, success: ms.filter((m) => m.result === 'success').length, partial: ms.filter((m) => m.result === 'partial').length, fail: ms.filter((m) => m.result === 'fail').length, patrols: L.patrols.filter((p) => p.dept === d.key).length, income: ms.reduce((a, m) => a + m.reward, 0), avgHp: Math.round(members.reduce((a, u) => a + u.hp, 0) / members.length) };
    });
    const injured = this.units.filter((u) => u.hp < 50).map((u) => ({ name: u.name, hp: Math.round(u.hp) }));
    const m = L.missions;
    const summary = `임무 ${m.length}건(성공 ${m.filter((x) => x.result === 'success').length}, 부분 ${m.filter((x) => x.result === 'partial').length}, 실패 ${m.filter((x) => x.result === 'fail').length}), 순찰 ${L.patrols.length}회, 명령 ${L.orders}건. 수입 ${fmtCredits(income)}, 운영비 ${fmtCredits(-upkeep)}.`;
    return { day: this.day, createdAt: Date.now(), clockEnd: Math.floor(this.clock), ended: this.ended, fundsStart: this.dayStartFunds, income, upkeep, fundsEnd: this.funds - upkeep, rep: this.rep, missions: m.slice(), patrols: L.patrols.slice(), overheard: L.overheard.slice(), depts, injured, summary };
  }

  /** 보고서 제출 후 다음 날로 */
  nextDay(report) {
    this.funds = report.fundsEnd;
    const medics = this.units.filter((u) => u.dept === 'medical').length;
    for (const u of this.units) {
      u.hp = Math.min(100, u.hp + 22 + (u.hp < 50 ? 10 * medics : 0));
      u.mor = Math.round(u.mor + (60 - u.mor) * 0.3);
      u.mode = 'idle'; u.phase = null; u.mission = null; u.patrol = null; u.away = false; u.heard.clear();
      const s = this.spot(u.home); u.place(s[0], s[1]);
    }
    this.day += 1; this.clock = 0; this.ended = false; this.speed = 0; this.dayStartFunds = this.funds; this.dayLog = this.freshLog();
    this.note(`DAY ${this.day} 개시 — 자금 ${fmtCredits(this.funds)}`, 'info', false);
  }

  /* ── 저장/복원 ── */
  serialize() {
    const units = {};
    for (const u of this.units) units[u.id] = { hp: Math.round(u.hp), mor: Math.round(u.mor), home: u.home, mode: u.mode === 'goto' ? 'idle' : u.mode, phase: u.phase, mission: u.mission, patrol: u.patrol ? { ...u.patrol, wi: 0 } : null };
    return { v: 1, day: this.day, clock: Math.floor(this.clock), funds: this.funds, rep: this.rep, ended: this.ended, dayStartFunds: this.dayStartFunds, dayLog: this.dayLog, log: this.log.slice(-40), units };
  }
  restore(s) {
    if (!s || s.v !== 1) return;
    this.day = s.day; this.clock = s.clock; this.funds = s.funds; this.rep = s.rep || 0; this.ended = !!s.ended; this.dayStartFunds = s.dayStartFunds ?? s.funds;
    this.dayLog = s.dayLog || this.freshLog(); this.log = s.log || [];
    for (const [id, st] of Object.entries(s.units || {})) {
      const u = this.byId[id]; if (!u) continue;
      u.hp = st.hp; u.mor = st.mor; u.home = ROOM_LABEL[st.home] ? st.home : u.home;
      if (st.mode === 'mission' && st.mission && st.phase !== 'back') { u.mode = 'mission'; u.phase = 'away'; u.mission = st.mission; u.away = true; }
      else if (st.mode === 'patrol' && st.patrol) { u.mode = 'patrol'; u.patrol = st.patrol; const wp = PATROLS[u.patrol.id][0]; u.place(wp[0], wp[1]); u.patrol.wi = 0; const p = findPath(u.tx, u.ty, PATROLS[u.patrol.id][1][0], PATROLS[u.patrol.id][1][1]); u.path = p || []; u.patrol.wi = 1; }
      else { u.mode = 'idle'; const sp = this.spot(u.home); u.place(sp[0], sp[1]); }
    }
  }
}
export { DEPTS, DEPT, ROOMS };
