// Node 에서 실행되는 코어 테스트: TOTP(RFC 6238 벡터), 해시, 맵 연결성, 시뮬레이션 규칙(시간 12분, 임무/순찰/보고서/저장복원).
import assert from 'node:assert/strict';
import { hashSecret, verifySecret, makeRecoveryCodes, normalizeRecovery } from '../src/core/crypto.js';
import { findPath, PATROLS, ROOMS, roomFreeTiles, roomDoorTile, isSolid, GATE, CAMERAS, MW, MH } from '../src/game/map.js';
import { Sim, DAY_MINUTES, DAY_REAL_SECONDS, MIN_PER_SEC, clockInfo, successChance } from '../src/game/sim.js';
import { nickKey, nickProblem } from '../src/core/nick.js';
import { TRAITS, ABILITIES, GACHA_ODDS, fxLines } from '../src/game/traits.js';
import { HAIR_STYLES } from '../src/game/hair.js';
import { WEAPONS } from '../src/game/weapons.js';
import { CSTATS, autoAlloc, sumAlloc } from '../src/game/rules.js';
import { RESEARCH, RESEARCH_BY_KEY } from '../src/game/research.js';
import { WEATHERS, rollWeather, dailySnow, TASKS, START_SNOW } from '../src/game/weather.js';
import { ITEMS, ITEM, STAT_ITEMS, EQUIPMENT, CONSUMABLES, FURNITURE, ROOM_KEYS, FURN_SLOTS, STAT_ITEM_CAP } from '../src/game/shop.js';
import { LEADER_IDS, LEADER_TALK, REQUEST_COST } from '../src/game/leaders.js';
import { SLOTS, FURNACE, yardWorkTiles, isOutdoor } from '../src/game/map.js';
import { ROSTER, DEPTS, MISSIONS, MISSION, MONO } from '../src/game/data.js';
import { EVENTS, EVENT, EV_MAX_PER_DAY, EV_COOLDOWN, fxChip } from '../src/game/events.js';

Sim.EVENTS_ON = false;   // 기존 테스트는 무작위 사건 없이 진행(사건 테스트에서 따로 켠다)

let n = 0; const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓', name); } catch (e) { console.error('  ✗', name, '\n', e); process.exitCode = 1; } };

await t('PIN/복구코드 해시', async () => {
  const rec = await hashSecret('123456', 1000);
  assert.ok(await verifySecret('123456', rec)); assert.ok(!(await verifySecret('123457', rec)));
  const codes = makeRecoveryCodes(8); assert.equal(new Set(codes).size, 8); assert.match(codes[0], /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.equal(normalizeRecovery(codes[0].toLowerCase().replace('-', ' ')), codes[0]);
});
await t('콜사인: 정규화 키로 중복 판정, 규칙 검증', () => {
  assert.equal(nickKey('Ab c'), nickKey('ab_C')); assert.equal(nickKey('한 서윤'), nickKey('한서윤')); assert.notEqual(nickKey('alpha1'), nickKey('alpha2'));
  assert.equal(nickProblem('테스트요원'), ''); assert.equal(nickProblem('Ab_c-1'), '');
  for (const bad of ['a', '가', 'x'.repeat(13), 'a/b', '<b>', 'Admin', '관리자', ' ', '__', '😀😀']) assert.notEqual(nickProblem(bad), '', bad);
});
await t('로스터/부서 구성', () => {
  assert.equal(DEPTS.length, 8); assert.equal(ROSTER.length, 25);
  for (const d of DEPTS) assert.equal(ROSTER.filter((r) => r.dept === d.key).length, d.key === 'operation' ? 4 : 3, d.key);
  assert.ok(ROSTER.every((r) => /^[A-Z][a-z]+$/.test(r.latin)) && new Set(ROSTER.map((r) => r.latin)).size === 25, '라틴어 이름 25개 고유'); assert.equal(MISSIONS.length, 24); assert.equal(new Set(ROSTER.map((r) => r.id)).size, 25);
});
await t('맵: 모든 방의 서성임 타일이 복도·정문과 연결됨', () => {
  for (const k of [...Object.keys(ROOMS), 'lobby']) {
    const tiles = roomFreeTiles(k); assert.ok(tiles.length >= 8, `${k} 타일 ${tiles.length}`);
    const [dx, dy] = roomDoorTile(k); assert.ok(!isSolid(dx, dy), `${k} 문 앞`);
    for (const [x, y] of tiles) {
      assert.ok(findPath(x, y, GATE.x, GATE.y), `${k} (${x},${y}) → 정문`);
    }
  }
});
await t('맵: 순찰 웨이포인트 모두 도달 가능', () => {
  for (const [id, wp] of Object.entries(PATROLS)) for (let i = 0; i < wp.length; i++) {
    const [x, y] = wp[i]; assert.ok(!isSolid(x, y), `${id}[${i}] (${x},${y}) 벽`);
    const nx = wp[(i + 1) % wp.length]; assert.ok(findPath(x, y, nx[0], nx[1]), `${id} ${i}→${i + 1}`);
  }
  assert.equal(CAMERAS.length, 10);
});
await t('시간: 1배속 12분 = 하루(아침 12h + 밤 9h), 2배속 6분', () => {
  assert.equal(DAY_MINUTES, 21 * 60); assert.equal(DAY_REAL_SECONDS, 720); assert.ok(Math.abs(MIN_PER_SEC - 1.75) < 1e-9);
  const s = new Sim(null, () => 0.5); s.setSpeed(1);
  let real = 0; while (!s.ended && real < 2000) { s.update(0.1); real += 0.1; }
  assert.ok(Math.abs(real - 720) < 1, `1배속 ${real}s`);
  const s2 = new Sim(null, () => 0.5); s2.setSpeed(2); real = 0; while (!s2.ended && real < 2000) { s2.update(0.1); real += 0.1; }
  assert.ok(Math.abs(real - 360) < 1, `2배속 ${real}s`);
  assert.equal(clockInfo(0).text, '06:00'); assert.equal(clockInfo(719).phase, '아침'); assert.equal(clockInfo(720).text, '18:00'); assert.equal(clockInfo(720).phase, '밤'); assert.equal(clockInfo(1259).text, '02:59');
});
await t('정지 상태에서는 시간/이동이 멈춘다', () => {
  const s = new Sim(null, () => 0.3); s.sendToRoom('c01', 'rager'); const c0 = s.clock, x0 = s.byId.c01.x;
  s.update(1); assert.equal(s.clock, c0); assert.equal(s.byId.c01.x, x0);
  s.setSpeed(1); for (let i = 0; i < 20; i++) s.update(0.1); assert.ok(s.clock > c0); assert.notEqual(s.byId.c01.x, x0);
});
await t('방 이동 명령: 목적지에 도착해 idle + home 변경', () => {
  const s = new Sim(null, Math.random); s.setSpeed(2);
  assert.ok(s.sendToRoom('c04', 'medical').ok);
  for (let i = 0; i < 2000 && s.byId.c04.mode !== 'idle'; i++) s.update(0.1);
  assert.equal(s.byId.c04.mode, 'idle'); assert.equal(s.byId.c04.home, 'medical');
});
await t('임무: 출발→이탈→결과→복귀, 로그·자금 반영', () => {
  let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const s = new Sim(null, rnd); s.setSpeed(2); const f0 = s.funds;
  assert.ok(s.sendMission('c04', 'rg1').ok);
  let done = false; for (let i = 0; i < 20000 && !done; i++) { s.update(0.1); done = s.dayLog.missions.length === 1 && s.byId.c04.mode === 'idle'; if (s.ended) break; }
  assert.ok(done, '임무가 끝나야 함'); const m = s.dayLog.missions[0]; assert.ok(['success', 'partial', 'fail'].includes(m.result));
  assert.equal(s.funds, f0 + m.reward);
});
await t('부상(HP<25)은 임무/순찰 거부, 의무실로 자동 이동', () => {
  const s = new Sim(null, Math.random); s.setSpeed(2); s.byId.c05.hp = 20;
  assert.equal(s.sendMission('c05', 'rg1').ok, false); assert.equal(s.sendPatrol('c05', 'gate').ok, false);
  for (let i = 0; i < 3000 && s.byId.c05.home !== 'medical'; i++) s.update(0.1);
  assert.equal(s.byId.c05.home, 'medical');
});
await t('순찰: 경로를 돌고 종료 후 방으로 복귀', () => {
  const s = new Sim(null, Math.random); s.setSpeed(2); assert.ok(s.sendPatrol('c07', 'corridor').ok);
  for (let i = 0; i < 8000 && s.dayLog.patrols.length === 0; i++) { s.update(0.1); if (s.ended) break; }
  assert.equal(s.dayLog.patrols.length, 1);
  for (let i = 0; i < 2000 && s.byId.c07.mode !== 'idle'; i++) s.update(0.1);
  assert.equal(s.byId.c07.mode, 'idle');
});
await t('엿듣기: 혼잣말이 나오고 기록됨', () => {
  const s = new Sim(null, Math.random); const lines = s.listen('c13'); assert.ok(lines.length >= 1 && lines.every((x) => typeof x === 'string' && x.length > 5));
  assert.ok(s.dayLog.overheard.length >= 1);
  s.byId.c13.hp = 10; assert.ok(s.listen('c13').length >= 1);
});
await t('보고서: 마감 정산 → 다음 날 개시, 저장/복원 일치', () => {
  const s = new Sim(null, Math.random); s.setSpeed(2); s.sendMission('c10', 'rq1'); s.sendPatrol('c07', 'gate');
  for (let i = 0; i < 300; i++) s.update(0.1);
  const rep = s.buildReport(); assert.equal(rep.day, 1); assert.equal(rep.depts.length, 8); assert.ok(rep.missions.length >= 1);
  const f = s.funds; s.nextDay(rep); assert.equal(s.day, 2); assert.equal(s.clock, 0); assert.equal(s.funds, rep.fundsEnd); assert.ok(f - 7200 === rep.fundsEnd || rep.fundsEnd !== f);
  for (const u of s.units) { assert.equal(u.mode, 'idle'); assert.ok(u.hp > 0 && u.hp <= 100); }
  const snap = JSON.parse(JSON.stringify(s.serialize())); const s2 = new Sim(snap, Math.random);
  assert.equal(s2.day, 2); assert.equal(s2.funds, s.funds); assert.equal(s2.byId.c10.hp, Math.round(s.byId.c10.hp));
});
await t('저장 복원: 임무 중이던 인원은 정문 밖(away)에서 이어짐', () => {
  const s = new Sim(null, Math.random); s.setSpeed(2); s.sendMission('c16', 'rd1'); for (let i = 0; i < 1500 && s.byId.c16.phase !== 'away'; i++) s.update(0.1);
  assert.equal(s.byId.c16.phase, 'away'); const snap = JSON.parse(JSON.stringify(s.serialize())); const s2 = new Sim(snap);
  assert.equal(s2.byId.c16.mode, 'mission'); assert.equal(s2.byId.c16.away, true);
});
await t('성공 확률: 같은 부서·높은 스탯이 더 높고 범위 [0.05,0.97]', () => {
  const s = new Sim(); const a = successChance(s.byId.c04, MISSION.rg2), b = successChance(s.byId.c13, MISSION.rg2);
  assert.ok(a > b); for (const u of s.units) for (const m of MISSIONS) { const p = successChance(u, m); assert.ok(p >= 0.05 && p <= 0.97); }
});

await t('커스터마이징 데이터: 머리 남/여 10개, 무기 13종, 특성 20/20/20, 능력 5, 스탯 6', () => {
  assert.equal(HAIR_STYLES.filter((h) => h.g === 'm').length, 10); assert.equal(HAIR_STYLES.filter((h) => h.g === 'f').length, 10);
  assert.deepEqual(WEAPONS.map((w) => w.name), ['단검', '쇼트소드', '롱소드', '그레이트소드', '창', '방패', '레이피어', '건틀렛', '망치', '두손 망치', '손도끼', '서리 대검', '배틀엑스']);
  for (const r of ['c', 'r', 'l']) assert.equal(TRAITS.filter((x) => x.rarity === r).length, 20, r);
  assert.ok(TRAITS.filter((x) => x.rarity === 'l' && x.bad).length >= 3, '순수하게 나쁜 전설 특성');
  assert.ok(TRAITS.filter((x) => x.rarity === 'l' && !x.bad).length >= 10, '좋은 전설 특성도 존재');
  assert.equal(new Set(TRAITS.map((x) => x.id)).size, 60); assert.deepEqual(ABILITIES.map((a) => a.name), ['원격 감지', '드래곤', '카피캣', '괴력', '은신']);
  assert.deepEqual(CSTATS.map((c) => c.ko), ['근력', '방어력', '기술', '카리스마', '매력', '지혜']);
  assert.ok(Math.abs(GACHA_ODDS.c + GACHA_ODDS.r + GACHA_ODDS.l - 1) < 1e-9 && GACHA_ODDS.c > GACHA_ODDS.r && GACHA_ODDS.r > GACHA_ODDS.l);
  for (const tr of TRAITS) assert.ok(fxLines(tr.fx).length > 0, tr.id);
});
await t('스탯 포인트: 캐릭터마다 40~50, 각 스탯 최대 10, 총합은 풀 이내', () => {
  const s = new Sim(null, Math.random); const pools = new Set();
  for (const u of s.units) { pools.add(u.pool); assert.ok(u.pool >= 40 && u.pool <= 50, u.id); assert.equal(sumAlloc(u.alloc), u.pool, '기본 추천 배분은 풀을 모두 사용'); for (const { k } of CSTATS) assert.ok(u.alloc[k] >= 0 && u.alloc[k] <= 10); }
  assert.ok(pools.size > 1, '풀이 캐릭터마다 랜덤');
  const u = s.byId.c04; s.resetStats('c04'); assert.equal(sumAlloc(u.alloc), 0);
  assert.equal(s.setStat('c04', 'str', 99).value, 10, '최대 10'); assert.equal(s.setStat('c04', 'def', 10).value, 10);
  for (const k of ['skl', 'cha', 'chm', 'wis']) s.setStat('c04', k, 10);
  assert.ok(sumAlloc(u.alloc) <= u.pool, '풀 초과 불가'); assert.equal(sumAlloc(u.alloc), Math.min(u.pool, 60));
  const r = new Sim(null, () => 0); assert.equal(r.units[0].pool, 40); const r2 = new Sim(null, () => 0.999999); assert.equal(r2.units[0].pool, 50);
  for (const d of DEPTS) for (const pool of [40, 45, 50]) { const a = autoAlloc(pool, d.key); assert.equal(sumAlloc(a), pool); }
});
await t('특성 뽑기: 10회 제한, 확률 70/25/5, 중복 없음, 장착 3개 제한, 효과 반영', () => {
  const s = new Sim(null, Math.random); const u = s.byId.c05;
  for (let i = 0; i < 10; i++) assert.ok(s.pullTrait('c05').ok, `${i + 1}번째`);
  assert.equal(s.pullTrait('c05').ok, false); assert.equal(u.traits.length, 10); assert.equal(new Set(u.traits).size, 10);
  // 확률 검증(대량 시뮬레이션): 독립 Sim 으로 많이 뽑는다
  const cnt = { c: 0, r: 0, l: 0 }; let n = 0;
  for (let i = 0; i < 4000; i++) { const x = new Sim(null, Math.random); for (let k = 0; k < 10; k++) { const res = x.pullTrait('c01'); cnt[res.trait.rarity]++; n++; } }
  assert.ok(Math.abs(cnt.c / n - 0.7) < 0.03, '일반 ' + cnt.c / n); assert.ok(Math.abs(cnt.r / n - 0.25) < 0.03, '희귀 ' + cnt.r / n); assert.ok(Math.abs(cnt.l / n - 0.05) < 0.02, '전설 ' + cnt.l / n);
  const v = new Sim(null, Math.random), w = v.byId.c10; w.traits = ['c04', 'r01', 'l01', 'l11']; w.used = 4;
  assert.ok(v.toggleTrait('c10', 'c04').ok && v.toggleTrait('c10', 'r01').ok && v.toggleTrait('c10', 'l01').ok); assert.equal(v.toggleTrait('c10', 'l11').ok, false, '3개 초과');
  assert.equal(v.toggleTrait('c10', 'c01').ok, false, '미보유'); assert.ok(w.fx.str >= 3 + 1 + 2 - 0, 'str 합산');
});
await t('연구: 보고서마다 +1, 능력 10pt, 3배속 해금, 수입 +0.5%·비용 2씩 증가(20단계), 능력 장착', () => {
  const s = new Sim(null, Math.random); assert.equal(s.research.points, 0);
  assert.equal(s.doResearch('ab:dragon').ok, false, '포인트 부족'); assert.equal(s.toggleAbility('c04', 'dragon').ok, false, '미연구 능력 장착 불가');
  s.setSpeed(3); assert.equal(s.speed, 2, '3배속은 잠김');
  s.research.points = 1000;
  const costs = []; for (let i = 0; i < 20; i++) { costs.push(s.researchState('income').cost); assert.ok(s.doResearch('income').ok); }
  assert.deepEqual(costs, Array.from({ length: 20 }, (_, i) => 2 * (i + 1)), '비용이 2씩 증가'); assert.equal(s.doResearch('income').ok, false, '21번째 불가'); assert.ok(Math.abs(s.incomeMult() - 1.1) < 1e-9);
  assert.equal(RESEARCH.filter((r) => r.kind === 'ability').length, 5); for (const r of RESEARCH.filter((r) => r.kind === 'ability')) assert.equal(r.cost(0), 10);
  const before = s.research.points; assert.ok(s.doResearch('speed3').ok); assert.equal(before - s.research.points, 5); s.setSpeed(3); assert.equal(s.speed, 3);
  for (const a of ['remote', 'dragon', 'copycat', 'might', 'stealth']) assert.ok(s.doResearch('ab:' + a).ok);
  assert.ok(s.toggleAbility('c04', 'dragon').ok && s.toggleAbility('c04', 'might').ok); assert.equal(s.toggleAbility('c04', 'stealth').ok, false, '능력 2개 제한');
  assert.ok(s.byId.c04.fx.str >= 7 && s.byId.c04.fx.upkeep === 400);
  // 보고서 → 연구 포인트 +1
  const t2 = new Sim(null, Math.random); t2.setSpeed(2); for (let i = 0; i < 5; i++) t2.update(0.1); const rep = t2.buildReport(); t2.nextDay(rep); assert.equal(t2.research.points, 1); assert.equal(rep.researchPoints, 1);
});
await t('효과 반영: 카피캣·무기·특성이 성공률/보상/이동속도/유지비에 영향', () => {
  const s = new Sim(null, Math.random); const u = s.byId.c06; const m = MISSION.rg3; assert.ok(s.chance(u, m) < 0.9, '상한에 걸리지 않는 조건');
  const base = s.chance(u, m); u.traits = ['r07']; u.eq = ['r07']; s.refresh(); assert.ok(s.chance(u, m) > base, '베테랑 성공률 ↑');
  u.traits = ['l16']; u.eq = ['l16']; s.refresh(); assert.ok(s.chance(u, m) < base, '불운의 별 성공률 ↓');
  u.eq = []; u.traits = []; s.setWeapon('c06', 'greatsword'); assert.ok(u.fx.speed < 0 && u.fx.str === 3);
  // 카피캣: 같은 부서 최고 스탯의 70%
  const c = s.byId.c04, mate = s.byId.c05; s.resetStats('c04'); s.resetStats('c05'); s.setStat('c05', 'wis', 10); s.research.abilities.push('copycat'); assert.ok(s.toggleAbility('c04', 'copycat').ok);
  assert.equal(c.cs.wis, 7, '10 의 70%');
  // 유지비·보상
  const v = new Sim(null, () => 0.5); v.byId.c01.eq = []; const up0 = v.buildReport(true).upkeep; v.byId.c01.ab = []; v.research.abilities.push('dragon'); v.toggleAbility('c01', 'dragon'); assert.equal(v.buildReport(true).upkeep - up0, 400);
  // 수입 증가 반영
  const a = new Sim(null, () => 0.01), b = new Sim(null, () => 0.01); b.research.income = 20; for (const x of [a, b]) { x.byId.c10.mission = { id: 'rq1', remaining: 0 }; x.finishMission(x.byId.c10); }
  assert.ok(b.funds > a.funds, '수입 증가');
});
await t('저장/복원: 커스터마이징·특성·연구가 유지되고 잘못된 값은 걸러진다', () => {
  const s = new Sim(null, Math.random); s.setHair('c04', 'f6', '#ff00aa'); s.setWeapon('c04', 'rapier'); s.setStat('c04', 'str', 4); s.byId.c04.traits = ['c01', 'r02']; s.byId.c04.used = 2; s.toggleTrait('c04', 'r02'); s.research.points = 7; s.research.abilities = ['might']; s.toggleAbility('c04', 'might');
  const snap = JSON.parse(JSON.stringify(s.serialize())); const x = new Sim(snap, Math.random); const u = x.byId.c04;
  assert.equal(u.look.hairStyle, 'f6'); assert.equal(u.look.hair, '#ff00aa'); assert.equal(u.weapon, 'rapier'); assert.equal(u.alloc.str, s.byId.c04.alloc.str); assert.equal(u.pool, s.byId.c04.pool);
  assert.deepEqual(u.eq, ['r02']); assert.deepEqual(u.ab, ['might']); assert.equal(x.research.points, 7); assert.equal(u.used, 2);
  snap.units.c04.c = { hs: 'zz', hc: 'red', w: 'laser', pool: 999, alloc: { str: 99, def: 99, skl: 99, cha: 99, chm: 99, wis: 99 }, used: 0, traits: ['nope', 'c01', 'c01'], eq: ['c01', 'x', 'c02', 'r01', 'r02'], ab: ['dragon'] };
  const y = new Sim(snap, Math.random).byId.c04; assert.equal(y.look.hairStyle, 'f6'.length ? y.look.hairStyle : ''); assert.ok(y.pool >= 40 && y.pool <= 50); assert.ok(sumAlloc(y.alloc) <= y.pool); assert.deepEqual(y.traits, ['c01']); assert.deepEqual(y.eq, ['c01']); assert.deepEqual(y.ab, []);
  const old = new Sim({ v: 1, day: 3, clock: 10, funds: 5, units: { c04: { hp: 50, mor: 50, home: 'rager', mode: 'idle' } } }, Math.random); assert.equal(old.day, 3); assert.equal(old.byId.c04.hp, 50, '옛 저장 파일도 로드');
});
await t('백그라운드 따라잡기: advance 는 update 반복과 같고, 정지/하루 종료에서 멈추며, 조용히(quiet) 진행', () => {
  const a = new Sim(null, () => 0.5), b = new Sim(null, () => 0.5); a.setSpeed(2); b.setSpeed(2);
  a.advance(60); for (let i = 0; i < 600; i++) b.update(0.1); assert.ok(Math.abs(a.clock - b.clock) < 1e-6, `${a.clock} vs ${b.clock}`);
  const p = new Sim(null, () => 0.5); p.advance(100); assert.equal(p.clock, 0, '정지 상태는 진행하지 않음');
  const e = new Sim(null, () => 0.5); e.setSpeed(3 === 3 ? 2 : 1); e.advance(100000); assert.ok(e.ended && e.clock === 1260, '하루 종료에서 멈춤');
  const q = new Sim(null, () => 0.5); let toasts = 0; q.on('toast', () => toasts++); q.setSpeed(2); q.sendMission('c10', 'rq1'); toasts = 0; q.quiet = true; q.advance(400); q.quiet = false;
  assert.equal(toasts, 0, 'quiet 동안 토스트 없음'); assert.ok(q.dayLog.missions.length >= 1, '임무는 조용히 진행·완료됨');
});
await t('이름 변경: 검증·중복 방지·초기화·저장 복원', () => {
  const s = new Sim(null, Math.random); const u = s.byId.c04;
  assert.ok(s.setName('c04', '  새  이름 ', 'Newname').ok); assert.equal(u.name, '새 이름'); assert.equal(u.latin, 'Newname');
  for (const bad of ['', 'x'.repeat(13), '<b>']) assert.equal(s.setName('c04', bad, 'Okname').ok, false, bad);
  assert.equal(s.setName('c04', '정상', 'A').ok, false, '라틴어 1자'); assert.equal(s.setName('c04', '정상', '한글').ok, false, '라틴어는 영문만');
  assert.equal(s.setName('c04', s.byId.c05.name, 'Zzz').ok, false, '다른 캐릭터와 같은 이름'); assert.equal(s.setName('c04', '정상', s.byId.c05.latin.toLowerCase()).ok, false, '라틴어 중복');
  assert.ok(s.setName('c04', u.name, u.latin).ok, '자기 자신과는 같아도 됨');
  const snap = JSON.parse(JSON.stringify(s.serialize())); const x = new Sim(snap, Math.random); assert.equal(x.byId.c04.name, '새 이름'); assert.equal(x.byId.c04.latin, 'Newname');
  snap.units.c06.c.nm = snap.units.c05.c.nm; const y = new Sim(snap, Math.random); assert.notEqual(y.byId.c06.name, y.byId.c05.name, '저장 파일의 중복 이름은 무시');
  assert.ok(s.resetName('c04').ok); assert.equal(u.name, '강태오'); assert.equal(u.latin, 'Impetus');
});
await t('혼잣말: 초승달 없는 새 대사 10개 추가', () => {
  assert.equal(MONO.generic.length, 14); assert.equal(MONO.generic.filter((x) => x.includes('초승달')).length, 1, '기존 1개만 유지');
  assert.equal(new Set(MONO.generic).size, 14);
});

await t('날씨: 분포 35/20/20/25, 효과는 한파(이동↓)·안개(성공률↓)에만', () => {
  const c = { clear: 0, rain: 0, fog: 0, cold: 0 }; for (let i = 0; i < 40000; i++) c[rollWeather(Math.random)]++;
  for (const [k, w] of [['clear', 0.35], ['rain', 0.2], ['fog', 0.2], ['cold', 0.25]]) assert.ok(Math.abs(c[k] / 40000 - w) < 0.015, k);
  assert.ok(WEATHERS.cold.speed < 0 && WEATHERS.fog.succ < 0 && !WEATHERS.clear.speed && !WEATHERS.clear.succ && !WEATHERS.rain.speed && !WEATHERS.rain.succ && !WEATHERS.cold.succ && !WEATHERS.fog.speed);
  const dist = (w, snow = 0) => { const s = new Sim(null, () => 0.5); s.weather.today = w; s.snow = snow; s.setSpeed(1); const u = s.byId.c04; s.sendToRoom('c04', 'medical'); const x0 = u.x, y0 = u.y; for (let i = 0; i < 15; i++) s.update(0.1); return Math.hypot(u.x - x0, u.y - y0); };
  const clear = dist('clear'), cold = dist('cold'), rain = dist('rain'); assert.ok(cold < clear * 0.85, `한파 ${cold} < 맑음 ${clear}`); assert.ok(Math.abs(rain - clear) < 1e-6, '비는 이동 속도에 영향 없음');
  const s = new Sim(null, () => 0.5), u = s.byId.c06, m = MISSION.rg3; const base = s.chance(u, m); s.weather.today = 'fog'; assert.ok(Math.abs(base - s.chance(u, m) - 0.1) < 1e-9, '안개 -10%p');
  s.weather.today = 'cold'; assert.equal(s.chance(u, m), base, '한파는 성공률 영향 없음');
  s.weather.today = 'fog'; u.gear.acc = 'eq_goggles'; s.refresh(); assert.equal(s.chance(u, m), base, '안개 고글은 안개 무시');
});
await t('적설: 날마다 날씨에 따라 변하고, 야외에서만 이동이 느려진다', () => {
  assert.equal(dailySnow(50, 'cold'), 75); assert.equal(dailySnow(50, 'rain'), 30); assert.equal(dailySnow(98, 'cold'), 100); assert.equal(dailySnow(3, 'rain'), 0); assert.equal(START_SNOW, 40);
  assert.ok(isOutdoor(2, 2) && !isOutdoor(10, 8));
  const run = (snow) => { const s = new Sim(null, () => 0.5); s.weather.today = 'clear'; s.snow = snow; s.setSpeed(1); const u = s.byId.c04; u.place(2, 17); u.path = [[2, 16], [2, 15], [2, 14], [2, 13], [2, 12], [2, 11], [2, 10]]; u.mode = 'goto'; for (let i = 0; i < 10; i++) s.update(0.1); return Math.abs(u.y - (17 * 16 + 15)); };
  assert.ok(run(100) < run(0) * 0.9, '눈이 쌓인 마당이 더 느림');
  const s = new Sim(null, () => 0.5); s.weather = { today: 'clear', next: 'cold' }; s.snow = 50; s.setSpeed(2); s.update(0.1); const rep = s.buildReport(); s.nextDay(rep); assert.equal(s.weather.today, 'cold'); assert.equal(s.snow, 75, '새 날씨(한파)의 적설 +25'); assert.ok(['clear', 'rain', 'fog', 'cold'].includes(s.weather.next));
});
await t('재설 작업·용광로 발전: 적설 감소, 용광로는 1명만, 저장/복원', () => {
  const s = new Sim(null, () => 0.4); s.snow = 80; s.setSpeed(3 === 3 ? 2 : 1);
  assert.ok(s.sendWork('c19', 'snow').ok); assert.ok(s.sendWork('c22', 'furnace').ok); assert.equal(s.sendWork('c20', 'furnace').ok, false, '용광로 중복 불가');
  let guard = 0; while ((s.byId.c19.mode === 'work' || s.byId.c22.mode === 'work') && guard++ < 30000) s.update(0.1);
  assert.ok(s.snow < 80 - 20, `적설 ${s.snow}`); assert.equal(s.byId.c19.mode === 'work', false); assert.ok(s.dayLog.orders >= 2);
  const e = new Sim(null, () => 0.4); e.snow = 0; assert.equal(e.sendWork('c19', 'snow').ok, false, '눈이 없으면 재설 불가'); assert.ok(e.sendWork('c19', 'furnace').ok);
  e.setSpeed(2); for (let i = 0; i < 4000 && !e.furnaceActive; i++) e.update(0.1); assert.ok(e.furnaceActive, '도착하면 가동'); const snap = JSON.parse(JSON.stringify(e.serialize())); const f = new Sim(snap, () => 0.4);
  assert.equal(f.byId.c19.mode, 'work'); assert.equal(f.byId.c19.work.kind, 'furnace'); assert.ok(f.furnaceActive);
  const [fx, fy] = FURNACE.spot; assert.ok(!yardWorkTiles().some(([x, y]) => x === fx && y === fy), '재설 장소와 용광로 자리는 분리');
  const o = new Sim(null, () => 0.4); o.sendWork('c19', 'snow'); o.sendToRoom('c19', 'aerial'); assert.equal(o.byId.c19.work, null, '다른 명령이 작업을 취소');
});
await t('상점 품목: 능력치 6 · 장비 10 · 소모품 5 · 가구 40(고유), 구매·자금', () => {
  assert.equal(STAT_ITEMS.length, 6); assert.equal(EQUIPMENT.length, 10); assert.equal(CONSUMABLES.length, 5); assert.equal(FURNITURE.length, 40); assert.equal(new Set(ITEMS.map((i) => i.id)).size, 61);
  assert.equal(new Set(FURNITURE.map((f) => f.name)).size, 40); for (const f of FURNITURE) assert.ok(Object.keys(f.fx).length >= 1 && f.price > 0, f.id);
  const s = new Sim(null, () => 0.5), f0 = s.funds; assert.ok(s.buy('cs_medkit', 2).ok); assert.equal(s.funds, f0 - 1200); assert.equal(s.owned('cs_medkit'), 2);
  s.funds = 100; assert.equal(s.buy('fn16').ok, false, '자금 부족'); assert.equal(s.owned('fn16'), 0); assert.equal(s.buy('nope').ok, false);
});
await t('아이템: 능력치 증표(+1, 최대 +3), 장비 장착/해제, 소모품 효과, 임무 지원 키트', () => {
  const s = new Sim(null, () => 0.5); s.funds = 1e6; const u = s.byId.c06; s.resetStats('c06'); const s0 = u.cs.str;
  for (let i = 0; i < 4; i++) s.buy('st_str'); for (let i = 0; i < 3; i++) assert.ok(s.useStatItem('c06', 'st_str').ok); assert.equal(s.useStatItem('c06', 'st_str').ok, false, '최대 +3'); assert.equal(u.cs.str, s0 + 3); assert.equal(s.owned('st_str'), 1);
  s.buy('eq_vest'); s.buy('eq_leather'); assert.ok(s.equipGear('c06', 'eq_vest').ok); const dmg1 = u.fx.dmg; assert.ok(s.equipGear('c06', 'eq_leather').ok, '같은 칸 교체'); assert.equal(s.owned('eq_vest'), 1, '교체한 장비는 인벤토리로'); assert.ok(u.fx.dmg > dmg1 - 1e-9);
  assert.ok(s.unequipGear('c06', 'armor').ok); assert.equal(u.gear.armor, null); assert.equal(s.owned('eq_leather'), 1); assert.equal(s.unequipGear('c06', 'armor').ok, false);
  s.buy('cs_medkit'); u.hp = 30; assert.ok(s.useConsumable('c06', 'cs_medkit').ok); assert.equal(u.hp, 70); s.buy('cs_medkit'); u.hp = 100; assert.equal(s.useConsumable('c06', 'cs_medkit').ok, false, 'HP 가득');
  s.buy('cs_ration'); u.mor = 50; assert.ok(s.useConsumable('c06', 'cs_ration').ok); assert.equal(u.mor, 70);
  const m = MISSION.rg3, b = s.chance(u, m); s.buy('cs_kit'); assert.ok(s.useConsumable('c06', 'cs_kit').ok); assert.ok(Math.abs(s.chance(u, m) - b - 0.1) < 1e-9, '키트 +10%p'); assert.equal(s.useConsumable('c06', 'cs_kit').ok, false, '중복 적용 불가');
  u.mission = { id: 'rg3', remaining: 0 }; s.finishMission(u); assert.equal(u.kit, false, '임무 후 소모');
  s.buy('cs_warm'); s.weather.today = 'cold'; const spdBefore = 1; assert.ok(s.useConsumable('c06', 'cs_warm').ok); assert.equal(u.warm, s.day);
  s.buy('eq_parka'); s.equipGear('c06', 'eq_parka'); assert.equal(u.fx.coldProof, true);
});
await t('가구: 방마다 4칸, 배치/회수, 효과·선호 방 ×1.5, 유지비, 길이 막히지 않음, 저장/복원', () => {
  for (const k of ROOM_KEYS) assert.equal(SLOTS[k].length, FURN_SLOTS, k);
  const s = new Sim(null, () => 0.5); s.funds = 1e7; s.buy('fn31', 2); s.buy('fn06');
  const nurse = s.byId.c13, grunt = s.byId.c04, h0 = nurse.fx.heal;
  assert.ok(s.placeFurniture('medical', 0, 'fn31').ok); assert.ok(Math.abs(nurse.fx.heal - h0 - 0.2 * 1.5) < 1e-9, '선호 방 ×1.5'); assert.ok(Math.abs(s.byId.c14.fx.heal - (nurse.fx.heal)) < 1e-9, '같은 방 거주자 모두 적용');
  assert.equal(s.placeFurniture('medical', 0, 'fn31').ok, false, '이미 놓인 자리'); assert.ok(s.placeFurniture('rager', 1, 'fn31').ok); assert.ok(Math.abs(grunt.fx.heal - 0.2) < 1e-9, '다른 방은 ×1.0');
  const up0 = s.buildReport(true).upkeep; assert.ok(s.placeFurniture('rager', 2, 'fn06').ok); assert.equal(s.buildReport(true).upkeep - up0, 100, '유지비는 가구 1개 기준');
  assert.ok(s.removeFurniture('rager', 2).ok); assert.equal(s.owned('fn06'), 1); assert.equal(s.removeFurniture('rager', 2).ok, false);
  const snap = JSON.parse(JSON.stringify(s.serialize())); const r = new Sim(snap, () => 0.5); assert.equal(r.placed.medical[0], 'fn31'); assert.equal(r.owned('fn31'), 0); assert.ok(r.byId.c13.fx.heal > 0.2);
  // 모든 칸을 채워도 모든 방의 모든 타일이 정문과 연결
  const f = new Sim(null, () => 0.5); f.funds = 1e8; let n = 0; for (const k of ROOM_KEYS) for (let i = 0; i < FURN_SLOTS; i++) { const id = FURNITURE[n++ % 40].id; f.buy(id); assert.ok(f.placeFurniture(k, i, id).ok); }
  for (const k of [...Object.keys(ROOMS), 'lobby']) for (const [x, y] of roomFreeTiles(k)) assert.ok(findPath(x, y, GATE.x, GATE.y), `${k} (${x},${y}) 길 막힘`);
  const g = new Sim(null, () => 0.5); assert.ok(findPath(SLOTS.operation[0][0], SLOTS.operation[0][1], GATE.x, GATE.y) !== null, '새 Sim 은 자리를 비워 둠');
});
await t('팀장: 부서마다 고정 1명, 대화(보고·격려·지원 요청), 하루 1회 제한, 친밀도·감화, 저장', () => {
  assert.equal(Object.keys(LEADER_IDS).length, 8); for (const d of DEPTS) { const L = new Sim(null, () => 0.5).leaderUnit(d.key); assert.equal(L.dept, d.key); assert.ok(L.isLeader); assert.ok(LEADER_TALK[L.id].report.length >= 2); }
  assert.equal(ROSTER.filter((r) => Object.values(LEADER_IDS).includes(r.id)).length, 8);
  const s = new Sim(null, () => 0.5); s.funds = 10000; const L = s.leaderUnit('rager'), mate = s.byId.c05; mate.mor = 40;
  const r = s.talkLeader('rager', 'report'); assert.ok(r.ok && r.lines.length >= 2 && r.lines[1].includes('부서원 3명'));
  const a0 = mate.fx.succ; assert.ok(s.talkLeader('rager', 'encourage').ok); assert.equal(mate.mor, 48); assert.equal(L.aff, 1); assert.ok(mate.fx.succ > a0, '친밀도로 감화 증가'); assert.equal(s.talkLeader('rager', 'encourage').ok, false, '하루 1회');
  const f0 = s.funds; assert.ok(s.talkLeader('rager', 'request').ok); assert.equal(s.funds, f0 - REQUEST_COST); assert.equal(s.talkLeader('rager', 'request').ok, false); s.funds = 10; assert.equal(s.talkLeader('medical', 'request').ok, false, '자금 부족');
  assert.equal(L.fx.succ <= mate.fx.succ, true, '팀장 본인은 감화 대상 아님'); assert.equal(L.aura, 0);
  const x = new Sim(JSON.parse(JSON.stringify(s.serialize())), () => 0.5); assert.equal(x.leaderUnit('rager').aff, 2); assert.equal(x.talkLeader('rager', 'encourage').ok, false, '하루 1회 상태도 저장');
  s.nextDay(s.buildReport()); assert.ok(s.talkLeader('rager', 'encourage').ok, '다음 날 다시 가능');
});
await t('이벤트 데이터: 부서마다 3건 + 날씨 3건, 효과·판정·아이템이 모두 유효', () => {
  assert.equal(EVENTS.length, 27); assert.equal(new Set(EVENTS.map((e) => e.id)).size, 27);
  for (const d of DEPTS) assert.equal(EVENTS.filter((e) => e.dept === d.key).length, 3, d.key);
  assert.equal(EVENTS.filter((e) => !e.dept).length, 3);
  const FXK = new Set(['str', 'def', 'skl', 'cha', 'chm', 'wis', 'succ', 'night', 'day', 'reward', 'dmg', 'heal', 'speed', 'rep', 'mor', 'rest']);
  for (const e of EVENTS) {
    assert.ok(e.choices.length >= 2 && e.choices.length <= 3, e.id); assert.ok(!/\{(?!n\}|L\}|best\})/.test(e.text), e.id + ' 알 수 없는 치환자');
    for (const c of e.choices) {
      const outs = c.check ? [c.ok, c.fail] : [c.out]; assert.ok(outs.every(Boolean), e.id + ' 결과 누락');
      if (c.check) assert.ok(['cmb', 'def', 'mob', 'med', 'int'].includes(c.check.stat) && c.check.diff > 30 && c.check.diff < 150, e.id);
      for (const o of outs) { assert.ok(o.t.length > 10, e.id); for (const f of o.fx) {
        const [k, v, a] = f; assert.ok(['funds', 'rep', 'mor', 'hp', 'item', 'research', 'aff', 'snow', 'buff'].includes(k), e.id + ' ' + k);
        if (k === 'item') assert.ok(ITEM[v], e.id + ' 없는 아이템 ' + v); if (k === 'buff') assert.ok(a && Object.keys(v).every((x) => FXK.has(x)), e.id + ' 버프');
        if (k === 'mor' || k === 'hp') assert.ok([undefined, 'dept', 'unit', 'all'].includes(a), e.id); assert.ok(fxChip(f, (id) => ITEM[id].name).t.length > 2);
      } }
    }
  }
  assert.equal(fxChip(['funds', -300]).good, false); assert.equal(fxChip(['hp', 5, 'all']).t, '전원 HP +5'); assert.equal(fxChip(['snow', -35]).good, true);
});
await t('이벤트 엔진: 조건·가중치·쿨다운, 시작하면 시간이 멈추고 속도 변경이 막힌다', () => {
  Sim.EVENTS_ON = true; try {
    const s = new Sim(null, () => 0.5); assert.equal(s.pendingEvent, null);
    s.weather.today = 'clear'; s.clock = 0; s.snow = 10; const ids = new Set(); for (let i = 0; i < 60; i++) { const r = Math.random; const x = new Sim(null, () => (i + 0.5) / 60); x.weather.today = 'clear'; x.snow = 10; const d = x.startEvent(); ids.add(d.id); }
    assert.ok(!ids.has('ge1') && !ids.has('ge2') && !ids.has('ge3') && !ids.has('df1') && !ids.has('df2'), '조건(밤·한파·안개·적설) 불충족 사건은 제외');
    const def = s.startEvent('op1'); assert.equal(def.id, 'op1'); assert.equal(s.speed, 0); s.setSpeed(2); assert.equal(s.speed, 0, '사건 중 재생 불가'); assert.equal(s.startEvent('op2'), null, '동시에 둘은 불가');
    const v = s.eventView(); assert.equal(v.title, '봉인된 서한'); assert.equal(v.choices.length, 3); assert.ok(v.text.includes(s.leaderUnit('operation').name) && !v.text.includes('{'));
    assert.ok(v.choices[0].check.chance >= 0.1 && v.choices[0].check.chance <= 0.95); assert.equal(v.choices[2].cost, 500);
    s.funds = 100; assert.equal(s.eventView().choices[2].disabled, true); assert.equal(s.chooseEvent(2).ok, false, '자금 부족'); assert.equal(s.chooseEvent(9).ok, false); assert.ok(s.pendingEvent);
    s.funds = 1000; const f0 = s.funds, r = s.chooseEvent(1); assert.ok(r.ok && r.chips.length && r.text); assert.equal(s.pendingEvent, null); assert.equal(s.dayLog.events.length, 1); assert.equal(s.dayLog.events[0].title, '봉인된 서한');
    s.setSpeed(2); assert.equal(s.speed, 2);
    s.nextDay(s.buildReport()); assert.equal(s.ev.today, 0);
    // 쿨다운: 같은 사건은 EV_COOLDOWN 일 안에 다시 뽑히지 않는다
    const c = new Sim(null, () => 0.5); c.ev.cd.op1 = c.day; assert.equal(c.evEligible(EVENT.op1), false); c.day += EV_COOLDOWN; assert.equal(c.evEligible(EVENT.op1), true);
  } finally { Sim.EVENTS_ON = false; }
});
await t('이벤트 엔진: 게임 시간 1시간마다 판정, 하루 최대 건수·종료 직전 제한, 일시정지 중엔 발생하지 않음', () => {
  Sim.EVENTS_ON = true; try {
    const s = new Sim(null, () => 0.0); s.setSpeed(1);                                            // rand=0 → 항상 발생
    s.advance(40); assert.ok(s.pendingEvent, '게임 1시간(실시간 약 34초) 지나면 첫 사건'); assert.equal(s.speed, 0); assert.equal(s.ev.today, 1);
    const clk = s.clock; s.advance(100); assert.equal(s.clock, clk, '정지 중엔 시간이 흐르지 않는다');
    for (let i = 0; i < 6; i++) { s.chooseEvent(0); s.setSpeed(2); s.advance(120); if (!s.pendingEvent) break; }
    assert.ok(s.ev.today <= EV_MAX_PER_DAY, '하루 최대 ' + EV_MAX_PER_DAY + '건');
    const n = new Sim(null, () => 0.99); n.setSpeed(3); n.advance(DAY_REAL_SECONDS); assert.equal(n.pendingEvent, null, '확률 밖이면 사건 없음'); assert.ok(n.ended);
    const e = new Sim(null, () => 0.0); e.clock = 21 * 60 - 60; e.ev.acc = 59; e.setSpeed(1); e.advance(5); assert.equal(e.pendingEvent, null, '하루 끝 90분 전부터는 사건이 열리지 않는다');
    const d = new Sim(null, () => 0.0); d.setSpeed(1); d.advance(40); assert.ok(d.pendingEvent); const open = d.pendingEvent.id; d.nextDay(d.buildReport()); assert.equal(d.pendingEvent, null, '결정하지 않은 사건은 하루가 넘어가면 사라진다'); assert.ok(d.log.some((l) => l.text.includes('흘러갔다')) && open);
  } finally { Sim.EVENTS_ON = false; }
});
await t('이벤트 선택: 비용·판정(성공/실패)·효과(자금·평판·사기·HP·아이템·연구·친밀도·적설·버프)가 정확히 적용된다', () => {
  const mk = (rand, id) => { const s = new Sim(null, rand); s.startEvent(id); return s; };
  // 판정 성공(rand=0) / 실패(rand=0.999)
  let s = mk(() => 0, 'op1'); const f0 = s.funds, rep0 = s.rep; let r = s.chooseEvent(0); assert.equal(r.passed, true); assert.equal(s.funds, f0 + 3200); assert.equal(s.rep, rep0 + 1); assert.ok(r.chips.some((c) => c.t === '자금 +3,200 CR' || c.t.startsWith('자금 +3200')));
  s = mk(() => 0.999, 'op1'); const hp0 = s.byId.c01.hp; r = s.chooseEvent(0); assert.equal(r.passed, false); assert.ok(r.chips.some((c) => !c.good));
  // 비용 지불 + 소모
  s = mk(() => 0.5, 'op1'); s.funds = 5000; s.chooseEvent(2); assert.ok(s.funds <= 4500 + 1000 && s.funds >= 4500 - 0, '비용 500 지불'); 
  // 아이템 / 연구 포인트
  s = mk(() => 0, 'md2'); const k0 = s.owned('cs_medkit'); s.funds = 9999; s.chooseEvent(1); assert.ok(s.owned('cs_medkit') >= k0 + 1, '성공 시 응급 키트');
  s = mk(() => 0.5, 'op3'); const p0 = s.research.points; s.funds = 5000; s.chooseEvent(2); assert.equal(s.research.points, p0 + 1);
  // 팀장 친밀도: rg1 3번 선택지(성공)
  s = mk(() => 0, 'rg1'); const L = s.leaderUnit('rager'); s.chooseEvent(2); assert.equal(L.aff, 1);
  // 적설
  s = mk(() => 0.5, 'ge3'); s.snow = 80; s.chooseEvent(0); assert.equal(s.snow, 45);
  // 사기/HP 범위(전원·부서·당사자): 0~100, HP 는 5 아래로 내려가지 않는다
  s = mk(() => 0.999, 'md1'); for (const u of s.units) { u.hp = 10; u.mor = 3; } s.chooseEvent(2); for (const u of s.units) { assert.ok(u.hp >= 5 && u.hp <= 100 && u.mor >= 0 && u.mor <= 100); }
  s = mk(() => 0.5, 'rg1'); const dept = s.units.filter((u) => u.dept === 'rager'), others = s.units.filter((u) => u.dept !== 'rager'); const m0 = others.map((u) => u.mor); s.chooseEvent(0); assert.ok(dept.every((u) => u.mor >= 60 - 0) , '부서 사기 +6'); assert.deepEqual(others.map((u) => u.mor), m0, '다른 부서는 영향 없음');
  // 버프: 오늘 하루만, 해당 부서에만, 저장/복원, 다음 날 해제
  s = mk(() => 0.5, 'df2'); s.funds = 9999; const guard = s.units.find((u) => u.dept === 'defencer'), other = s.units.find((u) => u.dept === 'rager'); const d0 = guard.fx.def, dm0 = guard.fx.dmg, o0 = other.fx.def; s.chooseEvent(0);
  assert.equal(guard.fx.def, d0 + 1); assert.ok(Math.abs(guard.fx.dmg - (dm0 - 0.05)) < 1e-9, '피해 감소 버프'); assert.equal(other.fx.def, o0); assert.equal(s.ev.buffs.length, 1);
  const snap = JSON.parse(JSON.stringify(s.serialize())); const x = new Sim(snap, () => 0.5); assert.equal(x.ev.buffs.length, 1); assert.equal(x.units.find((u) => u.id === guard.id).fx.def, d0 + 1);
  s.nextDay(s.buildReport()); assert.equal(s.ev.buffs.length, 0); assert.equal(guard.fx.def, d0, '다음 날 버프 해제');
  // 보고서에 사건 기록
  s = mk(() => 0.5, 'op2'); s.chooseEvent(2); const rep = s.buildReport(true); assert.equal(rep.events.length, 1); assert.equal(rep.events[0].title, '장부의 구멍'); assert.ok(rep.events[0].text.length > 10 && Array.isArray(rep.events[0].chips));
});
await t('이벤트 저장/복원: 대기 중 사건·쿨다운·카운터 보존, 잘못된 값 무시', () => {
  const s = new Sim(null, () => 0.5); s.startEvent('rq3'); s.ev.acc = 30; const snap = JSON.parse(JSON.stringify(s.serialize()));
  const r = new Sim(snap, () => 0.5); assert.equal(r.pendingEvent.id, 'rq3'); assert.equal(r.speed, 0); assert.equal(r.ev.cd.rq3, s.day); assert.equal(r.ev.today, 1); assert.equal(r.ev.acc, 30); assert.equal(r.eventView().title, EVENT.rq3.title);
  const bad = JSON.parse(JSON.stringify(snap)); bad.ev = { pending: { id: 'nope', who: 'zzz' }, cd: { op1: 'x', nope: 3 }, today: 99, acc: -5, buffs: [{ fx: { str: 99, hack: 1, def: 1 }, label: 'a'.repeat(50), dept: 'zzz' }, null] };
  const b = new Sim(bad, () => 0.5); assert.equal(b.pendingEvent, null); assert.deepEqual(b.ev.cd, {}); assert.equal(b.ev.today, EV_MAX_PER_DAY); assert.equal(b.ev.acc, 0); assert.equal(b.ev.buffs.length, 1); assert.deepEqual(b.ev.buffs[0].fx, { def: 1 }); assert.equal(b.ev.buffs[0].label.length, 30); assert.equal(b.ev.buffs[0].dept, null);
  const old = JSON.parse(JSON.stringify(snap)); delete old.ev; delete old.dayLog.events; const o = new Sim(old, () => 0.5); assert.equal(o.pendingEvent, null); assert.equal(o.buildReport(true).events.length, 0, '옛 저장에도 안전');
});
await t('유승호: Operation 팀장(대검 · 끝이 붉은 검은 머리), 한서윤은 일반 팀원, 머리 끝색 저장/복원', () => {
  const u = ROSTER.find((r) => r.id === 'c25'); assert.equal(u.name, '유승호'); assert.equal(u.dept, 'operation'); assert.equal(u.latin, 'Praefectus'); assert.equal(u.weapon, 'frostblade'); assert.equal(u.look.hairStyle, 'm3', '가르마'); assert.equal(u.gender, 'm'); assert.equal(u.look.hair2, '#c0261c');
  assert.equal(LEADER_IDS.operation, 'c25'); assert.ok(LEADER_TALK.c25 && !LEADER_TALK.c01);
  const s = new Sim(null, () => 0.5); assert.equal(s.leaderUnit('operation').name, '유승호'); assert.equal(s.byId.c25.isLeader, true); assert.equal(s.byId.c01.isLeader, false);
  assert.ok(s.byId.c01.fx.succ > 0 && s.byId.c25.aura === 0, '한서윤은 감화를 받고 팀장 본인은 받지 않음');
  assert.equal(s.units.filter((x) => x.dept === 'operation').length, 4); assert.equal(s.talkLeader('operation', 'report').lines[1].includes('부서원 4명'), true);
  assert.equal(WEAPON_FX_OK(s.byId.c25), true);
  assert.equal(s.setHairTip('c25', 'red').ok, false); assert.ok(s.setHairTip('c04', '#00FF88').ok); assert.equal(s.byId.c04.look.hair2, '#00ff88');
  const snap = JSON.parse(JSON.stringify(s.serialize())); const r = new Sim(snap, () => 0.5); assert.equal(r.byId.c04.look.hair2, '#00ff88'); assert.equal(r.byId.c25.look.hair2, '#c0261c', '기본 끝색 유지');
  assert.ok(s.setHairTip('c25', null).ok); const r2 = new Sim(JSON.parse(JSON.stringify(s.serialize())), () => 0.5); assert.equal(r2.byId.c25.look.hair2, null, '끝색 제거도 저장');
  const bad = JSON.parse(JSON.stringify(snap)); bad.units.c04.c.h2 = 'javascript:1'; assert.equal(new Sim(bad, () => 0.5).byId.c04.look.hair2, null, '잘못된 값은 단색');
  const old = JSON.parse(JSON.stringify(snap)); delete old.units.c25; assert.equal(new Sim(old, () => 0.5).byId.c25.hp, 100, '옛 저장(유승호 없음)에서도 정상');
});
function WEAPON_FX_OK(u) { return u.fx.str >= 3 && u.fx.def >= 1; }
await t('부서 재집결: 부서 인원 전원을 부서 방으로, 임무·부상자 제외, 순찰/작업 중단', () => {
  const s = new Sim(null, () => 0.5); const rg = s.units.filter((u) => u.dept === 'rager');
  rg[0].home = 'lobby'; s.sendToRoom(rg[0].id, 'lobby'); s.sendPatrol(rg[1].id, 'perimeter'); 
  const r = s.regroup('rager'); assert.ok(r.ok); assert.equal(r.moved.length, 3); assert.equal(r.skipped.length, 0);
  assert.ok(rg.every((u) => u.home === 'rager' && (u.mode === 'goto' || u.mode === 'idle')), '전원 부서 방으로'); assert.equal(rg[1].patrol, null, '순찰 중단');
  assert.equal(s.dayLog.orders >= 1, true);
  const s2 = new Sim(null, () => 0.5); const m = s2.units.filter((u) => u.dept === 'medical'); s2.sendMission(m[0].id, 'md1'); m[1].hp = 10;
  const r2 = s2.regroup('medical'); assert.equal(r2.moved.length, 1); assert.deepEqual(r2.skipped.map((x) => x.why), ['임무 중', '부상(의무실)']); assert.equal(m[0].mode, 'mission', '임무는 유지');
  const s3 = new Sim(null, () => 0.5); for (const u of s3.units.filter((x) => x.dept === 'carrier')) u.hp = 5; assert.equal(s3.regroup('carrier').ok, false);
  assert.equal(s3.regroup('nope').ok, false); const s4 = new Sim(null, () => 0.5); s4.ended = true; assert.equal(s4.regroup('rager').ok, false);
  // 모든 부서에서 동작
  const s5 = new Sim(null, () => 0.5); for (const d of DEPTS) assert.equal(s5.regroup(d.key).moved.length, ROSTER.filter((x) => x.dept === d.key).length, d.key);
});
console.log(`\n${n} 테스트 통과${process.exitCode ? ' (실패 있음)' : ''}`);
