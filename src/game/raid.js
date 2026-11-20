// 긴급 습격: 무법자 무리가 기지를 덮치고, 그 시각 기지에 있는 병력이 맞서 싸운다. (순수 로직 — DOM 없음, 난수는 seed 로 결정)
// 부서 특수 능력: 치료팀=치유 · 방어팀=밀치기 · 공격팀=강타 · 공중 지원팀=지원 사격 · 운송팀=방벽 · 의뢰 수행팀=교란 · 중요업무처리팀=작전 지휘(공격력 오라) · 습격팀=기습(첫 공격 2배)
export const ARENA = { w: 24, h: 9 };
export const RAID_CHANCE = { day: 0.01, night: 0.05 };          // 게임 시간 1시간마다 (아침 1% / 밤 5%)
export const FORMATIONS = {
  balanced: { ko: '균형', desc: '공격과 방어를 고르게 한다.', atk: 1, def: 1 },
  assault: { ko: '공세', desc: '공격력 +15%, 받는 피해 +11%.', atk: 1.15, def: 0.9 },
  guard: { ko: '수비', desc: '공격력 -10%, 받는 피해 -13%.', atk: 0.9, def: 1.15 },
};
export const ENEMY_TYPES = {
  grunt: { ko: '약탈자', hp: 125, dmg: 9, cd: 1.3, spd: 2.2, range: 1.4, def: 10 },
  brute: { ko: '도끼병', hp: 270, dmg: 16, cd: 2.0, spd: 1.5, range: 1.5, def: 40 },
  archer: { ko: '궁수', hp: 80, dmg: 10, cd: 1.8, spd: 2.0, range: 6, def: 0 },
  boss: { ko: '습격대장', hp: 700, dmg: 22, cd: 1.6, spd: 1.6, range: 1.7, def: 60 },
};
export const ABILITY_INFO = {
  medical: { name: '치유', cd: 4 }, defencer: { name: '밀치기', cd: 5 }, rager: { name: '강타', cd: 5 }, aerial: { name: '지원 사격', cd: 8 },
  carrier: { name: '방벽', cd: 6 }, requester: { name: '교란', cd: 6 }, operation: { name: '작전 지휘', cd: 0 }, raider: { name: '기습', cd: 0 },
};
const TIMESCALE = 0.55;      // 전투를 보기 좋은 속도로 늦춘다(전투 로직의 시간 단위는 그대로)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** 습격 규모: 날이 갈수록 커진다. rand 는 0~1 난수 함수. */
export function planRaid(day, rand) {
  const size = clamp(Math.round(5 + day * 0.9 + rand() * 3), 5, 30), types = [];
  if (size >= 10) types.push('boss');
  while (types.length < size) { const r = rand(); types.push(r < 0.55 ? 'grunt' : r < 0.78 ? 'brute' : 'archer'); }
  return { size, types };
}

/** 지휘실의 인원(Unit) → 전투 참가자 */
export function defenderFrom(u) {
  const lead = u.isLeader ? 1.2 : 1, dv = u.dv || { cmb: 50, def: 50, med: 40 }, fx = u.fx || {};
  const maxhp = (40 + dv.def / 1.5) * lead;
  return { id: u.id, name: u.name, dept: u.dept, leader: !!u.isLeader, atk: (6 + dv.cmb / 8 + (fx.str || 0) * 0.8 + (fx.skl || 0) * 0.4) * lead, def: dv.def, med: dv.med, cmb: dv.cmb,
    maxhp, hp: maxhp * clamp(u.hp, 0, 100) / 100, range: u.dept === 'aerial' ? 6 : 1.6, spd: clamp(2.4 * (1 + (fx.speed || 0)), 1.2, 3.6) };
}

export class RaidBattle {
  /** defenders: defenderFrom() 결과 배열, plan: planRaid() 결과, formation: FORMATIONS 키 */
  constructor({ defenders, plan, formation = 'balanced', day = 1, seed = 1 }) {
    this.rng = mulberry(seed); this.form = FORMATIONS[formation] || FORMATIONS.balanced; this.t = 0; this.real = 0; this.done = false; this.win = false; this.fx = []; this.timeout = 150 * TIMESCALE * 2;
    const R = () => this.rng(), lv = 1 + day * 0.04;
    this.units = [];
    defenders.forEach((d, i) => this.units.push({ ...d, side: 'd', x: 2 + R() * 4, y: 1 + ((i * 1.7 + R()) % (ARENA.h - 2)), cd: R(), stun: 0, shield: 0, shieldT: 0, confuse: 0, first: d.dept === 'raider', abCd: 1 + R() * 3, dir: 'right', hit: 0 }));
    plan.types.forEach((ty, i) => { const T = ENEMY_TYPES[ty], hp = T.hp * lv; this.units.push({ id: `e${i}`, name: T.ko, type: ty, side: 'e', atk: T.dmg * (1 + day * 0.02), def: T.def, maxhp: hp, hp, range: T.range, spd: T.spd, atkCd: T.cd, x: ARENA.w - 3 + R() * 2, y: 1 + R() * (ARENA.h - 2), cd: R() * T.cd, stun: 0, shield: 0, shieldT: 0, confuse: 0, dir: 'left', hit: 0 }); });
    for (const u of this.units) if (u.side === 'd') u.atkCd = 1.1;
    this.start = { d: this.units.filter((u) => u.side === 'd').length, e: plan.types.length };
  }
  alive(side) { return this.units.filter((u) => u.side === side && u.hp > 0); }
  get defenders() { return this.units.filter((u) => u.side === 'd'); }
  get enemies() { return this.units.filter((u) => u.side === 'e'); }
  say(x, y, text, kind) { if (this.fx.length < 80) this.fx.push({ x, y, text, kind }); }
  drainFx() { const f = this.fx; this.fx = []; return f; }

  step(dt) { let left = dt; while (left > 1e-9 && !this.done) { const d = Math.min(0.1, left); this.tick(d); left -= d; } }
  /** 끝날 때까지 한꺼번에 진행(건너뛰기) */
  finish() { let g = 0; while (!this.done && g++ < 5000) this.tick(0.1); return this.result(); }

  tick(dt) {
    this.real += dt; dt *= TIMESCALE; this.t += dt; const opAlive = this.alive('d').some((u) => u.dept === 'operation'), reqAlive = this.alive('d').some((u) => u.dept === 'requester');
    this.opMul = opAlive ? 1.1 : 1; this.reqMul = reqAlive ? 0.9 : 1;
    for (const u of this.units) {
      if (u.hp <= 0) continue;
      u.cd -= dt; u.hit = Math.max(0, u.hit - dt); u.stun = Math.max(0, u.stun - dt); u.confuse = Math.max(0, u.confuse - dt); if (u.shieldT > 0) { u.shieldT -= dt; if (u.shieldT <= 0) u.shield = 0; }
      if (u.stun > 0) continue;
      if (u.side === 'd' && ABILITY_INFO[u.dept]?.cd) { u.abCd -= dt; if (u.abCd <= 0 && this.useAbility(u)) u.abCd = ABILITY_INFO[u.dept].cd * (u.leader ? 0.8 : 1); else if (u.abCd <= 0) u.abCd = 0.5; }
      const tgt = this.nearest(u, u.side === 'd' ? 'e' : 'd'); if (!tgt) continue;
      const dx = tgt.x - u.x, dy = tgt.y - u.y, dist = Math.hypot(dx, dy); u.dir = dx >= 0 ? 'right' : 'left';
      if (dist <= u.range) { if (u.cd <= 0) { this.attack(u, tgt); u.cd = u.atkCd * (0.9 + this.rng() * 0.2); } }
      else { const s = u.spd * dt; u.x = clamp(u.x + (dx / dist) * s, 0.3, ARENA.w - 0.3); u.y = clamp(u.y + (dy / dist) * s, 0.5, ARENA.h - 0.5); }
      this.separate(u);
    }
    const d = this.alive('d').length, e = this.alive('e').length;
    if (e === 0) { this.done = true; this.win = true; } else if (d === 0 || this.t >= this.timeout) { this.done = true; this.win = false; }
  }
  nearest(u, side) { let best = null, bd = 1e9; for (const o of this.units) { if (o.side !== side || o.hp <= 0) continue; const dd = (o.x - u.x) ** 2 + (o.y - u.y) ** 2; if (dd < bd) { bd = dd; best = o; } } return best; }
  separate(u) { for (const o of this.units) { if (o === u || o.hp <= 0 || o.side !== u.side) continue; const dx = u.x - o.x, dy = u.y - o.y, d = Math.hypot(dx, dy); if (d < 0.55 && d > 1e-6) { u.x = clamp(u.x + (dx / d) * 0.04, 0.3, ARENA.w - 0.3); u.y = clamp(u.y + (dy / d) * 0.04, 0.5, ARENA.h - 0.5); } } }

  attack(a, t, mult = 1) {
    if (a.first) { mult *= 2; a.first = false; this.say(a.x, a.y, '기습!', 'skill'); }
    this.damage(a, t, a.atk * mult);
  }
  /** 방어력·진형·오라를 반영해 피해를 준다 */
  damage(a, t, raw) {
    let dmg = raw * (0.85 + this.rng() * 0.3);
    if (a.side === 'd') dmg *= this.form.atk * this.opMul; else { dmg *= this.reqMul * (a.confuse > 0 ? 0.5 : 1); }
    dmg *= 100 / (100 + t.def * 0.5); if (t.side === 'd') dmg /= this.form.def;
    this.hurt(t, dmg, a);
  }
  hurt(t, dmg, a) {
    if (t.shield > 0) { const ab = Math.min(t.shield, dmg); t.shield -= ab; dmg -= ab; }
    if (dmg <= 0) return; t.hp -= dmg; t.hit = 0.25; this.say(t.x, t.y, String(Math.max(1, Math.round(dmg))), t.side === 'd' ? 'hurt' : 'dmg');
    if (t.hp <= 0) { t.hp = 0; this.say(t.x, t.y, t.side === 'd' ? '쓰러짐' : '격파', 'down'); }
  }

  useAbility(u) {
    const foes = this.alive('e'), allies = this.alive('d'), mk = u.leader ? 1.2 : 1;
    switch (u.dept) {
      case 'medical': { let w = null, wr = 0.85; for (const a of allies) { const r = a.hp / a.maxhp; if (r < wr && Math.hypot(a.x - u.x, a.y - u.y) <= 8) { wr = r; w = a; } } if (!w) return false; const h = (8 + u.med / 12) * mk; w.hp = Math.min(w.maxhp, w.hp + h); this.say(w.x, w.y, `+${Math.round(h)}`, 'heal'); return true; }
      case 'defencer': { const t = this.nearest(u, 'e'); if (!t || Math.hypot(t.x - u.x, t.y - u.y) > 2.2) return false; const dx = t.x - u.x, dy = t.y - u.y, d = Math.hypot(dx, dy) || 1; t.x = clamp(t.x + (dx / d) * 3, 0.3, ARENA.w - 0.3); t.y = clamp(t.y + (dy / d) * 3, 0.5, ARENA.h - 0.5); t.stun = 1.2; this.say(t.x, t.y, '밀치기!', 'skill'); this.damage(u, t, u.atk * 0.5); return true; }
      case 'rager': { const t = this.nearest(u, 'e'); if (!t || Math.hypot(t.x - u.x, t.y - u.y) > u.range + 0.4) return false; this.say(t.x, t.y, '강타!', 'skill'); this.damage(u, t, u.atk * 2.4); for (const f of foes) if (f !== t && f.hp > 0 && Math.hypot(f.x - t.x, f.y - t.y) <= 1.6) this.damage(u, f, u.atk); return true; }
      case 'aerial': { let best = null, bn = 0; for (const f of foes) { const n = foes.filter((g) => Math.hypot(g.x - f.x, g.y - f.y) <= 2).length; if (n > bn) { bn = n; best = f; } } if (!best) return false; this.say(best.x, best.y, '지원 사격!', 'skill'); const dm = (12 + u.cmb / 10) * mk; for (const f of foes) if (Math.hypot(f.x - best.x, f.y - best.y) <= 2) this.hurt(f, dm * (100 / (100 + f.def * 0.25)), u); return true; }
      case 'carrier': { let w = null, wr = 1.1; for (const a of allies) { const r = a.hp / a.maxhp; if (r < wr && a.shield <= 0) { wr = r; w = a; } } if (!w || wr > 0.95) return false; w.shield = 14 * mk; w.shieldT = 5; this.say(w.x, w.y, '방벽', 'skill'); return true; }
      case 'requester': { let t = null; for (const f of foes) if (f.confuse <= 0 && Math.hypot(f.x - u.x, f.y - u.y) <= 7) { t = f; break; } if (!t) return false; t.confuse = 4; this.say(t.x, t.y, '교란', 'skill'); return true; }
      default: return false;
    }
  }

  /** 전투 결과: 인원별 남은 체력 비율(0~1)과 쓰러진 인원 */
  result() {
    const ds = this.defenders;
    return { win: this.win, t: Math.round(this.real * 10) / 10, size: this.start.e, defenders: this.start.d, enemiesLeft: this.alive('e').length, downed: ds.filter((u) => u.hp <= 0).map((u) => u.id),
      units: ds.map((u) => ({ id: u.id, ratio: clamp(u.hp / u.maxhp, 0, 1), down: u.hp <= 0 })) };
  }
}
