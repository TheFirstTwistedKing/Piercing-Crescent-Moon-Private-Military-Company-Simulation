// 시뮬레이션 코어. 렌더/DOM 과 완전히 분리되어 Node 에서도 테스트된다.
import { ROSTER, DEPT, DEPTS, MISSION, GMISSION, PATROL_META, PATROL_EVENTS, MONO, ROOM_LABEL } from './data.js';
import { TS, GATE, PATROLS, roomFreeTiles, findPath, ROOMS, setSlotSolid, SLOTS, isOutdoor, FURNACE, yardWorkTiles } from './map.js';
import { WEATHERS, rollWeather, dailySnow, START_SNOW, SNOW_SLOW, TASKS } from './weather.js';
import { ITEM, STAT_ITEM_CAP, FURN_SLOTS, ROOM_KEYS } from './shop.js';
import { LEADER_IDS, LEADER_SET, LEADER_TALK, AFF_MAX, REQUEST_COST } from './leaders.js';
import { WEAPON } from './weapons.js';
import { TRAIT, ABILITY, GACHA_ODDS, TRAITS, MAX_TRAITS, MAX_ABILITIES } from './traits.js';
import { HAIR } from './hair.js';
import { EVENTS, EVENT, EV_CHANCE, EV_MAX_PER_DAY, EV_COOLDOWN, fxChip } from './events.js';
import { RESEARCH_BY_KEY, freshResearch } from './research.js';
import { CSTATS, STAT_MAX, randomPool, sumAlloc, autoAlloc, emptyAlloc, sumFx, clampStat, derive } from './rules.js';

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

export function successChance(u, m, night = false, extra = 0) {
  const stat = u.dv ? u.dv[m.stat] : u.stats[m.stat];
  const same = u.dept === m.dept;
  let p = 0.9 - m.risk * 0.95 + (stat - 55) / 220 + (u.mor - 50) / 400 + (same ? 0.07 : -0.13);
  if (u.fx) p += u.fx.succ + (night ? u.fx.night : u.fx.day) + (u.cs?.cha || 0) * 0.004;
  p += extra;
  if (u.hp < 50) p -= (50 - u.hp) / 250;
  return Math.max(0.05, Math.min(0.97, p));
}

class Unit {
  constructor(base, rand = Math.random) {
    Object.assign(this, base);
    // 커스터마이징: 포인트 풀(40~50 랜덤), 배분, 특성 뽑기, 장착
    this.pool = randomPool(rand); this.alloc = autoAlloc(this.pool, base.dept);
    this.used = 0; this.traits = []; this.eq = []; this.ab = []; this.baseName = base.name; this.baseLatin = base.latin;
    this.gear = { armor: null, acc: null }; this.bonus = emptyAlloc(); this.kit = false; this.warm = 0;   // 장비 · 아이템 스탯 보너스 · 임무 지원 키트 · 방한 팩(일자)
    this.isLeader = LEADER_SET.has(base.id); this.aff = 0; this.talked = 0; this.asked = 0; this.work = null; this.aura = 0;
    this.hp = 100; this.mor = 60;
    this.home = base.dept === 'operation' ? 'operation' : base.dept; // 부서 방 = 부서 key
    this.mode = 'idle';          // idle | goto | mission | patrol | work
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
    this.units = ROSTER.map((b) => new Unit({ ...b, stats: { ...b.stats }, look: { ...b.look } }, this.rand));
    this.byId = Object.fromEntries(this.units.map((u) => [u.id, u]));
    this.day = 1; this.clock = 0; this.funds = START_FUNDS; this.rep = 0; this.speed = 0; this.ended = false;
    this.research = freshResearch();
    this.weather = { today: rollWeather(rand), next: rollWeather(rand) }; this.snow = START_SNOW;
    this.inv = {}; this.placed = Object.fromEntries(ROOM_KEYS.map((k) => [k, Array(FURN_SLOTS).fill(null)]));
    this.dayStartFunds = this.funds; this.dayLog = this.freshLog(); this.log = [];
    this.groups = {}; this.gseq = 0;
    this.ev = { pending: null, cd: {}, today: 0, acc: 0, buffs: [], on: Sim.EVENTS_ON, resume: 0 };
    this.listeners = {}; this.dirty = false;
    this.syncSlots();
    for (const u of this.units) { const s = this.spot(u.home); u.place(s[0], s[1]); }
    this.refresh();
    if (saved) this.restore(saved);
  }

  /* ── 이벤트/로그 ── */
  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); return () => { this.listeners[evt] = this.listeners[evt].filter((f) => f !== fn); }; }
  emit(evt, data) { for (const f of this.listeners[evt] || []) f(data); }
  note(text, kind = 'info', toast = true) {
    const e = { day: this.day, clock: Math.floor(this.clock), text, kind };
    this.log.push(e); if (this.log.length > 80) this.log.shift();
    if (toast && !this.quiet) this.emit('toast', e);
    this.dirty = true;
  }
  freshLog() { return { missions: [], patrols: [], overheard: [], orders: 0, events: [] }; }

  spot(room) { const t = roomFreeTiles(room); return t[Math.floor(this.rand() * t.length)] || [28, 18]; }

  /* ── 커스터마이징 / 연구 ── */
  weatherFx() { return WEATHERS[this.weather.today]; }
  /** 날씨·아이템 효과로 인한 임무 성공률 보정 (안개 -10%, 안개 고글이면 무시, 임무 지원 키트 +10%) */
  succBonus(u) { const w = this.weatherFx(); return (w.succ && !u.fx.fogProof ? w.succ : 0) + (u.kit ? 0.1 : 0); }
  chance(u, m) { return successChance(u, m, this.clock >= DAY_PHASE_MIN, this.succBonus(u)); }
  incomeMult() { return 1 + 0.005 * this.research.income; }
  pullsLeft(u) { return 10 + this.research.pulls - u.used; }
  /** 방에 놓인 가구의 효과(그 방을 거처로 쓰는 인원 모두에게 적용). 선호 방이면 ×1.5. 유지비는 가구 단위로 따로 센다. */
  roomFx(room) {
    const out = {};
    for (const id of this.placed[room] || []) {
      if (!id) continue; const f = ITEM[id], mul = f.fav.includes(room) ? 1.5 : 1;
      for (const [k, v] of Object.entries(f.fx)) { if (k === 'upkeep') continue; out[k] = typeof v === 'boolean' ? v : (out[k] || 0) + v * mul; }
    }
    return out;
  }
  furnitureUpkeep() { let t = 0; for (const room of Object.keys(this.placed)) for (const id of this.placed[room]) if (id) t += ITEM[id].fx.upkeep || 0; return t; }
  syncSlots() { for (const room of ROOM_KEYS) for (let i = 0; i < FURN_SLOTS; i++) setSlotSolid(room, i, !!this.placed[room]?.[i]); }
  leaderUnit(dept) { return this.byId[LEADER_IDS[dept]]; }

  /** 효과 합산·파생 능력치 갱신 (팀장 감화, 카피캣은 다른 인원 값에 의존하므로 단계별로 계산) */
  refresh() {
    const rooms = {};
    for (const u of this.units) {
      u.fx = sumFx(u, [ITEM[u.gear.armor]?.fx, ITEM[u.gear.acc]?.fx, (rooms[u.home] ||= this.roomFx(u.home)), ...this.ev.buffs.filter((b) => !b.dept || b.dept === u.dept).map((b) => b.fx)]); u.aura = 0;
      u.csBase = Object.fromEntries(CSTATS.map(({ k }) => [k, clampStat(u.alloc[k] + u.bonus[k] + u.fx[k])]));
    }
    // 팀장 감화: 같은 부서 팀원의 임무 성공률 +(카리스마 × 0.4% + 친밀도 × 0.3%)
    for (const d of DEPTS) { const L = this.leaderUnit(d.key); const aura = 0.004 * L.csBase.cha + 0.003 * L.aff; for (const u of this.units) if (u.dept === d.key && u !== L) { u.fx.succ += aura; u.aura = aura; } }
    for (const u of this.units) {
      u.cs = { ...u.csBase };
      if (u.fx.copycat) for (const { k } of CSTATS) { const best = Math.max(0, ...this.units.filter((m) => m !== u && m.dept === u.dept).map((m) => m.csBase[k])); u.cs[k] = Math.max(u.cs[k], Math.round(best * 0.7)); }
      u.dv = derive(u.stats, u.cs);
    }
    this.dirty = true; this.emit('custom');
  }

  /* ── 상점 / 인벤토리 ── */
  owned(id) { return this.inv[id] || 0; }
  buy(id, n = 1) {
    const it = ITEM[id]; if (!it) return { ok: false, reason: '없는 품목' };
    const cost = it.price * n; if (this.funds < cost) return { ok: false, reason: `자금이 부족합니다. (필요 ${cost.toLocaleString('ko-KR')} CR)` };
    this.funds -= cost; this.inv[id] = this.owned(id) + n; this.dirty = true; this.emit('custom'); return { ok: true };
  }
  useStatItem(uid, id) {
    const u = this.byId[uid], it = ITEM[id];
    if (!it || it.cat !== 'stat' || this.owned(id) < 1) return { ok: false, reason: '보유하지 않은 아이템' };
    if (u.bonus[it.stat] >= STAT_ITEM_CAP) return { ok: false, reason: `이 스탯은 아이템으로 최대 +${STAT_ITEM_CAP} 까지입니다.` };
    this.inv[id]--; u.bonus[it.stat]++; this.refresh(); return { ok: true };
  }
  equipGear(uid, id) {
    const u = this.byId[uid], it = ITEM[id];
    if (!it || it.cat !== 'equip' || this.owned(id) < 1) return { ok: false, reason: '보유하지 않은 장비' };
    const old = u.gear[it.slot]; if (old) this.inv[old] = this.owned(old) + 1;
    this.inv[id]--; u.gear[it.slot] = id; this.refresh(); return { ok: true };
  }
  unequipGear(uid, slot) {
    const u = this.byId[uid], id = u.gear[slot]; if (!id) return { ok: false, reason: '장착한 장비가 없습니다.' };
    this.inv[id] = this.owned(id) + 1; u.gear[slot] = null; this.refresh(); return { ok: true };
  }
  useConsumable(uid, id) {
    const u = this.byId[uid], it = ITEM[id];
    if (!it || it.cat !== 'consume' || this.owned(id) < 1) return { ok: false, reason: '보유하지 않은 소모품' };
    const e = it.use;
    if (e.hp && u.hp >= 100) return { ok: false, reason: '이미 HP가 가득합니다.' };
    if (e.mor && u.mor >= 100) return { ok: false, reason: '이미 사기가 가득합니다.' };
    if (e.kit && u.kit) return { ok: false, reason: '이미 임무 지원 키트가 적용돼 있습니다.' };
    if (e.warm && u.warm === this.day) return { ok: false, reason: '오늘은 이미 방한 팩을 썼습니다.' };
    this.inv[id]--;
    if (e.hp) u.hp = Math.min(100, u.hp + e.hp); if (e.mor) u.mor = Math.min(100, u.mor + e.mor); if (e.kit) u.kit = true; if (e.warm) u.warm = this.day;
    this.refresh(); return { ok: true };
  }
  placeFurniture(room, slot, id) {
    const it = ITEM[id]; if (!it || it.cat !== 'furniture' || !this.placed[room] || !(slot >= 0 && slot < FURN_SLOTS)) return { ok: false, reason: '배치할 수 없습니다.' };
    if (this.owned(id) < 1) return { ok: false, reason: '보유하지 않은 가구' }; if (this.placed[room][slot]) return { ok: false, reason: '이미 가구가 놓인 자리입니다.' };
    this.inv[id]--; this.placed[room][slot] = id; setSlotSolid(room, slot, true); this.refresh(); return { ok: true };
  }
  removeFurniture(room, slot) {
    const id = this.placed[room]?.[slot]; if (!id) return { ok: false, reason: '비어 있는 자리입니다.' };
    this.inv[id] = this.owned(id) + 1; this.placed[room][slot] = null; setSlotSolid(room, slot, false); this.refresh(); return { ok: true };
  }

  /* ── 팀장 ── */
  /** topic: report(보고 듣기) | encourage(격려, 하루 1회) | request(지원 요청 2,000 CR, 하루 1회) */
  talkLeader(dept, topic) {
    const L = this.leaderUnit(dept); if (!L) return { ok: false, reason: '팀장을 찾을 수 없습니다.' };
    const pool = LEADER_TALK[L.id], pick = (a) => a[Math.floor(this.rand() * a.length)];
    const members = this.units.filter((u) => u.dept === dept);
    const avg = (f) => Math.round(members.reduce((a, u) => a + f(u), 0) / members.length);
    if (topic === 'report') {
      const ms = this.dayLog.missions.filter((m) => m.dept === dept).length, w = this.weatherFx();
      const lines = [pick(pool.report), `부서원 ${members.length}명 · 평균 HP ${avg((u) => u.hp)} · 평균 사기 ${avg((u) => u.mor)} · 오늘 임무 ${ms}건.`];
      if (w.speed) lines.push('혹한이라 이동이 더딥니다.'); else if (w.succ) lines.push('안개가 짙어 작전이 불안합니다.');
      return { ok: true, lines, effects: [] };
    }
    if (topic === 'encourage') {
      if (L.talked === this.day) return { ok: false, reason: '오늘은 이미 격려했습니다.' };
      L.talked = this.day; members.forEach((u) => { u.mor = Math.min(100, u.mor + 8); }); L.aff = Math.min(AFF_MAX, L.aff + 1); this.refresh();
      return { ok: true, lines: [pick(pool.encourage)], effects: ['부서 사기 +8', '팀장 친밀도 +1'] };
    }
    if (topic === 'request') {
      if (L.asked === this.day) return { ok: false, reason: '오늘은 이미 지원을 요청받았습니다.' };
      if (this.funds < REQUEST_COST) return { ok: false, reason: `자금이 부족합니다. (필요 ${REQUEST_COST.toLocaleString('ko-KR')} CR)` };
      L.asked = this.day; this.funds -= REQUEST_COST; members.forEach((u) => { u.mor = Math.min(100, u.mor + 15); u.hp = Math.min(100, u.hp + 10); }); L.aff = Math.min(AFF_MAX, L.aff + 1); this.refresh();
      return { ok: true, lines: [pick(pool.request)], effects: [`-${REQUEST_COST.toLocaleString('ko-KR')} CR`, '부서 사기 +15 · HP +10', '팀장 친밀도 +1'] };
    }
    return { ok: false, reason: '알 수 없는 대화' };
  }


  /* ── 이벤트 엔진 ──
     게임 1시간마다 EV_CHANCE 확률로 사건이 터지고(하루 최대 EV_MAX_PER_DAY건), 시간이 멈춘 채 선택을 기다린다.
     선택지는 비용·능력치 판정(부서에서 해당 능력치가 가장 높은 인원이 나선다)·결과 효과로 이루어진다. */
  get pendingEvent() { return this.ev.pending; }
  evPool(dept) { return dept ? this.units.filter((u) => u.dept === dept) : this.units; }
  evBest(dept, stat) { return this.evPool(dept).reduce((b, u) => (u.dv[stat] > b.dv[stat] ? u : b)); }
  evChance(best, chk) { return Math.max(0.1, Math.min(0.95, 0.5 + (best.dv[chk.stat] - chk.diff) * 0.01 + best.fx.succ)); }
  evEligible(e) {
    const last = this.ev.cd[e.id]; if (last != null && this.day - last < EV_COOLDOWN) return false;
    const c = e.when || {};
    if (c.night && this.clock < DAY_PHASE_MIN) return false;
    if (c.weather && !c.weather.includes(this.weather.today)) return false;
    if (c.snowMin && this.snow < c.snowMin) return false;
    return true;
  }
  /** 지정한 사건(id)을 강제로 시작하거나, 없으면 조건에 맞는 사건을 가중치로 뽑는다. 시작되면 시간이 멈춘다. */
  startEvent(id = null) {
    if (this.ev.pending) return null;
    let def = id ? EVENT[id] : null;
    if (!def) {
      const pool = EVENTS.filter((e) => this.evEligible(e)); if (!pool.length) return null;
      let r = this.rand() * pool.reduce((a, e) => a + e.weight, 0);
      def = pool[pool.length - 1]; for (const e of pool) { r -= e.weight; if (r < 0) { def = e; break; } }
    }
    const members = this.evPool(def.dept), who = members[Math.floor(this.rand() * members.length)];
    this.ev.pending = { id: def.id, who: who.id }; this.ev.cd[def.id] = this.day; this.ev.today++; this.ev.resume = this.speed; this.speed = 0;
    this.note(`사건 발생: ${def.title}`, 'alert', false); this.emit('event', this.ev.pending); this.dirty = true;
    return def;
  }
  tickEvents(dm) {
    if (!this.ev.on || this.ev.pending) return;
    this.ev.acc += dm;
    while (this.ev.acc >= 60) {
      this.ev.acc -= 60;
      if (this.ev.today >= EV_MAX_PER_DAY || this.clock >= DAY_MINUTES - 90) continue;
      if (this.rand() < EV_CHANCE) { this.startEvent(); return; }
    }
  }
  evText(def, who, best, t) {
    const L = def.dept ? this.leaderUnit(def.dept) : null;
    return t.replace(/\{n\}/g, who.name).replace(/\{L\}/g, L ? L.name : '팀장').replace(/\{best\}/g, (best || who).name);
  }
  /** 화면에 보여 줄 현재 사건: 제목·본문·선택지(비용, 판정 확률, 선택 가능 여부) */
  eventView() {
    const p = this.ev.pending; if (!p) return null;
    const def = EVENT[p.id], who = this.byId[p.who], KO = { cmb: '전투', def: '방어', mob: '기동', med: '의료', int: '정보' };
    return {
      id: def.id, dept: def.dept, deptKo: def.dept ? DEPT[def.dept].ko : '기지 전체', title: def.title, text: this.evText(def, who, null, def.text), who: who.name,
      choices: def.choices.map((c, i) => {
        const best = c.check ? this.evBest(def.dept, c.check.stat) : null, short = c.cost && this.funds < c.cost;
        return { i, label: this.evText(def, who, null, c.label), cost: c.cost || 0, disabled: !!short, reason: short ? `자금 부족 (필요 ${c.cost.toLocaleString('ko-KR')} CR)` : '',
          check: c.check ? { stat: KO[c.check.stat], diff: c.check.diff, chance: this.evChance(best, c.check), best: best.name } : null };
      }),
    };
  }
  applyEvFx(f, def, who) {
    const [k, v, a] = f, scope = a || 'dept';
    const targets = k === 'mor' || k === 'hp' ? (scope === 'unit' ? [who] : scope === 'all' ? this.units : this.evPool(def.dept)) : [];
    if (k === 'funds') this.funds = Math.max(0, this.funds + v);
    else if (k === 'rep') this.rep += v;
    else if (k === 'mor') for (const u of targets) u.mor = Math.max(0, Math.min(100, u.mor + v));
    else if (k === 'hp') for (const u of targets) u.hp = v < 0 ? Math.max(5, u.hp + v) : Math.min(100, u.hp + v);
    else if (k === 'item' && ITEM[v]) this.inv[v] = this.owned(v) + (a || 1);
    else if (k === 'research') this.research.points += v;
    else if (k === 'aff') { const L = def.dept ? this.leaderUnit(def.dept) : null; if (L) L.aff = Math.max(0, Math.min(AFF_MAX, L.aff + v)); }
    else if (k === 'snow') this.snow = Math.max(0, Math.min(100, this.snow + v));
    else if (k === 'buff') this.ev.buffs.push({ fx: { ...v }, label: a, dept: def.dept || null });
  }
  chooseEvent(i) {
    const p = this.ev.pending; if (!p) return { ok: false, reason: '진행 중인 사건이 없습니다.' };
    const def = EVENT[p.id], c = def.choices[i]; if (!c) return { ok: false, reason: '없는 선택지입니다.' };
    if (c.cost && this.funds < c.cost) return { ok: false, reason: `자금이 부족합니다. (필요 ${c.cost.toLocaleString('ko-KR')} CR)` };
    const who = this.byId[p.who]; let best = who, passed = null, out = c.out;
    if (c.cost) this.funds -= c.cost;
    if (c.check) { best = this.evBest(def.dept, c.check.stat); passed = this.rand() < this.evChance(best, c.check); out = passed ? c.ok : c.fail; }
    const chips = c.cost ? [{ t: `비용 -${c.cost.toLocaleString('ko-KR')} CR`, good: false }] : [];
    for (const f of out.fx) { this.applyEvFx(f, def, who); chips.push(fxChip(f, (id) => ITEM[id]?.name || id)); }
    const text = this.evText(def, who, best, out.t), label = this.evText(def, who, null, c.label);
    this.ev.pending = null; this.dayLog.events.push({ title: def.title, choice: label, text, chips: chips.map((x) => x.t), passed, clock: Math.floor(this.clock) });
    this.note(`사건 「${def.title}」 — ${label}${passed === null ? '' : passed ? ' (성공)' : ' (실패)'}`, passed === false ? 'bad' : 'info', false);
    this.refresh(); this.emit('event', null);
    return { ok: true, title: def.title, choice: label, text, chips, passed, best: best.name };
  }

  /* ── 야외 작업(재설 / 용광로 발전) ── */
  get furnaceActive() { return this.units.some((u) => u.mode === 'work' && u.work?.kind === 'furnace' && u.work.started); }
  sendWork(id, kind) {
    const u = this.byId[id], T = TASKS[kind], c = this.canCommand(u);
    if (!c.ok) return c; if (!T) return { ok: false, reason: '알 수 없는 작업' };
    if (this.isInjured(u)) return { ok: false, reason: '부상이 심해 작업할 수 없습니다. (HP 25 미만)' };
    if (kind === 'furnace' && this.units.some((x) => x !== u && x.mode === 'work' && x.work?.kind === 'furnace')) return { ok: false, reason: '이미 용광로를 가동 중인 인원이 있습니다.' };
    if (kind === 'snow' && this.snow <= 0) return { ok: false, reason: '치울 눈이 없습니다.' };
    const tiles = kind === 'furnace' ? [FURNACE.spot] : yardWorkTiles(); const spot = tiles[Math.floor(this.rand() * tiles.length)];
    const path = findPath(u.tx, u.ty, spot[0], spot[1]); if (!path) return { ok: false, reason: '작업 장소로 갈 수 없습니다.' };
    if (u.mode === 'patrol') u.patrol = null;
    u.mode = 'work'; u.work = { kind, remaining: T.dur, total: T.dur, started: false }; u.path = path; this.dayLog.orders++;
    this.note(`${u.name} ${T.ko} 시작`, 'order', false); return { ok: true };
  }
  finishWork(u) {
    const T = TASKS[u.work.kind]; this.note(`${u.name} ${T.ko} 완료 — 적설 ${Math.round(this.snow)}%`, 'good', false);
    u.work = null; u.mode = 'idle'; this.sendToRoom(u.id, u.home, true);
  }

  /* ── 커스터마이징 ── */
  setHair(id, style, color) {
    const u = this.byId[id]; if (!HAIR[style]) return { ok: false, reason: '없는 스타일' };
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { ok: false, reason: '색 형식 오류' };
    u.look.hairStyle = style; u.look.hair = color.toLowerCase(); this.dirty = true; this.emit('custom'); return { ok: true };
  }
  /** 머리 끝색(그라데이션). null 이면 단색. */
  setHairTip(id, tip) {
    const u = this.byId[id]; if (tip !== null && !/^#[0-9a-fA-F]{6}$/.test(tip)) return { ok: false, reason: '색 형식 오류' };
    u.look.hair2 = tip ? tip.toLowerCase() : null; this.dirty = true; this.emit('custom'); return { ok: true };
  }
  /** 이름(1~12자)과 라틴어 이름(영문 2~14자) 변경. 다른 캐릭터와 같은 이름은 불가. */
  nameProblem(id, name, latin) {
    if (name.length < 1 || name.length > 12 || /[<>\u0000-\u001f]/.test(name)) return '이름은 1~12자로 입력하세요. (< > 제외)';
    if (!/^[A-Za-z][A-Za-z '\-]{1,13}$/.test(latin)) return "라틴어 이름은 영문 2~14자로 입력하세요. (공백 · - ' 가능)";
    const key = (x) => x.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
    for (const o of this.units) { if (o.id === id) continue; if (key(o.name) === key(name)) return '다른 캐릭터와 같은 이름입니다.'; if (key(o.latin) === key(latin)) return '다른 캐릭터와 같은 라틴어 이름입니다.'; }
    return '';
  }
  setName(id, name, latin) {
    const u = this.byId[id]; name = String(name ?? '').replace(/\s+/g, ' ').trim(); latin = String(latin ?? u.latin).replace(/\s+/g, ' ').trim();
    const bad = this.nameProblem(id, name, latin); if (bad) return { ok: false, reason: bad };
    u.name = name; u.latin = latin; this.dirty = true; this.emit('custom'); return { ok: true };
  }
  resetName(id) { const u = this.byId[id]; return this.setName(id, u.baseName, u.baseLatin); }
  setWeapon(id, w) { const u = this.byId[id]; if (!WEAPON[w]) return { ok: false, reason: '없는 무기' }; u.weapon = w; this.refresh(); return { ok: true }; }
  /** 스탯 한 칸을 v 로(0~10, 총합은 포인트 풀 이내). 실제 반영된 값을 돌려준다. */
  setStat(id, k, v) {
    const u = this.byId[id]; if (!(k in u.alloc)) return { ok: false };
    const others = sumAlloc(u.alloc) - u.alloc[k];
    u.alloc[k] = Math.max(0, Math.min(STAT_MAX, Math.floor(v), u.pool - others)); this.refresh(); return { ok: true, value: u.alloc[k] };
  }
  resetStats(id) { const u = this.byId[id]; u.alloc = emptyAlloc(); this.refresh(); }
  autoStats(id) { const u = this.byId[id]; u.alloc = autoAlloc(u.pool, u.dept); this.refresh(); }
  /** 특성 뽑기: 일반 70% / 희귀 25% / 전설 5%. 이미 가진 특성은 제외. */
  pullTrait(id) {
    const u = this.byId[id];
    if (this.pullsLeft(u) <= 0) return { ok: false, reason: '뽑기 기회를 모두 사용했습니다.' };
    const roll = this.rand(), rar = roll < GACHA_ODDS.l ? 'l' : roll < GACHA_ODDS.l + GACHA_ODDS.r ? 'r' : 'c';
    let pool = TRAITS.filter((t) => t.rarity === rar && !u.traits.includes(t.id));
    if (!pool.length) pool = TRAITS.filter((t) => !u.traits.includes(t.id));
    if (!pool.length) return { ok: false, reason: '더 뽑을 특성이 없습니다.' };
    const t = pool[Math.floor(this.rand() * pool.length)];
    u.traits.push(t.id); u.used++; this.dirty = true; this.emit('custom');
    return { ok: true, trait: t, left: this.pullsLeft(u) };
  }
  toggleTrait(id, tid) {
    const u = this.byId[id]; if (!u.traits.includes(tid)) return { ok: false, reason: '보유하지 않은 특성' };
    if (u.eq.includes(tid)) u.eq = u.eq.filter((x) => x !== tid);
    else { if (u.eq.length >= MAX_TRAITS) return { ok: false, reason: `특성은 최대 ${MAX_TRAITS}개까지 장착할 수 있습니다.` }; u.eq.push(tid); }
    this.refresh(); return { ok: true };
  }
  toggleAbility(id, aid) {
    const u = this.byId[id]; if (!this.research.abilities.includes(aid)) return { ok: false, reason: '아직 연구하지 않은 능력입니다.' };
    if (u.ab.includes(aid)) u.ab = u.ab.filter((x) => x !== aid);
    else { if (u.ab.length >= MAX_ABILITIES) return { ok: false, reason: `능력은 최대 ${MAX_ABILITIES}개까지 장착할 수 있습니다.` }; u.ab.push(aid); }
    this.refresh(); return { ok: true };
  }
  /** 연구 상태: {done, level, max, cost, can} */
  researchState(key) {
    const d = RESEARCH_BY_KEY[key], R = this.research;
    if (d.kind === 'ability') { const done = R.abilities.includes(d.ability); return { done, cost: d.cost(0), can: !done && R.points >= d.cost(0) }; }
    if (d.kind === 'once') { const done = !!R[d.key]; return { done, cost: d.cost(0), can: !done && R.points >= d.cost(0) }; }
    const lv = R[d.key], done = lv >= d.max, cost = d.cost(lv); return { done, level: lv, max: d.max, cost, can: !done && R.points >= cost };
  }
  doResearch(key) {
    const d = RESEARCH_BY_KEY[key]; if (!d) return { ok: false, reason: '없는 연구' };
    const st = this.researchState(key);
    if (st.done) return { ok: false, reason: '이미 완료한 연구입니다.' };
    if (!st.can) return { ok: false, reason: `연구 포인트가 부족합니다. (필요 ${st.cost})` };
    this.research.points -= st.cost;
    if (d.kind === 'ability') this.research.abilities.push(d.ability); else if (d.kind === 'once') this.research[d.key] = true; else this.research[d.key]++;
    this.refresh(); this.note(`연구 완료: ${d.name}`, 'good', false); return { ok: true };
  }

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
    if (u.mode === 'work') { u.work = null; }
    const s = this.spot(room);
    const path = findPath(u.tx, u.ty, s[0], s[1]);
    if (!path) return { ok: false, reason: '길을 찾을 수 없습니다.' };
    u.home = room; u.mode = 'goto'; u.path = path; u.wait = 2;
    if (!auto) { this.dayLog.orders++; this.note(`${u.name} → ${ROOM_LABEL[room]} 이동 명령`, 'order', false); }
    return { ok: true };
  }

  /** 부서 재집결: 그 부서 인원 전원을 부서 방으로 불러 모은다. 임무 중인 인원과 부상자(의무실 이동)는 제외한다. */
  regroup(dept) {
    const d = DEPT[dept]; if (!d) return { ok: false, reason: '알 수 없는 부서' };
    if (this.ended) return { ok: false, reason: '하루가 종료되었습니다. 보고서를 제출하세요.' };
    const moved = [], skipped = [];
    for (const u of this.units.filter((x) => x.dept === dept)) {
      if (u.mode === 'mission') { skipped.push({ name: u.name, why: '임무 중' }); continue; }
      if (this.isInjured(u)) { skipped.push({ name: u.name, why: '부상(의무실)' }); continue; }
      const r = this.sendToRoom(u.id, d.room, true);
      if (r.ok) moved.push(u.name); else skipped.push({ name: u.name, why: r.reason });
    }
    if (moved.length) { this.dayLog.orders++; this.note(`${d.en} 재집결 — ${moved.length}명 ${d.roomKo}(으)로 복귀`, 'order', false); }
    return { ok: moved.length > 0, moved, skipped, reason: moved.length ? '' : '집결시킬 수 있는 인원이 없습니다.' };
  }

  sendMission(id, missionId) {
    const u = this.byId[id]; const m = MISSION[missionId]; const c = this.canCommand(u);
    if (!c.ok) return c;
    if (this.isInjured(u)) return { ok: false, reason: '부상이 심해 임무에 나설 수 없습니다. (HP 25 미만)' };
    if (u.mode === 'patrol') u.patrol = null; if (u.mode === 'work') u.work = null;
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
      const m = MISSION[u.mission.id] || GMISSION[u.mission.id];
      if (u.phase === 'away') return `임무 수행 중 · ${m.name} (남은 ${Math.ceil(u.mission.remaining)}분)`;
      return `임무 ${u.phase === 'out' ? '출발' : '복귀'} 중 · ${m.name}`;
    }
    if (u.mode === 'patrol') return `순찰 중 · ${PATROL_META.find((p) => p.id === u.patrol.id).name} (남은 ${Math.ceil(u.patrol.remaining)}분)`;
    if (u.mode === 'work') return `${TASKS[u.work.kind].ko} ${u.work.started ? `중 (남은 ${Math.ceil(u.work.remaining)}분)` : '하러 이동 중'}`;
    if (u.mode === 'goto') return `이동 중 → ${ROOM_LABEL[u.home]}`;
    if (this.isInjured(u)) return `부상 · ${ROOM_LABEL[u.home]}`;
    return `대기 · ${ROOM_LABEL[u.home]}`;
  }

  /* ── 진행 ── */
  setSpeed(s) { if (s === 3 && !this.research.speed3) s = 2; if (this.ended || this.ev.pending) s = 0; this.speed = s; }

  /** 실제 시간 sec 초만큼 한꺼번에 진행(백그라운드에서 돌아왔을 때 따라잡기). 하루가 끝나거나 정지 상태면 멈춘다. */
  advance(sec) {
    let left = sec;
    while (left > 1e-9 && !this.ended && this.speed > 0) { const d = Math.min(0.1, left); this.update(d); left -= d; }
  }

  update(dtReal) {
    if (this.speed === 0 || this.ended) return;
    const dt = Math.min(dtReal, 0.1) * this.speed;
    const dm = dt * MIN_PER_SEC;
    this.clock += dm;
    if (this.clock >= DAY_MINUTES) { this.clock = DAY_MINUTES; this.ended = true; this.speed = 0; this.note('하루가 종료되었습니다. 오늘의 보고서를 제출하세요.', 'alert'); this.emit('dayend'); }
    for (const u of this.units) this.updateUnit(u, dt, dm);
    this.tickGroups(dm);
    this.tickEvents(dm);
  }

  updateUnit(u, dt, dm) {
    // 이동
    const was = u.path.length > 0;
    if (was) this.stepMove(u, dt);
    u.moving = was && u.path.length > 0;
    if (u.moving) u.anim += dt * 8;
    if (was && !u.path.length) this.arrive(u);

    if (u.mode === 'work' && u.work) {
      if (!u.path.length) u.work.started = true;
      if (u.work.started) { const T = TASKS[u.work.kind]; u.work.remaining -= dm; this.snow = Math.max(0, this.snow - T.rate * dm); if (u.work.remaining <= 0) this.finishWork(u); }
    } else if (u.mode === 'mission' && u.phase === 'away') {
      if (!u.mission.gid) { u.mission.remaining -= dm; if (u.mission.remaining <= 0) this.finishMission(u); }   // 단체 임무는 tickGroups 가 처리
    } else if (u.mode === 'patrol' && u.patrol) {
      u.patrol.remaining -= dm; u.patrol.evAcc += dm;
      if (u.patrol.evAcc >= 45) { u.patrol.evAcc -= 45; this.patrolEvent(u); }
      if (u.patrol.remaining <= 0) this.finishPatrol(u);
    } else if (u.mode === 'idle') {
      // 치료: 의무실에 있으면 회복(의무팀 동석 시 2배)
      if (u.home === 'medical') {
        const medics = this.units.filter((x) => x.dept === 'medical' && x.mode === 'idle' && x.home === 'medical').length;
        if (u.hp < 100) u.hp = Math.min(100, u.hp + dm * (0.1 + 0.06 * Math.min(2, medics)) * (1 + u.fx.heal + 0.1 * this.research.heal));
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
    let spd = 1 + u.fx.speed; const w = this.weatherFx();
    if (w.speed && !(u.fx.coldProof || u.warm === this.day)) spd += w.speed;                 // 한파: 이동 속도 감소
    if (isOutdoor(u.tx, u.ty)) spd -= SNOW_SLOW * (this.snow / 100);                          // 쌓인 눈: 야외 이동 감소
    let remain = WALK * Math.max(0.35, spd) * dt * TS;
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
    if (u.mission.gid) { this.finishGroup(u.mission.gid); return; }
    const m = MISSION[u.mission.id]; const p = this.chance(u, m); const r = this.rand();
    let result = 'fail', reward = 0, loss = 0;
    const mult = Math.max(0.1, (1 + u.fx.reward + u.cs.chm * 0.01) * this.incomeMult()), hurt = Math.max(0.2, 1 + u.fx.dmg);
    if (r < p * 0.8) { result = 'success'; reward = Math.round(m.reward * mult); u.mor = Math.max(0, Math.min(100, u.mor + 5 + u.fx.mor)); this.rep += (m.risk > 0.4 ? 2 : 1) + u.fx.rep; }
    else if (r < p) { result = 'partial'; reward = Math.round(m.reward * 0.5 * mult); loss = Math.round(this.rand() * 10 * hurt); u.mor = Math.min(100, u.mor + 1); }
    else { loss = Math.round((8 + this.rand() * 22 + m.risk * 20) * hurt); u.mor = Math.max(0, u.mor - 9); this.rep -= 1; }
    u.hp = Math.max(5, u.hp - loss); this.funds += reward; u.kit = false;
    this.dayLog.missions.push({ who: u.name, id: u.id, dept: u.dept, name: m.name, result, reward, loss, clock: Math.floor(this.clock) });
    const label = { success: '성공', partial: '부분 성공', fail: '실패' }[result];
    this.note(`${u.name} 임무 ${label}: ${m.name}${reward ? ` (+${reward.toLocaleString('ko-KR')} CR)` : ''}${loss ? ` · 부상 -${loss}` : ''}`, result === 'fail' ? 'bad' : 'good');
    // 정문으로 복귀
    u.phase = 'back'; u.away = false; u.place(GATE.x, GATE.y);
    const sp = this.spot(u.home); u.path = findPath(u.tx, u.ty, sp[0], sp[1]) || [];
  }

  /* ── 단체 임무 ── */
  groupCheck(ids, mid) {
    const m = GMISSION[mid]; if (!m) return { ok: false, reason: '없는 단체 임무' };
    if (this.ended) return { ok: false, reason: '하루가 종료되었습니다. 보고서를 제출하세요.' };
    if (!Array.isArray(ids) || new Set(ids).size !== ids.length) return { ok: false, reason: '인원 선택이 올바르지 않습니다.' };
    if (ids.length < m.min) return { ok: false, reason: `최소 ${m.min}명이 필요합니다.` };
    if (ids.length > m.max) return { ok: false, reason: `최대 ${m.max}명까지 보낼 수 있습니다.` };
    for (const id of ids) {
      const u = this.byId[id]; if (!u) return { ok: false, reason: '없는 인원입니다.' };
      if (u.mode === 'mission') return { ok: false, reason: `${u.name} — 이미 임무 수행 중입니다.` };
      if (this.isInjured(u)) return { ok: false, reason: `${u.name} — 부상이 심해 나설 수 없습니다. (HP 25 미만)` };
    }
    return { ok: true };
  }
  /** 단체 임무 성공률: 참가자 개인 성공률의 평균(부서 불일치 감점 없음) + 인원 시너지(최소 인원 초과 1명당 +2%, 최대 +6%) + 합동 보너스(2개 부서 이상 +2%) */
  groupChance(ids, mid) {
    const m = GMISSION[mid], us = ids.map((i) => this.byId[i]), night = this.clock >= DAY_PHASE_MIN;
    const avg = us.reduce((a, u) => a + successChance(u, { ...m, dept: u.dept }, night, this.succBonus(u)), 0) / us.length;
    const p = avg + 0.02 * Math.max(0, Math.min(3, us.length - m.min)) + (new Set(us.map((u) => u.dept)).size >= 2 ? 0.02 : 0);
    return Math.max(0.05, Math.min(0.97, p));
  }
  groupReward(ids, mid) { const m = GMISSION[mid]; return Math.round(m.reward * (1 + 0.08 * Math.max(0, ids.length - m.min))); }
  sendGroupMission(ids, mid) {
    const c = this.groupCheck(ids, mid); if (!c.ok) return c;
    const m = GMISSION[mid], paths = [];
    for (const id of ids) { const u = this.byId[id], p = findPath(u.tx, u.ty, GATE.x, GATE.y); if (!p) return { ok: false, reason: `${u.name} — 정문까지의 길을 찾을 수 없습니다.` }; paths.push(p); }
    const gid = `g${++this.gseq}`;
    ids.forEach((id, i) => { const u = this.byId[id]; if (u.mode === 'patrol') u.patrol = null; if (u.mode === 'work') u.work = null; u.mode = 'mission'; u.phase = 'out'; u.path = paths[i]; u.mission = { id: m.id, remaining: m.dur, total: m.dur, gid }; });
    this.groups[gid] = { gid, mid, ids: ids.slice(), remaining: m.dur, total: m.dur }; this.dayLog.orders++;
    this.note(`단체 임무 출발: ${m.name} (${ids.length}명 — ${ids.map((i) => this.byId[i].name).join(', ')})`, 'order');
    return { ok: true, gid };
  }
  tickGroups(dm) {
    for (const g of Object.values(this.groups)) {
      const us = g.ids.map((i) => this.byId[i]);
      if (!us.every((u) => u.mode === 'mission' && u.phase === 'away')) continue;     // 전원이 임무 지역에 도착해야 시간이 흐른다
      g.remaining -= dm; for (const u of us) u.mission.remaining = g.remaining;
      if (g.remaining <= 0) this.finishGroup(g.gid);
    }
  }
  finishGroup(gid) {
    const g = this.groups[gid]; if (!g) return; delete this.groups[gid];
    const m = GMISSION[g.mid], us = g.ids.map((i) => this.byId[i]), n = us.length, p = this.groupChance(g.ids, g.mid), r = this.rand();
    const mult = Math.max(0.1, us.reduce((a, u) => a + 1 + u.fx.reward + u.cs.chm * 0.01, 0) / n * this.incomeMult());
    let result = 'fail', reward = 0, worst = 0;
    const hit = (base) => { for (const u of us) { const loss = Math.round(base(u) * Math.max(0.2, 1 + u.fx.dmg)); worst = Math.max(worst, loss); u.hp = Math.max(5, u.hp - loss); } };
    if (r < p * 0.8) { result = 'success'; reward = Math.round(this.groupReward(g.ids, g.mid) * mult); for (const u of us) u.mor = Math.max(0, Math.min(100, u.mor + 5 + u.fx.mor)); this.rep += (m.risk > 0.4 ? 3 : 2); }
    else if (r < p) { result = 'partial'; reward = Math.round(this.groupReward(g.ids, g.mid) * 0.5 * mult); hit(() => this.rand() * 10); for (const u of us) u.mor = Math.min(100, u.mor + 1); }
    else { hit(() => 8 + this.rand() * 22 + m.risk * 20); for (const u of us) u.mor = Math.max(0, u.mor - 9); this.rep -= 2; }
    this.funds += reward;
    const lead = us[0];
    this.dayLog.missions.push({ who: `${lead.name} 외 ${n - 1}명 (단체)`, id: m.id, dept: lead.dept, name: m.name, result, reward, loss: worst, clock: Math.floor(this.clock), group: true, members: us.map((u) => u.name) });
    const label = { success: '성공', partial: '부분 성공', fail: '실패' }[result];
    this.note(`단체 임무 ${label}: ${m.name}${reward ? ` (+${reward.toLocaleString('ko-KR')} CR)` : ''}${worst ? ` · 최대 부상 -${worst}` : ''}`, result === 'fail' ? 'bad' : 'good');
    for (const u of us) { u.kit = false; u.phase = 'back'; u.away = false; u.place(GATE.x, GATE.y); const sp = this.spot(u.home); u.path = findPath(u.tx, u.ty, sp[0], sp[1]) || []; }
  }

  patrolEvent(u) {
    const incident = this.rand() < 0.18;
    const ev = incident ? PATROL_EVENTS.incident[Math.floor(this.rand() * PATROL_EVENTS.incident.length)] : [PATROL_EVENTS.clear[Math.floor(this.rand() * PATROL_EVENTS.clear.length)], 'clear'];
    u.patrol.incidents.push({ text: ev[0], kind: ev[1] });
    let kind = ev[1], text = ev[0];
    if (kind === 'bad' && u.fx.patrolSafe) { kind = 'good'; text += ' — 원격 감지로 피해 없음'; }
    if (kind === 'bad') u.hp = Math.max(5, u.hp - 5);
    u.patrol.incidents[u.patrol.incidents.length - 1] = { text, kind };
    if (incident) { this.note(`${u.name} 순찰 보고: ${text}`, kind === 'bad' ? 'bad' : 'good'); if (kind === 'good') this.rep += 1; }
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
      if (u.mode === 'work' && u.work) { u.work = null; u.mode = 'idle'; }
    }
    const L = this.dayLog;
    const income = L.missions.reduce((a, m) => a + m.reward, 0);
    const upkeep = Math.max(0, this.units.reduce((a, u) => a + Math.max(0, UPKEEP_PER_UNIT + u.fx.upkeep), 0) + this.furnitureUpkeep());
    const depts = DEPTS.map((d) => {
      const members = this.units.filter((u) => u.dept === d.key);
      const ms = L.missions.filter((m) => m.dept === d.key);
      return { key: d.key, ko: d.ko, en: d.en, no: d.no, members: members.length, missions: ms.length, success: ms.filter((m) => m.result === 'success').length, partial: ms.filter((m) => m.result === 'partial').length, fail: ms.filter((m) => m.result === 'fail').length, patrols: L.patrols.filter((p) => p.dept === d.key).length, income: ms.reduce((a, m) => a + m.reward, 0), avgHp: Math.round(members.reduce((a, u) => a + u.hp, 0) / members.length) };
    });
    const injured = this.units.filter((u) => u.hp < 50).map((u) => ({ name: u.name, hp: Math.round(u.hp) }));
    const m = L.missions;
    const summary = `임무 ${m.length}건(성공 ${m.filter((x) => x.result === 'success').length}, 부분 ${m.filter((x) => x.result === 'partial').length}, 실패 ${m.filter((x) => x.result === 'fail').length}), 순찰 ${L.patrols.length}회, 명령 ${L.orders}건. 수입 ${fmtCredits(income)}, 운영비 ${fmtCredits(-upkeep)}.`;
    return { day: this.day, createdAt: Date.now(), clockEnd: Math.floor(this.clock), ended: this.ended, fundsStart: this.dayStartFunds, income, upkeep, fundsEnd: this.funds - upkeep, rep: this.rep, weather: WEATHERS[this.weather.today].ko, snow: Math.round(this.snow), missions: m.slice(), patrols: L.patrols.slice(), overheard: L.overheard.slice(), events: (L.events || []).slice(), depts, injured, summary };
  }

  /** 보고서 제출 후 다음 날로 */
  nextDay(report) {
    this.funds = report.fundsEnd;
    if (this.ev.pending) { this.note(`결정하지 못한 사건 「${EVENT[this.ev.pending.id].title}」은(는) 그대로 흘러갔다.`, 'info', false); this.ev.pending = null; }
    this.ev.buffs = []; this.ev.today = 0; this.ev.acc = 0;
    const medics = this.units.filter((u) => u.dept === 'medical').length;
    for (const u of this.units) {
      u.hp = Math.min(100, u.hp + 22 + (u.hp < 50 ? 10 * medics : 0));
      u.mor = Math.min(100, Math.round(u.mor + (60 - u.mor) * 0.3) + Math.round(u.fx.rest));
      u.mode = 'idle'; u.phase = null; u.mission = null; u.patrol = null; u.work = null; u.away = false; u.heard.clear();
      const s = this.spot(u.home); u.place(s[0], s[1]);
    }
    this.groups = {};
    this.weather = { today: this.weather.next, next: rollWeather(this.rand) }; this.snow = dailySnow(this.snow, this.weather.today);
    this.research.points += 1; report.researchPoints = this.research.points;
    this.day += 1; this.clock = 0; this.ended = false; this.speed = 0; this.dayStartFunds = this.funds; this.dayLog = this.freshLog();
    this.refresh();   // 하루짜리 버프 해제 반영
    this.note(`DAY ${this.day} 개시 — 자금 ${fmtCredits(this.funds)}`, 'info', false);
  }

  /* ── 저장/복원 ── */
  serialize() {
    const units = {};
    for (const u of this.units) units[u.id] = { c: { nm: u.name, ln: u.latin, hs: u.look.hairStyle, hc: u.look.hair, h2: u.look.hair2 || null, w: u.weapon, pool: u.pool, alloc: u.alloc, used: u.used, traits: u.traits, eq: u.eq, ab: u.ab }, hp: Math.round(u.hp), mor: Math.round(u.mor), home: u.home, mode: u.mode === 'goto' ? 'idle' : u.mode, phase: u.phase, mission: u.mission, patrol: u.patrol ? { ...u.patrol, wi: 0 } : null, work: u.work, g: { gear: u.gear, bonus: u.bonus, kit: u.kit, warm: u.warm, aff: u.aff, talked: u.talked, asked: u.asked } };
    return { v: 1, day: this.day, clock: Math.floor(this.clock), funds: this.funds, rep: this.rep, ended: this.ended, dayStartFunds: this.dayStartFunds, dayLog: this.dayLog, log: this.log.slice(-40), research: this.research, weather: this.weather, snow: Math.round(this.snow), inv: this.inv, placed: this.placed, units, groups: Object.values(this.groups).map((g) => ({ gid: g.gid, mid: g.mid, ids: g.ids, remaining: Math.round(g.remaining) })), gseq: this.gseq, ev: { pending: this.ev.pending, cd: this.ev.cd, today: this.ev.today, acc: Math.round(this.ev.acc), buffs: this.ev.buffs } };
  }
  restore(s) {
    if (!s || s.v !== 1) return;
    this.day = s.day; this.clock = s.clock; this.funds = s.funds; this.rep = s.rep || 0; this.ended = !!s.ended; this.dayStartFunds = s.dayStartFunds ?? s.funds;
    this.dayLog = s.dayLog || this.freshLog(); this.log = s.log || [];
    this.research = { ...freshResearch(), ...(s.research || {}) };
    this.research.abilities = (this.research.abilities || []).filter((a) => ABILITY[a]);
    if (s.weather && WEATHERS[s.weather.today] && WEATHERS[s.weather.next]) this.weather = { today: s.weather.today, next: s.weather.next };
    if (Number.isFinite(s.snow)) this.snow = Math.max(0, Math.min(100, s.snow));
    this.inv = {}; for (const [id, n] of Object.entries(s.inv || {})) if (ITEM[id] && Number.isInteger(n) && n > 0) this.inv[id] = n;
    for (const room of ROOM_KEYS) for (let i = 0; i < FURN_SLOTS; i++) { const id = s.placed?.[room]?.[i]; this.placed[room][i] = id && ITEM[id]?.cat === 'furniture' ? id : null; }
    this.syncSlots();
    const ev = s.ev || {}, FXK = ['str', 'def', 'skl', 'cha', 'chm', 'wis', 'succ', 'night', 'day', 'reward', 'dmg', 'heal', 'speed', 'rep', 'mor', 'rest'];
    this.ev.cd = {}; for (const [id, d] of Object.entries(ev.cd || {})) if (EVENT[id] && Number.isInteger(d)) this.ev.cd[id] = d;
    this.ev.today = Math.max(0, Math.min(EV_MAX_PER_DAY, Math.floor(ev.today || 0))); this.ev.acc = Math.max(0, Math.min(59, Number(ev.acc) || 0));
    this.ev.pending = ev.pending && EVENT[ev.pending.id] && this.byId[ev.pending.who] ? { id: ev.pending.id, who: ev.pending.who } : null;
    this.ev.buffs = (Array.isArray(ev.buffs) ? ev.buffs : []).filter((b) => b && b.fx && typeof b.fx === 'object').slice(0, 12).map((b) => ({ fx: Object.fromEntries(Object.entries(b.fx).filter(([k, v]) => FXK.includes(k) && Number.isFinite(v) && Math.abs(v) <= 5)), label: String(b.label || '').slice(0, 30), dept: DEPT[b.dept] ? b.dept : null }));
    if (this.ev.pending) this.speed = 0;
    for (const [id, st] of Object.entries(s.units || {})) {
      const u = this.byId[id]; if (!u) continue;
      u.hp = st.hp; u.mor = st.mor; u.home = ROOM_LABEL[st.home] ? st.home : u.home;
      if (st.c) {
        const c = st.c; if (typeof c.nm === 'string' && typeof c.ln === 'string' && !this.nameProblem(u.id, c.nm.trim(), c.ln.trim())) { u.name = c.nm.trim(); u.latin = c.ln.trim(); }
        if (HAIR[c.hs]) u.look.hairStyle = c.hs; if (/^#[0-9a-f]{6}$/i.test(c.hc || '')) u.look.hair = c.hc; if ('h2' in c) u.look.hair2 = /^#[0-9a-f]{6}$/i.test(c.h2 || '') ? c.h2.toLowerCase() : null; if (WEAPON[c.w]) u.weapon = c.w;
        if (Number.isInteger(c.pool) && c.pool >= 40 && c.pool <= 50) u.pool = c.pool;
        u.traits = (c.traits || []).filter((t, i, a) => TRAIT[t] && a.indexOf(t) === i); u.used = Math.max(c.used || 0, u.traits.length);
        u.eq = (c.eq || []).filter((t) => u.traits.includes(t)).slice(0, MAX_TRAITS); u.ab = (c.ab || []).filter((a) => this.research.abilities.includes(a)).slice(0, MAX_ABILITIES);
        const al = emptyAlloc(); let left = u.pool; for (const { k } of CSTATS) { const v = Math.max(0, Math.min(STAT_MAX, Math.floor(c.alloc?.[k] || 0), left)); al[k] = v; left -= v; } u.alloc = al;
      }
      if (st.g) {
        const g = st.g; for (const slot of ['armor', 'acc']) { const gid = g.gear?.[slot]; u.gear[slot] = gid && ITEM[gid]?.cat === 'equip' && ITEM[gid].slot === slot ? gid : null; }
        for (const { k } of CSTATS) u.bonus[k] = Math.max(0, Math.min(STAT_ITEM_CAP, Math.floor(g.bonus?.[k] || 0)));
        u.kit = !!g.kit; u.warm = Number.isInteger(g.warm) ? g.warm : 0; u.aff = Math.max(0, Math.min(AFF_MAX, Math.floor(g.aff || 0))); u.talked = g.talked || 0; u.asked = g.asked || 0;
      }
      if (st.mode === 'work' && st.work && TASKS[st.work.kind] && Number.isFinite(st.work.remaining)) { u.mode = 'work'; u.work = { kind: st.work.kind, remaining: st.work.remaining, total: TASKS[st.work.kind].dur, started: true }; const tiles = st.work.kind === 'furnace' ? [FURNACE.spot] : yardWorkTiles(); const sp = tiles[Math.floor(this.rand() * tiles.length)]; u.place(sp[0], sp[1]); }
      else if (st.mode === 'mission' && st.mission && (MISSION[st.mission.id] || GMISSION[st.mission.id]) && st.phase !== 'back') { u.mode = 'mission'; u.phase = 'away'; u.mission = st.mission; u.away = true; }
      else if (st.mode === 'patrol' && st.patrol) { u.mode = 'patrol'; u.patrol = st.patrol; const wp = PATROLS[u.patrol.id][0]; u.place(wp[0], wp[1]); u.patrol.wi = 0; const p = findPath(u.tx, u.ty, PATROLS[u.patrol.id][1][0], PATROLS[u.patrol.id][1][1]); u.path = p || []; u.patrol.wi = 1; }
      else { u.mode = 'idle'; const sp = this.spot(u.home); u.place(sp[0], sp[1]); }
    }
    // 단체 임무 복원: 구성원 전원이 같은 임무 중일 때만 유지, 아니면 해제
    this.gseq = Math.max(0, Math.floor(s.gseq || 0)); this.groups = {};
    for (const g of Array.isArray(s.groups) ? s.groups : []) {
      const ok = g && typeof g.gid === 'string' && GMISSION[g.mid] && Array.isArray(g.ids) && g.ids.length >= GMISSION[g.mid].min && g.ids.length <= GMISSION[g.mid].max && Number.isFinite(g.remaining) &&
        g.ids.every((i) => this.byId[i]?.mode === 'mission' && this.byId[i].mission?.gid === g.gid) && !this.groups[g.gid];
      if (ok) this.groups[g.gid] = { gid: g.gid, mid: g.mid, ids: g.ids.slice(), remaining: Math.min(g.remaining, GMISSION[g.mid].dur), total: GMISSION[g.mid].dur };
    }
    for (const u of this.units) if (u.mode === 'mission' && u.mission?.gid && !this.groups[u.mission.gid]) { u.mode = 'idle'; u.phase = null; u.mission = null; u.away = false; const sp = this.spot(u.home); u.place(sp[0], sp[1]); }
    this.refresh();
  }
}
Sim.EVENTS_ON = true;   // 테스트에서 false 로 끄면 무작위 사건이 발생하지 않는다
export { DEPTS, DEPT, ROOMS };
