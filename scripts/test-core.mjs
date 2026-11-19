// Node 에서 실행되는 코어 테스트: TOTP(RFC 6238 벡터), 해시, 맵 연결성, 시뮬레이션 규칙(시간 12분, 임무/순찰/보고서/저장복원).
import assert from 'node:assert/strict';
import { hashSecret, verifySecret, makeRecoveryCodes, normalizeRecovery } from '../src/core/crypto.js';
import { findPath, PATROLS, ROOMS, roomFreeTiles, roomDoorTile, isSolid, GATE, CAMERAS, MW, MH } from '../src/game/map.js';
import { Sim, DAY_MINUTES, DAY_REAL_SECONDS, MIN_PER_SEC, clockInfo, successChance } from '../src/game/sim.js';
import { nickKey, nickProblem } from '../src/core/nick.js';
import { ROSTER, DEPTS, MISSIONS, MISSION } from '../src/game/data.js';

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
  assert.equal(DEPTS.length, 8); assert.equal(ROSTER.length, 24);
  for (const d of DEPTS) assert.equal(ROSTER.filter((r) => r.dept === d.key).length, 3, d.key);
  assert.ok(ROSTER.every((r) => /^[A-Z][a-z]+$/.test(r.latin)) && new Set(ROSTER.map((r) => r.latin)).size === 24, '라틴어 이름 24개 고유'); assert.equal(MISSIONS.length, 24); assert.equal(new Set(ROSTER.map((r) => r.id)).size, 24);
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
console.log(`\n${n} 테스트 통과${process.exitCode ? ' (실패 있음)' : ''}`);
