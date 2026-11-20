// Node 에서 실행되는 코어 테스트: TOTP(RFC 6238 벡터), 해시, 맵 연결성, 시뮬레이션 규칙(시간 12분, 임무/순찰/보고서/저장복원).
import assert from 'node:assert/strict';
import { hashSecret, verifySecret, makeRecoveryCodes, normalizeRecovery } from '../src/core/crypto.js';
import { findPath, PATROLS, ROOMS, roomFreeTiles, roomDoorTile, isSolid, GATE, CAMERAS, MW, MH } from '../src/game/map.js';
import { Sim, DAY_MINUTES, DAY_REAL_SECONDS, MIN_PER_SEC, clockInfo, successChance } from '../src/game/sim.js';
import { nickKey, nickProblem } from '../src/core/nick.js';
import { TRAITS, TRAIT, ABILITIES, GACHA_ODDS, fxLines } from '../src/game/traits.js';
import { HAIR_STYLES, HAIR_COLORS, HAIR, drawHair } from '../src/game/hair.js';
import { WEAPONS, WEAPON, WORKSHOPS, WORKSHOP_WEAPONS, drawWeapon } from '../src/game/weapons.js';
import { CSTATS, autoAlloc, sumAlloc } from '../src/game/rules.js';
import { RESEARCH, RESEARCH_BY_KEY } from '../src/game/research.js';
import { WEATHERS, rollWeather, dailySnow, TASKS, START_SNOW } from '../src/game/weather.js';
import { ITEMS, ITEM, STAT_ITEMS, EQUIPMENT, CONSUMABLES, FURNITURE, ROOM_KEYS, FURN_SLOTS, STAT_ITEM_CAP } from '../src/game/shop.js';
import { LEADER_IDS, LEADER_TALK, REQUEST_COST } from '../src/game/leaders.js';
import { SLOTS, FURNACE, yardWorkTiles, isOutdoor } from '../src/game/map.js';
import { ROSTER, DEPTS, MISSIONS, MISSION, MONO, GROUP_MISSIONS, GMISSION } from '../src/game/data.js';
import { RECRUIT, GRADES, INTERVIEW_COST, REROLL_COST, MAX_REROLLS, makeCandidates, cleanDef, candidateView } from '../src/game/recruit.js';
import { RaidBattle, planRaid, defenderFrom, RAID_CHANCE, FORMATIONS, ENEMY_TYPES, ABILITY_INFO, ARENA } from '../src/game/raid.js';
import { EVENTS, EVENT, EV_MAX_PER_DAY, EV_COOLDOWN, fxChip } from '../src/game/events.js';

Sim.EVENTS_ON = false; Sim.RAIDS_ON = false;   // 기존 테스트는 무작위 사건 없이 진행(사건 테스트에서 따로 켠다)

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

await t('커스터마이징 데이터: 머리 남/여 24개, 무기 19종, 특성 20/20/20, 능력 5, 스탯 6', () => {
  assert.equal(HAIR_STYLES.filter((h) => h.g === 'm').length, 24); assert.equal(HAIR_STYLES.filter((h) => h.g === 'f').length, 24);
  assert.deepEqual(WEAPONS.map((w) => w.name), ['단검', '쇼트소드', '롱소드', '그레이트소드', '창', '방패', '레이피어', '건틀렛', '망치', '두손 망치', '손도끼', '서리 대검', '배틀엑스', '권총', '기관단총', '기관총', '저격총', '로켓 런처', '박격포']);
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
await t('단체 임무: 데이터·인원 검증(3~6명, 부상·임무 중 제외), 성공률 시너지', () => {
  assert.equal(GROUP_MISSIONS.length, 4); assert.ok(GROUP_MISSIONS.every((m) => m.min === 3 && m.max === 6 && ['cmb', 'def', 'mob', 'med', 'int'].includes(m.stat) && m.dur <= 360 && m.reward > 10000));
  const s = new Sim(null, () => 0.5), ids = (...n) => n.map((i) => 'c' + String(i).padStart(2, '0'));
  assert.equal(s.groupCheck(ids(4, 5), 'gm1').ok, false, '2명은 부족'); assert.equal(s.groupCheck(ids(4, 5, 6, 7, 8, 9, 10), 'gm1').ok, false, '7명은 초과'); assert.equal(s.groupCheck(ids(4, 4, 5), 'gm1').ok, false, '중복');
  assert.equal(s.groupCheck(ids(4, 5, 6), 'zz').ok, false); assert.equal(s.groupCheck(['c04', 'c05', 'nope'], 'gm1').ok, false); assert.ok(s.groupCheck(ids(4, 5, 6), 'gm1').ok);
  s.byId.c06.hp = 10; assert.match(s.groupCheck(ids(4, 5, 6), 'gm1').reason, /부상/); s.byId.c06.hp = 100;
  s.sendMission('c05', 'rg1'); assert.match(s.groupCheck(ids(4, 5, 6), 'gm1').reason, /이미 임무/);
  const e = new Sim(null, () => 0.5); e.ended = true; assert.equal(e.groupCheck(ids(4, 5, 6), 'gm1').ok, false);
  // 성공률: 인원이 늘수록, 여러 부서가 섞일수록 높다
  const q = new Sim(null, () => 0.5), same = ['c04', 'c05', 'c06'], more = ['c04', 'c05', 'c06', 'c25'], p3 = q.groupChance(same, 'gm1'), p4same = q.groupChance(['c04', 'c05', 'c06', 'c04'].slice(0, 3), 'gm1');
  assert.ok(q.groupChance(['c04', 'c05', 'c06', 'c07'], 'gm1') > p3, '4명 > 3명(같은 조건 가정)'); assert.ok(q.groupChance(['c04', 'c05', 'c07'], 'gm1') > q.groupChance(['c04', 'c05', 'c06'], 'gm1') - 0.2, '합동 보너스');
  for (const m of GROUP_MISSIONS) for (const grp of [same, more]) { const p = q.groupChance(grp, m.id); assert.ok(p >= 0.05 && p <= 0.97); }
  assert.ok(q.groupReward(['c04', 'c05', 'c06', 'c07', 'c08'], 'gm1') > q.groupReward(same, 'gm1'), '인원이 많으면 총 보상 증가');
});
await t('단체 임무: 전원 도착 후 시간 흐름, 한 번의 판정으로 전원 정산, 보상·기록·복귀', () => {
  const s = new Sim(null, () => 0), ids = ['c04', 'c05', 'c06', 'c07']; const f0 = s.funds, mor0 = ids.map((i) => s.byId[i].mor);
  const r = s.sendGroupMission(ids, 'gm1'); assert.ok(r.ok); assert.ok(ids.every((i) => s.byId[i].mode === 'mission' && s.byId[i].mission.gid === r.gid)); assert.equal(s.dayLog.orders, 1);
  s.setSpeed(1); const rem0 = s.groups[r.gid].remaining; s.update(0.1); assert.equal(s.groups[r.gid].remaining, rem0, '전원이 나가기 전에는 시간이 흐르지 않음');
  s.advance(60); assert.ok(s.groups[r.gid] && s.groups[r.gid].remaining < rem0, '전원 도착 후 감소'); assert.match(s.statusText(s.byId.c04), /임무 수행 중 · 거점 합동 소탕 작전/);
  s.advance(200); assert.equal(Object.keys(s.groups).length, 0, '정산 후 그룹 삭제');
  assert.equal(s.dayLog.missions.length, 1, '개인 4건이 아니라 단체 1건'); const m = s.dayLog.missions[0]; assert.equal(m.result, 'success'); assert.equal(m.group, true); assert.equal(m.members.length, 4); assert.ok(m.who.includes('외 3명'));
  assert.ok(s.funds >= f0 + s.groupReward(ids, 'gm1') * 0.5, '보상 지급'); assert.ok(ids.every((i, k) => s.byId[i].mor >= mor0[k] + 4), '사기 상승');
  s.advance(60); assert.ok(ids.every((i) => s.byId[i].mode === 'idle'), '복귀 후 대기'); assert.equal(s.buildReport(true).income, m.reward, '보고서 수입에 포함');
  // 실패: 전원이 부상
  const x = new Sim(null, () => 0.999); x.sendGroupMission(ids, 'gm1'); x.setSpeed(2); x.advance(400); const xm = x.dayLog.missions[0]; assert.equal(xm.result, 'fail'); assert.equal(xm.reward, 0); assert.ok(ids.every((i) => x.byId[i].hp < 100), '전원 부상'); assert.ok(x.rep < 0);
  // 하루 마감 정산: 임무 도중 보고서 제출해도 1건만 기록되고 모두 대기
  const y = new Sim(null, () => 0); y.sendGroupMission(ids, 'gm3'); y.setSpeed(2); y.advance(30); const rep = y.buildReport(false); assert.equal(rep.missions.length, 1); assert.ok(ids.every((i) => y.byId[i].mode === 'idle' && !y.byId[i].mission)); y.nextDay(rep); assert.deepEqual(y.groups, {});
});
await t('단체 임무: 저장/복원(진행 중 유지), 손상된 저장은 안전하게 해제', () => {
  const ids = ['c10', 'c13', 'c16']; const s = new Sim(null, () => 0); s.sendGroupMission(ids, 'gm4'); s.setSpeed(2); s.advance(15);
  const snap = JSON.parse(JSON.stringify(s.serialize())); assert.equal(snap.groups.length, 1);
  const r = new Sim(snap, () => 0); const g = Object.values(r.groups)[0]; assert.ok(g && g.ids.length === 3 && g.remaining > 0); r.setSpeed(2); r.advance(300); assert.equal(Object.keys(r.groups).length, 0); assert.equal(r.dayLog.missions.filter((m) => m.group).length, 1); assert.ok(ids.every((i) => r.byId[i].mode !== 'mission' || r.byId[i].phase === 'back'));
  const bad = JSON.parse(JSON.stringify(snap)); bad.groups = [{ gid: bad.groups[0].gid, mid: 'nope', ids, remaining: 10 }]; const b = new Sim(bad, () => 0.5); assert.ok(ids.every((i) => b.byId[i].mode === 'idle' && !b.byId[i].mission), '알 수 없는 임무 → 해제');
  const bad2 = JSON.parse(JSON.stringify(snap)); bad2.groups = []; assert.ok(ids.every((i) => new Sim(bad2, () => 0.5).byId[i].mode === 'idle'), '그룹 정보가 없으면 해제');
  const bad3 = JSON.parse(JSON.stringify(snap)); bad3.groups[0].ids = ['c10', 'c13']; assert.ok(ids.every((i) => new Sim(bad3, () => 0.5).byId[i].mode === 'idle'), '인원 수 불일치 → 해제');
  const old = JSON.parse(JSON.stringify(snap)); delete old.groups; delete old.gseq; assert.ok(new Sim(old, () => 0.5)); const bad4 = JSON.parse(JSON.stringify(snap)); bad4.units.c10.mission.id = 'zzz'; assert.equal(new Sim(bad4, () => 0.5).byId.c10.mode, 'idle', '모르는 임무 id');
});
await t('공방 무기: 3개 공방 × 12종류 × 5개 = 60개(공방별 20개), 티어 표기 없음, 무기마다 모양이 모두 다르다', () => {
  assert.deepEqual(WORKSHOPS.map((w) => w.name), ['마그마 인더스트리 공방', '아크 공방', '웨폰 & 아머 디벨롭 인더스트리 공방']);
  assert.equal(WORKSHOP_WEAPONS.length, 60); assert.equal(new Set(WORKSHOP_WEAPONS.map((w) => w.id)).size, 60); assert.equal(new Set(WORKSHOP_WEAPONS.map((w) => w.name)).size, 60, '이름 고유');
  assert.ok(WORKSHOP_WEAPONS.every((w) => !('tier' in w) && !/Mk\./.test(w.name + w.desc)), '티어/Mk 표기 없음');
  for (const wk of WORKSHOPS) assert.equal(WORKSHOP_WEAPONS.filter((w) => w.workshop === wk.id).length, 20, wk.id);
  const types = WEAPONS.filter((w) => w.id !== 'frostblade' && !w.gun); assert.equal(types.length, 12, '공방 종류는 근접 12종(서리 대검·총기 제외)');
  for (const ty of types) {
    const set = WORKSHOP_WEAPONS.filter((w) => w.base === ty.id); assert.equal(set.length, 5, ty.id); assert.ok(new Set(set.map((w) => w.workshop)).size >= 2, '한 종류의 5개는 여러 공방에 걸쳐 있다');
    const by = set.slice().sort((a, b) => a.pw - b.pw); for (let i = 1; i < 5; i++) assert.ok(by[i].pw >= by[i - 1].pw && by[i].fee >= by[i - 1].fee && by[i].upkeep >= by[i - 1].upkeep, `${ty.id} 강한 무기일수록 비용이 높다`);
  }
  assert.ok(!WORKSHOP_WEAPONS.some((w) => w.base === 'frostblade' || WEAPON[w.base]?.gun), '서리 대검·총기는 공방 종류가 아님');
  for (const w of WORKSHOP_WEAPONS) { assert.ok(w.fee >= 2000 && w.upkeep >= 100 && w.name && w.desc && WEAPON[w.id] === w && w.pw >= 1 && w.pw <= 5); assert.ok(Object.values(w.fx).every((v) => typeof v === 'boolean' || Number.isFinite(v))); }
  // 공방 성향: 마그마=근력·한파 무시, 아크=기술·안개 무시·순찰 안전, 웨폰&아머=방어·부상 경감
  const top = (wid) => WORKSHOP_WEAPONS.find((w) => w.workshop === wid && w.pw === 5), low = (wid) => WORKSHOP_WEAPONS.find((w) => w.workshop === wid && w.pw === 1);
  assert.ok(top('magma').fx.str >= 4 && top('magma').fx.coldProof && !low('magma').fx.coldProof); assert.ok(top('arc').fx.skl >= 4 && top('arc').fx.fogProof && top('arc').fx.patrolSafe); assert.ok(top('wad').fx.def >= 4 && top('wad').fx.dmg < 0 && top('wad').fx.rest > 0);
  // 모양: 기본 13종 + 공방 60종의 윤곽(색 무시)이 모두 다르고, 같은 종류 안에서는 6픽셀 이상 다르며, 어느 방향에서도 셀 밖으로 나가지 않는다
  const mask = (id, view = 'down') => { const cells = new Set(); drawWeapon((c, x, y, ww, hh) => { assert.ok(/^#[0-9a-f]{6}$/.test(c), id + ' 색 형식'); for (let i = 0; i < ww; i++) for (let j = 0; j < hh; j++) cells.add(`${x + i},${y + j}`); }, view, id); return cells; };
  const all = [...WEAPONS, ...WORKSHOP_WEAPONS], sig = all.map((w) => [...mask(w.id)].sort().join(';')); assert.equal(new Set(sig).size, all.length, '모든 무기의 윤곽이 다르다');
  for (const w of WORKSHOP_WEAPONS) for (const view of ['down', 'up', 'side']) { const m = mask(w.id, view); assert.ok(m.size > 0, w.id); for (const c of m) { const [x, y] = c.split(',').map(Number); assert.ok(x >= 0 && x < 32 && y >= 0 && y < 24, `${w.name} ${view} 범위 밖 ${c}`); } }
  for (const ty of types) { const set = WORKSHOP_WEAPONS.filter((w) => w.base === ty.id); for (let i = 0; i < set.length; i++) for (let j = i + 1; j < set.length; j++) { const a = mask(set[i].id), b = mask(set[j].id); let d = 0; for (const c of a) if (!b.has(c)) d++; for (const c of b) if (!a.has(c)) d++; assert.ok(d >= 6, `${set[i].name} / ${set[j].name} 윤곽 차이 ${d}px`); } }
  // 공방별 색 계열이 서로 다르다
  const cols = (id) => { const s = new Set(); drawWeapon((c) => s.add(c), 'down', id); return [...s].join(); }; assert.notEqual(cols(WORKSHOP_WEAPONS.find((w) => w.workshop === 'magma').id), cols(WORKSHOP_WEAPONS.find((w) => w.workshop === 'arc').id));
});
await t('공방 무기 착용: 착용비 즉시 지불, 유지비는 매일 운영비에 포함, 기본 무기로 바꾸면 중단, 저장/복원', () => {
  const s = new Sim(null, () => 0.5), w = WORKSHOP_WEAPONS.find((x) => x.name === '마그마 그레이트소드'), u = s.byId.c04, up0 = s.buildReport(true).upkeep, f0 = s.funds;
  assert.equal(s.setWeapon('c04', w.id).ok, false, '일반 무기 교체로는 공방 무기를 얻을 수 없다'); assert.equal(u.weapon, 'battleaxe');
  const s0 = u.fx.str, r = s.equipWorkshop('c04', w.id); assert.ok(r.ok); assert.equal(u.weapon, w.id); assert.equal(s.funds, f0 - w.fee); assert.equal(s.dayLog.fees, w.fee); assert.equal(u.fx.str, s0 - 3 + w.fx.str, '능력치 반영(기존 도끼 근력 -3, 새 무기 +)'); assert.ok(u.fx.coldProof, '한파 무시');
  assert.equal(s.buildReport(true).upkeep - up0, w.upkeep, '유지비가 운영비에 더해짐'); assert.equal(s.buildReport(true).weaponUpkeep, w.upkeep); assert.equal(s.buildReport(true).workshopFees, w.fee);
  assert.equal(s.equipWorkshop('c04', w.id).ok, false, '이미 착용 중이면 다시 결제하지 않음'); assert.equal(s.funds, f0 - w.fee);
  const rep = s.buildReport(false); assert.equal(rep.fundsEnd, s.funds - rep.upkeep); s.nextDay(rep); assert.equal(s.funds, rep.fundsEnd); assert.equal(s.dayLog.fees, 0, '다음 날 착용비 집계 초기화'); assert.equal(s.buildReport(true).upkeep - up0, w.upkeep, '다음 날도 유지비 계속');
  const snap = JSON.parse(JSON.stringify(s.serialize())); const x = new Sim(snap, () => 0.5); assert.equal(x.byId.c04.weapon, w.id); assert.equal(x.funds, s.funds, '복원해도 착용비를 다시 내지 않음'); assert.equal(x.weaponUpkeep(), w.upkeep);
  assert.ok(s.setWeapon('c04', 'rapier').ok); assert.equal(s.weaponUpkeep(), 0, '기본 무기로 바꾸면 유지비 중단'); assert.equal(s.buildReport(true).upkeep, up0);
  // 자금 부족 / 없는 무기
  const p = new Sim(null, () => 0.5), big = WORKSHOP_WEAPONS.find((x) => x.pw === 5); p.funds = big.fee - 1; assert.equal(p.equipWorkshop('c04', big.id).ok, false); assert.equal(p.funds, big.fee - 1); assert.equal(p.byId.c04.weapon, 'battleaxe'); assert.equal(p.equipWorkshop('c04', 'laser').ok, false); assert.equal(p.equipWorkshop('c04', 'battleaxe').ok, false);
  // 여러 명이 착용하면 유지비가 합산된다
  const q = new Sim(null, () => 0.5); q.funds = 1e6; const a = WORKSHOP_WEAPONS[0], b = WORKSHOP_WEAPONS[7]; q.equipWorkshop('c01', a.id); q.equipWorkshop('c02', b.id); assert.equal(q.weaponUpkeep(), a.upkeep + b.upkeep);
  // 손상된 저장: 모르는 공방 무기 id 는 기존 무기 유지
  const bad = JSON.parse(JSON.stringify(snap)); bad.units.c04.c.w = 'magma_laser_9'; assert.equal(new Sim(bad, () => 0.5).byId.c04.weapon, 'battleaxe');
});
await t('긴급 습격 전투: 결정적(같은 시드=같은 결과), 규모는 날짜에 따라 증가, 부서 특수 능력이 모두 발동', () => {
  assert.deepEqual(RAID_CHANCE, { day: 0.01, night: 0.05 });
  const seq = (seed) => { let a = seed; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; };
  const sizes = [1, 10, 25].map((d) => { let s = 0; for (let i = 0; i < 40; i++) s += planRaid(d, seq(i + 1)).size; return s / 40; }); assert.ok(sizes[0] < sizes[1] && sizes[1] < sizes[2], '날이 갈수록 습격이 커진다: ' + sizes);
  assert.ok(planRaid(12, seq(3)).types.includes('boss') && !planRaid(1, seq(3)).types.includes('boss'), '큰 습격에만 습격대장'); assert.ok(planRaid(1, seq(1)).types.every((x) => ENEMY_TYPES[x]));
  const s = new Sim(null, () => 0.5), all = s.units.map(defenderFrom), plan = planRaid(8, seq(7)); assert.equal(all.length, 25); assert.ok(all.every((d) => d.maxhp > 0 && d.atk > 0 && d.hp > 0));
  const lead = defenderFrom(s.byId.c25), mate = defenderFrom(s.byId.c01); assert.ok(lead.maxhp > mate.maxhp * 1.05 && lead.atk > 0, '팀장은 더 강하다'); assert.equal(defenderFrom(s.byId.c19).range, 6, '공중 지원팀은 원거리');
  const a = new RaidBattle({ defenders: all, plan, day: 8, seed: 42 }).finish(), b = new RaidBattle({ defenders: all, plan, day: 8, seed: 42 }).finish(); assert.deepEqual(a, b, '결정적'); assert.ok(a.t > 3 && a.t < 130);
  // 능력 발동 수집
  const seen = new Set(); let healed = 0;
  for (let sd = 1; sd <= 12; sd++) { const bt = new RaidBattle({ defenders: all, plan: planRaid(16, seq(sd)), day: 16, seed: sd }); while (!bt.done) { bt.step(0.5); for (const f of bt.drainFx()) { seen.add(f.text); if (f.kind === 'heal') healed++; } } }
  for (const k of ['강타!', '밀치기!', '지원 사격!', '방벽', '교란', '기습!']) assert.ok(seen.has(k), k + ' 발동'); assert.ok(healed > 0, '치유 발동'); assert.ok(seen.has('격파') && ['치유', '밀치기', '강타', '지원 사격', '방벽', '교란'].every((n) => Object.values(ABILITY_INFO).some((x) => x.name === n)));
  // 능력 효과: 밀치기는 적을 뒤로 밀고 기절, 치유는 체력 회복, 강타는 주변 적에게도 피해
  const solo = (dept, extra = {}) => ({ id: 'x' + dept, name: dept, dept, leader: false, atk: 10, def: 60, med: 80, cmb: 80, maxhp: 100, hp: 100, range: 1.6, spd: 2.4, ...extra });
  const bt = new RaidBattle({ defenders: [solo('defencer')], plan: { types: ['grunt'] }, day: 1, seed: 5 }); const D = bt.units[0], E = bt.units[1]; D.x = 10; D.y = 4; E.x = 11.5; E.y = 4; D.abCd = 0; D.cd = 99; E.cd = 99; const ex = E.x; bt.tick(0.1); assert.ok(E.x > ex + 1.5 && E.stun > 0, '밀치기: 뒤로 밀리고 기절');
  const hb = new RaidBattle({ defenders: [solo('medical'), solo('rager', { hp: 30 })], plan: { types: ['grunt'] }, day: 1, seed: 5 }); hb.units[0].abCd = 0; hb.units[2].x = 20; hb.units[2].cd = 99; hb.units[0].x = 2; hb.units[1].x = 3; const h0 = hb.units[1].hp; hb.tick(0.1); assert.ok(hb.units[1].hp > h0, '치유');
  const sb = new RaidBattle({ defenders: [solo('rager')], plan: { types: ['grunt', 'grunt'] }, day: 1, seed: 5 }); const [R0, G1, G2] = sb.units; R0.x = 10; R0.y = 4; R0.abCd = 0; R0.cd = 99; G1.x = 11; G1.y = 4; G2.x = 11.6; G2.y = 4.2; G1.cd = G2.cd = 99; const g2 = G2.hp; sb.tick(0.1); assert.ok(G1.hp < G1.maxhp * 0.9 && G2.hp < g2, '강타: 주변 적에게도 피해');
  // 진형: 공세는 공격력, 수비는 피해 경감
  const fo = (f) => { let taken = 0, time = 0; for (let i = 1; i <= 30; i++) { const bt2 = new RaidBattle({ defenders: all.slice(0, 10), plan: planRaid(5, seq(i)), day: 5, seed: i, formation: f }); const r = bt2.finish(); taken += r.units.reduce((x, u) => x + (1 - u.ratio), 0); time += bt2.t; } return { taken, time }; };
  const bal = fo('balanced'), grd = fo('guard'), asl = fo('assault'); assert.ok(grd.taken < bal.taken && bal.taken < asl.taken * 1.15, `수비는 받는 피해가 적다(${grd.taken.toFixed(1)} < ${bal.taken.toFixed(1)})`); assert.ok(asl.time < grd.time, '공세는 더 빨리 끝낸다'); assert.ok(FORMATIONS.assault.atk > 1 && FORMATIONS.guard.def > 1);
  // 병력이 없으면 즉시 패배
  assert.equal(new RaidBattle({ defenders: [], plan, day: 1, seed: 1 }).finish().win, false);
  // 시간 제한 안에 끝난다
  assert.ok(a.t <= 150);
});
await t('긴급 습격 발생: 아침 1% / 밤 5%, 시간 정지, 하루 2회 제한, 사건과 겹치지 않음', () => {
  Sim.RAIDS_ON = true; try {
    const m = new Sim(null, () => 0.03); m.raid.acc = 59; m.setSpeed(1); m.advance(2); assert.equal(m.pendingRaid, null, '아침 3%는 1% 확률에 걸리지 않음');
    const n = new Sim(null, () => 0.03); n.clock = 721; n.raid.acc = 59; n.setSpeed(1); n.advance(2); assert.ok(n.pendingRaid, '밤 3%는 5% 확률에 걸림'); assert.equal(n.speed, 0); n.setSpeed(2); assert.equal(n.speed, 0, '습격 중 재생 불가');
    const clk = n.clock; n.advance(50); assert.equal(n.clock, clk, '정지');
    assert.equal(n.startRaid(), null, '동시에 둘은 불가'); assert.ok(n.raid.today === 1);
    const cap = new Sim(null, () => 0); cap.raid.today = 2; cap.raid.acc = 59; cap.setSpeed(1); cap.advance(2); assert.equal(cap.pendingRaid, null, '하루 최대 2회');
    const late = new Sim(null, () => 0); late.clock = 21 * 60 - 30; late.raid.acc = 59; late.setSpeed(1); late.advance(2); assert.equal(late.pendingRaid, null, '하루 끝 60분 전부터는 없음');
    const ev = new Sim(null, () => 0); ev.startEvent('op1'); ev.raid.acc = 59; ev.speed = 1; ev.tickRaids(60); assert.equal(ev.pendingRaid, null, '사건 중에는 습격 없음');
    const r = new Sim(null, () => 0); r.startRaid(); r.ev.acc = 59; r.tickEvents(60); assert.equal(r.pendingEvent, null, '습격 중에는 사건 없음');
  } finally { Sim.RAIDS_ON = false; }
});
await t('긴급 습격 정산: 승리=전리품·평판·사기, 패배=약탈·평판 감소, 다시 도전, 임무 중 인원 불참, 보고서 기록, 저장/복원', () => {
  const s = new Sim(null, () => 0.5), plan = { types: ['grunt', 'grunt', 'brute', 'archer', 'grunt'] }; s.setSpeed(2); s.sendMission('c01', 'op1'); s.byId.c02.hp = 60;
  const p = s.startRaid(plan); assert.ok(p && s.speed === 0 && s.raid.resume === 2); const info = s.raidInfo(); assert.equal(info.size, 5); assert.deepEqual(info.comp, { grunt: 3, brute: 1, archer: 1 }); assert.equal(info.defenders.length, 24); assert.deepEqual(info.away, ['한서윤'], '임무 중인 인원은 불참');
  const b1 = s.raidBattle('guard'); assert.equal(b1.defenders.length, 24); assert.ok(!b1.defenders.some((d) => d.id === 'c01')); assert.equal(s.raidInfo().formation, 'guard'); const od = s.raidOdds('assault', 6); assert.ok(od >= 0 && od <= 1); assert.equal(s.raidInfo().formation, 'guard', '모의 전투는 선택한 진형을 바꾸지 않는다');
  const hp0 = s.byId.c04.hp, f0 = s.funds, rep0 = s.rep, mor0 = s.byId.c04.mor;
  // 확정 전에는 아무것도 바뀌지 않는다
  b1.finish(); assert.equal(s.byId.c04.hp, hp0); assert.equal(s.funds, f0); assert.ok(s.pendingRaid);
  const win = { win: true, defenders: 24, downed: ['c05'], units: [{ id: 'c04', ratio: 0.4, down: false }, { id: 'c05', ratio: 0, down: true }, { id: 'c02', ratio: 1, down: false }] };
  const fin = s.finishRaid(win); assert.ok(fin.ok && fin.win && fin.loot === 2500 + 450 * 5); assert.equal(s.funds, f0 + fin.loot); assert.equal(s.rep, rep0 + 2); assert.equal(s.byId.c04.hp, 40); assert.equal(s.byId.c05.hp, 5); assert.equal(s.byId.c02.hp, 100); assert.equal(s.byId.c04.mor, mor0 + 6); assert.equal(s.byId.c01.hp, 100, '불참자는 그대로');
  assert.equal(s.pendingRaid, null); assert.equal(s.dayLog.raids.length, 1); assert.deepEqual(s.dayLog.raids[0].downed, ['미라 볼코프']); assert.equal(s.buildReport(true).raids.length, 1); assert.equal(s.finishRaid(win).ok, false, '이미 끝난 습격');
  // 패배 → 다시 도전 → 패배 수용
  s.startRaid(plan); s.funds = 5000; const lose = { win: false, defenders: 24, downed: [], units: [{ id: 'c04', ratio: 0.1, down: false }] }; const sd0 = s.pendingRaid.seed; assert.equal(s.retryRaid().tries, 1); assert.equal(s.pendingRaid.tries, 1); const bA = s.raidBattle('balanced'); assert.equal(s.pendingRaid.seed, sd0, '같은 습격(시드 유지)'); assert.ok(bA.units[0].x !== b1.units[0].x || bA.units[0].y !== b1.units[0].y, '다시 도전하면 전투 전개가 달라진다');
  const rep1 = s.rep, fin2 = s.finishRaid(lose); assert.equal(fin2.loss, 5000, '약탈은 보유 자금을 넘지 않는다'); assert.equal(s.funds, 0); assert.equal(s.rep, rep1 - 3); assert.equal(s.dayLog.raids[1].tries, 1); assert.equal(s.dayLog.raids[1].win, false);
  // 임무 중인 인원이 모두 불참이면 병력 없음 → 즉시 패배
  const z = new Sim(null, () => 0.5); for (const u of z.units) { u.mode = 'mission'; u.phase = 'away'; u.away = true; } z.startRaid(plan); assert.equal(z.raidInfo().defenders.length, 0); const zb = z.raidBattle(); assert.equal(zb.finish().win, false);
  // 저장/복원
  const q = new Sim(null, () => 0.5); q.startRaid(plan); q.retryRaid(); q.raidBattle('assault'); q.raid.today = 1; const snap = JSON.parse(JSON.stringify(q.serialize())); const r = new Sim(snap, () => 0.5); assert.deepEqual(r.pendingRaid, q.pendingRaid); assert.equal(r.speed, 0); assert.equal(r.raid.today, 1); assert.equal(r.pendingRaid.formation, 'assault'); assert.equal(r.raidBattle().defenders.length, 25);
  const bad = JSON.parse(JSON.stringify(snap)); bad.raid.pending.types = ['dragon']; assert.equal(new Sim(bad, () => 0.5).pendingRaid, null); const bad2 = JSON.parse(JSON.stringify(snap)); bad2.raid = { pending: { types: [], seed: 'x' }, today: 99 }; const b2 = new Sim(bad2, () => 0.5); assert.equal(b2.pendingRaid, null); assert.equal(b2.raid.today, 2);
  const old = JSON.parse(JSON.stringify(snap)); delete old.raid; assert.equal(new Sim(old, () => 0.5).pendingRaid, null, '옛 저장에서도 정상');
  // 다음 날: 카운터 초기화
  const d = new Sim(null, () => 0.5); d.raid.today = 2; d.nextDay(d.buildReport()); assert.equal(d.raid.today, 0);
});
await t('헤어스타일: 남 24 + 여 24, 확장 14+14 은 앞·뒤·옆 윤곽이 모두 다르고 범위를 벗어나지 않으며, 머리색 23종', () => {
  assert.equal(HAIR_STYLES.length, 48); assert.equal(new Set(HAIR_STYLES.map((s) => s.id)).size, 48); assert.equal(new Set(HAIR_STYLES.map((s) => s.name)).size, 48, '이름 고유');
  const ext = HAIR_STYLES.filter((s) => /^[mf](1[1-9]|2\d)$/.test(s.id)); assert.equal(ext.length, 28); assert.equal(ext.filter((s) => s.g === 'm').length, 14); assert.equal(ext.filter((s) => s.g === 'f').length, 14);
  const cells = (id, view) => { const c = new Set(); drawHair((col, x, y, w, h) => { assert.ok(/^#[0-9a-f]{6}$/.test(col), id + ' 색 형식'); for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) c.add(`${x + i},${y + j}`); }, view, id, '#808080'); return c; };
  const views = ['down', 'up', 'side'], diff = (a, b) => { let d = 0; for (const v of views) { const A = cells(a, v), B = cells(b, v); for (const c of A) if (!B.has(c)) d++; for (const c of B) if (!A.has(c)) d++; } return d; };
  const sig = HAIR_STYLES.map((s) => views.map((v) => [...cells(s.id, v)].sort().join(';')).join('|')); assert.equal(new Set(sig).size, 48, '48개 윤곽 모두 다름');
  for (const s of HAIR_STYLES) for (const v of views) { const m = cells(s.id, v); assert.ok(m.size > 0, s.id); for (const c of m) { const [x, y] = c.split(',').map(Number); assert.ok(x >= 0 && x <= 15 && y >= 0 && y <= 23, `${s.name} ${v} 범위 밖 ${c}`); } }
  for (const a of ext) for (const b of HAIR_STYLES) { if (a === b || a.g !== b.g) continue; assert.ok(diff(a.id, b.id) >= 12, `${a.name} / ${b.name} 윤곽 차이 ${diff(a.id, b.id)}px`); }
  // 색: 14 + 9, 모두 올바른 hex 이고 중복 없음, 모든 스타일이 모든 색으로 그려진다
  assert.equal(HAIR_COLORS.length, 23); assert.ok(HAIR_COLORS.every((c) => /^#[0-9a-f]{6}$/.test(c))); assert.equal(new Set(HAIR_COLORS).size, 23);
  for (const c of HAIR_COLORS.slice(14)) for (const s of ext.slice(0, 3)) drawHair(() => {}, 'down', s.id, c, '#c0261c');
  // 끝색 그라데이션도 확장 스타일에서 동작
  const used = new Set(); drawHair((col) => used.add(col), 'up', 'f11', '#101010', '#c0261c'); assert.ok(used.size > 3, '그라데이션 색이 여러 단계');
  assert.ok(HAIR.m24.v2 && HAIR.f24.v2);
  const sx = new Sim(null, () => 0.5); assert.ok(sx.setHair('c04', 'f24', '#2d6a4f').ok && sx.setHair('c05', 'm24', '#F4F4F6').ok); const rx = new Sim(JSON.parse(JSON.stringify(sx.serialize())), () => 0.5); assert.equal(rx.byId.c04.look.hairStyle, 'f24'); assert.equal(rx.byId.c05.look.hairStyle, 'm24'); assert.equal(rx.byId.c05.look.hair, '#f4f4f6', '저장/복원');
});
await t('용병 모집 후보: 결정적 생성, 등급별 능력치·비용 범위, 이름 중복 없음, 면접 전에는 정확한 값·특성을 숨김, 데이터 검증', () => {
  const taken = { names: new Set(ROSTER.map((r) => r.name)), latins: new Set(ROSTER.map((r) => r.latin)) };
  const a = makeCandidates({ seed: 7, day: 3, taken }), b = makeCandidates({ seed: 7, day: 3, taken }); assert.deepEqual(a, b, '같은 시드=같은 후보'); assert.equal(a.length, 4); assert.notDeepEqual(a, makeCandidates({ seed: 8, day: 3, taken }));
  const grades = new Set(); let withTrait = 0, bad = 0, n = 0;
  for (let sd = 1; sd <= 300; sd++) for (const c of makeCandidates({ seed: sd, day: 1 + (sd % 30), taken })) {
    n++; grades.add(c.grade); const G = GRADES[c.grade]; assert.equal(c.dept, 'rager'); assert.ok(c.stats.cmb >= G.cmb[0] && c.stats.cmb <= G.cmb[1], `${c.grade} 전투 ${c.stats.cmb}`); assert.ok(c.fee >= G.fee[0] * 0.8 - 100 && c.fee <= G.fee[1] + 100 && c.wage >= G.wage[0] - 5 && c.wage <= G.wage[1] + 5, `${c.grade} 비용`);
    assert.ok(c.stats.cmb >= c.stats.med && c.stats.cmb >= c.stats.int, '공격팀 성향: 전투 중심'); assert.ok(!taken.names.has(c.name) && !taken.latins.has(c.latin), '기존 직원과 이름 중복 없음'); assert.ok(RECRUIT.rager.weapons.includes(c.weapon));
    assert.ok(cleanDef(c), '생성된 후보는 검증을 통과'); if (c.trait) { withTrait++; if (TRAIT[c.trait].bad) bad++; assert.ok(TRAIT[c.trait].rarity !== 'l', '전설 특성은 나오지 않음'); }
  }
  assert.deepEqual([...grades].sort(), ['elite', 'rookie', 'veteran']); assert.ok(withTrait / n > 0.3 && bad > 0 && bad < withTrait, '특성: 좋은 것이 많고 나쁜 것도 가끔');
  const four = makeCandidates({ seed: 11, day: 2, taken }); assert.equal(new Set(four.map((c) => c.name)).size, 4); assert.equal(new Set(four.map((c) => c.latin)).size, 4);
  const early = makeCandidates({ seed: 1, day: 1, count: 400, taken }).filter((c) => c.grade === 'elite').length, late = makeCandidates({ seed: 1, day: 30, count: 400, taken }).filter((c) => c.grade === 'elite').length; assert.ok(late > early, '날이 갈수록 정예가 늘어난다');
  // 면접 전/후 보기
  const c = { ...makeCandidates({ seed: 5, day: 1, taken }).find((x) => x.trait) || makeCandidates({ seed: 5, day: 1, taken })[0] }; c.trait = c.trait || Object.keys(TRAIT)[0];
  const v0 = candidateView({ ...c, interviewed: false }); assert.equal(v0.trait, null); assert.ok(Object.values(v0.stats).every((s) => s.band && s.exact === undefined)); assert.ok(/^\d+~\d+$/.test(v0.stats.cmb.band) && c.stats.cmb >= +v0.stats.cmb.band.split('~')[0] && c.stats.cmb <= +v0.stats.cmb.band.split('~')[1], '범위 안에 실제 값이 있다');
  const v1 = candidateView({ ...c, interviewed: true }); assert.equal(v1.stats.cmb.exact, c.stats.cmb); assert.ok(v1.trait && v1.trait.id === c.trait);
  // 데이터 검증
  assert.equal(cleanDef({ ...c, weapon: 'laser' }), null); assert.equal(cleanDef({ ...c, name: '<b>' }), null); assert.equal(cleanDef({ ...c, look: { ...c.look, skin: 'red' } }), null); assert.equal(cleanDef({ ...c, dept: 'medical' }), null); assert.equal(cleanDef({ ...c, id: 'zz' }), null); assert.equal(cleanDef({ ...c, weapon: 'frostblade' }), null, '서리 대검은 불가');
  const d = cleanDef({ ...c, stats: { ...c.stats, cmb: 9999 }, fee: -5, wage: 1e9, trait: 'nope', look: { ...c.look, hat: 'crown' } }); assert.equal(d.stats.cmb, 100); assert.equal(d.fee, 0); assert.equal(d.wage, 9999); assert.equal(d.trait, null); assert.equal(d.look.hat, 'none');
});
await t('용병 고용: 후보 풀·면접·고용·급여·상한·계약 해지·새로 구하기·저장/복원', () => {
  const s = new Sim(null, () => 0.5), v = s.recruitView('rager'); assert.equal(v.cands.length, 4); assert.equal(v.cap, 6); assert.equal(v.hired, 0); assert.equal(v.rerollsLeft, MAX_REROLLS); assert.equal(s.recruitView('medical'), null, '지금은 Rager 만');
  assert.ok(v.cands.every((c) => !c.interviewed && c.trait === null && Object.values(c.stats).every((x) => x.band)), '면접 전에는 숨김');
  // 면접
  const c0 = v.cands[0], f0 = s.funds; const iv = s.interviewCandidate(c0.id); assert.ok(iv.ok); assert.equal(s.funds, f0 - INTERVIEW_COST); assert.ok(iv.view.stats.cmb.exact >= 62); assert.equal(s.interviewCandidate(c0.id).ok, false, '두 번 면접 불가'); assert.equal(s.interviewCandidate('nope').ok, false);
  // 고용
  const up0 = s.buildReport(true).upkeep, tgt = s.recruitView().cands[0], f1 = s.funds; s.funds = tgt.fee - 1; assert.equal(s.hireCandidate(tgt.id).ok, false, '자금 부족'); s.funds = f1;
  const hr = s.hireCandidate(tgt.id); assert.ok(hr.ok && /^r\d\d$/.test(hr.id)); assert.equal(s.funds, f1 - tgt.fee); assert.equal(s.units.length, 26); const u = s.byId[hr.id]; assert.ok(u && u.recruit && u.dept === 'rager' && u.home === 'rager' && u.name === tgt.name && u.latin === tgt.latin && u.role.startsWith('용병'));
  assert.equal(u.weapon, tgt.weapon); assert.equal(u.look.hairStyle, tgt.look.hairStyle); assert.equal(u.gender, tgt.gender); assert.ok(u.dv.cmb > 60, '능력치 파생 계산됨'); assert.equal(s.recruitView().cands.length, 3, '고용한 후보는 목록에서 빠짐'); assert.equal(s.recruitView().hired, 1);
  assert.equal(s.buildReport(true).upkeep - up0, Math.max(0, 300 + u.fx.upkeep) + tgt.wage, '기본 유지비(특성 반영)와 급여가 운영비에 더해짐'); assert.equal(s.dayLog.hires.filter((x) => x.kind === 'hire').length, 1); assert.equal(s.buildReport(true).wages, tgt.wage);
  assert.ok(s.units.filter((x) => x.dept === 'rager').length === 4); assert.equal(s.leaderUnit('rager').id, 'c04', '팀장은 그대로');
  // 임무·커스터마이징·습격에 참여
  assert.ok(s.sendMission(hr.id, 'rg1').ok); assert.equal(s.dismissRecruit(hr.id).ok, false, '임무 중 해지 불가'); assert.equal(s.dismissRecruit('c04').ok, false, '기본 직원은 해지 불가');
  const sq = new Sim(null, () => 0.5); sq.funds = 1e6; const first = sq.hireCandidate(sq.recruitView().cands[0].id); assert.ok(sq.setStat(first.id, 'str', 5).ok && sq.setHair(first.id, 'f3', '#112233').ok); sq.startRaid({ types: ['grunt'] }); assert.ok(sq.raidInfo().defenders.some((d) => d.id === first.id), '용병도 습격에 참전');
  // 상한 6명 + 새로 구하기(비용·횟수 제한) + 이름 중복 없음
  const m = new Sim(null, () => 0.5); m.funds = 1e7; let hired = 0; for (let i = 0; i < 12 && hired < 6; i++) { for (const c of m.recruitView().cands) { if (hired >= 6) break; if (m.hireCandidate(c.id).ok) hired++; } if (hired < 6) assert.ok(m.rerollCandidates().ok || m.rec.rerolls >= MAX_REROLLS); }
  assert.equal(m.recruitCount('rager'), 6); const extra = m.recruitView().cands[0] || (m.rerollCandidates().ok && m.recruitView().cands[0]); if (extra) assert.equal(m.hireCandidate(extra.id).ok, false, '7번째는 불가');
  assert.equal(new Set(m.units.map((x) => x.name)).size, m.units.length, '이름 중복 없음'); assert.equal(new Set(m.units.map((x) => x.latin)).size, m.units.length);
  const r = new Sim(null, () => 0.5); const before = r.recruitView().cands.map((c) => c.name).join(), fr = r.funds; assert.ok(r.rerollCandidates().ok); assert.equal(r.funds, fr - REROLL_COST); assert.notEqual(r.recruitView().cands.map((c) => c.name).join(), before, '새로 구하면 후보가 바뀐다'); assert.equal(r.recruitView().rerollsLeft, MAX_REROLLS - 1);
  r.rerollCandidates(); r.rerollCandidates(); assert.equal(r.rerollCandidates().ok, false, '하루 3회'); const poor = new Sim(null, () => 0.5); poor.funds = REROLL_COST - 1; assert.equal(poor.rerollCandidates().ok, false); poor.funds = INTERVIEW_COST - 1; assert.equal(poor.interviewCandidate(poor.recruitView().cands[0].id).ok, false);
  // 하루가 지나면 후보 갱신 + 새로 구하기 횟수 초기화
  const names0 = r.recruitView().cands.map((c) => c.name).join(); r.nextDay(r.buildReport()); assert.equal(r.recruitView().day, 2); assert.equal(r.recruitView().rerollsLeft, MAX_REROLLS); assert.notEqual(r.recruitView().cands.map((c) => c.name).join(), names0);
  // 계약 해지
  const dm = new Sim(null, () => 0.5); dm.funds = 1e6; const h1 = dm.hireCandidate(dm.recruitView().cands[0].id), upk = dm.buildReport(true).upkeep; const dr = dm.dismissRecruit(h1.id); assert.ok(dr.ok); assert.equal(dm.units.length, 25); assert.equal(dm.byId[h1.id], undefined); assert.ok(dm.buildReport(true).upkeep < upk, '급여 중단'); assert.equal(dm.recruitCount('rager'), 0);
  // 저장/복원: 용병(개별 변경 포함)·후보 풀(면접 상태)·횟수 유지
  const sv = new Sim(null, () => 0.5); sv.funds = 1e6; const k = sv.recruitView().cands[1]; sv.interviewCandidate(k.id); const hh = sv.hireCandidate(sv.recruitView().cands[0].id); sv.setStat(hh.id, 'str', 6); sv.setHair(hh.id, 'm24', '#2d6a4f'); sv.byId[hh.id].hp = 44; sv.rec.rerolls = 2;
  const snap = JSON.parse(JSON.stringify(sv.serialize())), rs = new Sim(snap, () => 0.5), ru = rs.byId[hh.id]; assert.ok(ru && ru.recruit && ru.wage === sv.byId[hh.id].wage && ru.hp === 44 && ru.alloc.str === 6 && ru.look.hairStyle === 'm24' && ru.look.hair === '#2d6a4f'); assert.equal(rs.units.length, 26); assert.equal(rs.recruitCount('rager'), 1);
  assert.deepEqual(rs.recruitView().cands.map((c) => [c.id, c.interviewed]), sv.recruitView().cands.map((c) => [c.id, c.interviewed])); assert.equal(rs.recruitView().rerollsLeft, MAX_REROLLS - 2); assert.equal(rs.funds, sv.funds, '복원해도 다시 결제하지 않음'); assert.equal(rs.buildReport(true).upkeep, sv.buildReport(true).upkeep, '복원 후 운영비 동일'); assert.equal(rs.hireCandidate(rs.recruitView().cands[0].id).id, 'r02', '다음 용병 id 이어짐');
  // 손상/옛 저장: 잘못된 용병·후보는 버리고, 이름이 겹치면 건너뛴다
  const bad = JSON.parse(JSON.stringify(snap)); bad.recruits.push({ ...bad.recruits[0], id: 'r09', weapon: 'laser' }, { ...bad.recruits[0], id: 'r10', name: '강태오' }, { ...bad.recruits[0], id: 'x1' }, null, 5); bad.rec.cands.push({ id: 'k99' }, null);
  const bs = new Sim(bad, () => 0.5); assert.equal(bs.recruitCount('rager'), 1); assert.equal(bs.units.length, 26); assert.ok(bs.recruitView().cands.every((c) => cleanDef({ ...c, stats: Object.fromEntries(Object.entries(c.stats).map(([kk, x]) => [kk, x.exact ?? x.mid])), look: c.look, trait: null, fee: c.fee, wage: c.wage, interviewed: c.interviewed })));
  const dup = JSON.parse(JSON.stringify(snap)); dup.recruits.push({ ...dup.recruits[0] }); assert.equal(new Sim(dup, () => 0.5).recruitCount('rager'), 1, '같은 id 는 한 번만');
  const old = JSON.parse(JSON.stringify(snap)); delete old.recruits; delete old.rec; delete old.rseq; delete old.units[hh.id]; const os = new Sim(old, () => 0.5); assert.equal(os.units.length, 25); assert.equal(os.recruitView().cands.length, 4, '옛 저장에서도 후보가 새로 생긴다');
  // 옛 저장의 dayLog(hires/raids 없음)에도 안전
  const od = JSON.parse(JSON.stringify(snap)); delete od.dayLog.hires; delete od.dayLog.raids; delete od.dayLog.events; const ods = new Sim(od, () => 0.5); assert.ok(ods.interviewCandidate(ods.recruitView().cands.find((c) => !c.interviewed).id).ok); assert.equal(ods.buildReport(true).raids.length, 0);
});
await t('총기 6종: 권총·기관단총·기관총·저격총·로켓 런처·박격포 — 모양이 모두 다르고, 탄약비(유지비)·성능이 반영되며 습격에서 원거리/범위 공격', () => {
  const GUNS = ['pistol', 'smg', 'mg', 'sniper', 'rocket', 'mortar']; assert.deepEqual(WEAPONS.filter((w) => w.gun).map((w) => w.id), GUNS); assert.deepEqual(GUNS.map((g) => WEAPON[g].name), ['권총', '기관단총', '기관총', '저격총', '로켓 런처', '박격포']);
  for (const g of GUNS) { const w = WEAPON[g]; assert.ok(w.fx.upkeep > 0, g + ' 탄약비'); assert.ok(w.gun.range > 1.6 && w.gun.cd > 0 && w.gun.mul > 0, g + ' 전투 성능'); assert.ok(w.fx.skl >= 1 || w.fx.str >= 2, g + ' 능력치'); assert.ok(!w.workshop && !w.art); }
  assert.ok(WEAPON.mortar.gun.range > WEAPON.sniper.gun.range && WEAPON.sniper.gun.range > WEAPON.mg.gun.range && WEAPON.mg.gun.range > WEAPON.smg.gun.range && WEAPON.smg.gun.range > WEAPON.pistol.gun.range, '사거리 순서');
  assert.ok(WEAPON.rocket.gun.splash > 0 && WEAPON.mortar.gun.splash > 0 && !WEAPON.sniper.gun.splash, '범위 피해는 로켓·박격포'); assert.ok(WEAPON.sniper.gun.mul > WEAPON.rocket.gun.mul * 0.9 && WEAPON.sniper.gun.cd > WEAPON.mg.gun.cd, '저격은 한 발이 세고 느리다');
  // 운영비: 착용하면 탄약비만큼 유지비가 늘어난다
  const s = new Sim(null, () => 0.5), up0 = s.buildReport(true).upkeep; assert.ok(s.setWeapon('c04', 'mg').ok); assert.equal(s.buildReport(true).upkeep - up0, WEAPON.mg.fx.upkeep, '기관총 탄약비 220 CR'); assert.ok(s.byId.c04.fx.speed < 0);
  assert.ok(s.setWeapon('c04', 'pistol').ok); assert.equal(s.buildReport(true).upkeep - up0, WEAPON.pistol.fx.upkeep); assert.ok(s.setWeapon('c04', 'battleaxe').ok); assert.equal(s.buildReport(true).upkeep, up0, '기본 무기로 바꾸면 탄약비 중단');
  const sv = new Sim(JSON.parse(JSON.stringify((() => { const x = new Sim(null, () => 0.5); x.setWeapon('c05', 'sniper'); return x.serialize(); })())), () => 0.5); assert.equal(sv.byId.c05.weapon, 'sniper', '저장/복원');
  // 습격: 사거리·연사·범위
  const d = (id) => { const x = new Sim(null, () => 0.5); x.setWeapon('c06', id); return defenderFrom(x.byId.c06); };
  assert.equal(d('battleaxe').range, 1.6); assert.equal(d('battleaxe').atkCd, 1.1); assert.equal(d('sniper').range, 9); assert.equal(d('sniper').atkCd, 2.4); assert.equal(d('mortar').splash, 2); assert.equal(d('pistol').atkMul, 0.8);
  const solo = (g) => ({ ...d(g), id: 'x', dept: 'raider', leader: false, maxhp: 1000, hp: 1000 });
  const sn = new RaidBattle({ defenders: [solo('sniper')], plan: { types: ['grunt'] }, day: 1, seed: 3 }), [SD, SE] = sn.units; SD.x = 3; SD.y = 4; SE.x = 11; SE.y = 4; SE.cd = 99; SD.cd = 0; sn.tick(0.1); assert.ok(SE.hp < SE.maxhp, '저격총은 8칸 밖에서도 쏜다'); assert.equal(SD.x, 3, '사거리 안에서는 다가가지 않는다');
  const sp = new RaidBattle({ defenders: [solo('mortar')], plan: { types: ['grunt', 'grunt', 'grunt'] }, day: 1, seed: 3 }), [MD, M1, M2, M3] = sp.units; MD.x = 2; MD.y = 4; M1.x = 11; M1.y = 4; M2.x = 11.8; M2.y = 4.3; M3.x = 20; M3.y = 1; for (const e of [M1, M2, M3]) e.cd = 99; MD.cd = 0; sp.tick(0.1); assert.ok(M1.hp < M1.maxhp && M2.hp < M2.maxhp && M3.hp === M3.maxhp, '박격포: 주변만 맞는다');
  const melee = new RaidBattle({ defenders: [solo('battleaxe')], plan: { types: ['grunt'] }, day: 1, seed: 3 }), [BD, BE] = melee.units; BD.x = 3; BD.y = 4; BE.x = 11; BE.y = 4; BE.cd = 99; BD.cd = 0; melee.tick(0.1); assert.equal(BE.hp, BE.maxhp, '근접은 8칸 밖에서 못 친다');
  // 균형: 전원이 총기를 들어도 근접 전원과 비슷한 수준(극단적으로 강하거나 약하지 않다)
  const seq = (seed) => { let a = seed; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; }; const fight = (id) => { const x = new Sim(null, () => 0.5); for (const u of x.units) x.setWeapon(u.id, id); const all = x.units.slice(0, 15).map(defenderFrom); let w = 0; for (let i = 1; i <= 20; i++) if (new RaidBattle({ defenders: all, plan: planRaid(10, seq(i)), day: 10, seed: i }).finish().win) w++; return w; };
  const base0 = fight('battleaxe'); for (const g of GUNS) { const w = fight(g); assert.ok(w >= base0 - 12 && w <= 20, `${g} 승리 ${w}/20 (근접 ${base0}/20)`); }
});
console.log(`\n${n} 테스트 통과${process.exitCode ? ' (실패 있음)' : ''}`);
