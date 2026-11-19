// 시뮬레이션 코어. 렌더/DOM 과 완전히 분리되어 Node 에서도 테스트된다.
import { ROSTER, DEPT, DEPTS, MISSION, PATROL_META, PATROL_EVENTS, MONO, ROOM_LABEL } from './data.js';
import { TS, GATE, PATROLS, roomFreeTiles, findPath, ROOMS, setSlotSolid, SLOTS, isOutdoor, FURNACE, yardWorkTiles } from './map.js';
import { WEATHERS, rollWeather, dailySnow, START_SNOW, SNOW_SLOW, TASKS } from './weather.js';
import { ITEM, STAT_ITEM_CAP, FURN_SLOTS, ROOM_KEYS } from './shop.js';
import { LEADER_IDS, LEADER_SET, LEADER_TALK, AFF_MAX, REQUEST_COST } from './leaders.js';
import { WEAPON } from './weapons.js';
import { TRAIT, ABILITY, GACHA_ODDS, TRAITS, MAX_TRAITS, MAX_ABILITIES } from './traits.js';
import { HAIR } from './hair.js';
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
  freshLog() { return { missions: [], patrols: [], overheard: [], orders: 0 }; }

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
      u.fx = sumFx(u, [ITEM[u.gear.armor]?.fx, ITEM[u.gear.acc]?.fx, (rooms[u.home] ||= this.roomFx(u.home))]); u.aura = 0;
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
      const m = MISSION[u.mission.id];
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
  setSpeed(s) { if (s === 3 && !this.research.speed3) s = 2; if (this.ended) s = 0; this.speed = s; }

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
    return { day: this.day, createdAt: Date.now(), clockEnd: Math.floor(this.clock), ended: this.ended, fundsStart: this.dayStartFunds, income, upkeep, fundsEnd: this.funds - upkeep, rep: this.rep, weather: WEATHERS[this.weather.today].ko, snow: Math.round(this.snow), missions: m.slice(), patrols: L.patrols.slice(), overheard: L.overheard.slice(), depts, injured, summary };
  }

  /** 보고서 제출 후 다음 날로 */
  nextDay(report) {
    this.funds = report.fundsEnd;
    const medics = this.units.filter((u) => u.dept === 'medical').length;
    for (const u of this.units) {
      u.hp = Math.min(100, u.hp + 22 + (u.hp < 50 ? 10 * medics : 0));
      u.mor = Math.min(100, Math.round(u.mor + (60 - u.mor) * 0.3) + Math.round(u.fx.rest));
      u.mode = 'idle'; u.phase = null; u.mission = null; u.patrol = null; u.work = null; u.away = false; u.heard.clear();
      const s = this.spot(u.home); u.place(s[0], s[1]);
    }
    this.weather = { today: this.weather.next, next: rollWeather(this.rand) }; this.snow = dailySnow(this.snow, this.weather.today);
    this.research.points += 1; report.researchPoints = this.research.points;
    this.day += 1; this.clock = 0; this.ended = false; this.speed = 0; this.dayStartFunds = this.funds; this.dayLog = this.freshLog();
    this.note(`DAY ${this.day} 개시 — 자금 ${fmtCredits(this.funds)}`, 'info', false);
  }

  /* ── 저장/복원 ── */
  serialize() {
    const units = {};
    for (const u of this.units) units[u.id] = { c: { nm: u.name, ln: u.latin, hs: u.look.hairStyle, hc: u.look.hair, w: u.weapon, pool: u.pool, alloc: u.alloc, used: u.used, traits: u.traits, eq: u.eq, ab: u.ab }, hp: Math.round(u.hp), mor: Math.round(u.mor), home: u.home, mode: u.mode === 'goto' ? 'idle' : u.mode, phase: u.phase, mission: u.mission, patrol: u.patrol ? { ...u.patrol, wi: 0 } : null, work: u.work, g: { gear: u.gear, bonus: u.bonus, kit: u.kit, warm: u.warm, aff: u.aff, talked: u.talked, asked: u.asked } };
    return { v: 1, day: this.day, clock: Math.floor(this.clock), funds: this.funds, rep: this.rep, ended: this.ended, dayStartFunds: this.dayStartFunds, dayLog: this.dayLog, log: this.log.slice(-40), research: this.research, weather: this.weather, snow: Math.round(this.snow), inv: this.inv, placed: this.placed, units };
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
    for (const [id, st] of Object.entries(s.units || {})) {
      const u = this.byId[id]; if (!u) continue;
      u.hp = st.hp; u.mor = st.mor; u.home = ROOM_LABEL[st.home] ? st.home : u.home;
      if (st.c) {
        const c = st.c; if (typeof c.nm === 'string' && typeof c.ln === 'string' && !this.nameProblem(u.id, c.nm.trim(), c.ln.trim())) { u.name = c.nm.trim(); u.latin = c.ln.trim(); }
        if (HAIR[c.hs]) u.look.hairStyle = c.hs; if (/^#[0-9a-f]{6}$/i.test(c.hc || '')) u.look.hair = c.hc; if (WEAPON[c.w]) u.weapon = c.w;
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
      else if (st.mode === 'mission' && st.mission && st.phase !== 'back') { u.mode = 'mission'; u.phase = 'away'; u.mission = st.mission; u.away = true; }
      else if (st.mode === 'patrol' && st.patrol) { u.mode = 'patrol'; u.patrol = st.patrol; const wp = PATROLS[u.patrol.id][0]; u.place(wp[0], wp[1]); u.patrol.wi = 0; const p = findPath(u.tx, u.ty, PATROLS[u.patrol.id][1][0], PATROLS[u.patrol.id][1][1]); u.path = p || []; u.patrol.wi = 1; }
      else { u.mode = 'idle'; const sp = this.spot(u.home); u.place(sp[0], sp[1]); }
    }
    this.refresh();
  }
}
export { DEPTS, DEPT, ROOMS };
