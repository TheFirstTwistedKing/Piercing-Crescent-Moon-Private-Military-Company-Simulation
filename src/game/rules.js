// 커스터마이징 규칙(순수 함수): 포인트 배분, 효과 합산, 파생 능력치
import { WEAPON } from './weapons.js';
import { TRAIT, ABILITY } from './traits.js';

export const CSTATS = [
  { k: 'str', ko: '근력', desc: '공격·이동 능력의 바탕' },
  { k: 'def', ko: '방어력', desc: '방어·버티기' },
  { k: 'skl', ko: '기술', desc: '정확도·기동·의료 보조' },
  { k: 'cha', ko: '카리스마', desc: '정보·통솔, 임무 성공률 소폭 ↑' },
  { k: 'chm', ko: '매력', desc: '임무 보상 +1%/포인트' },
  { k: 'wis', ko: '지혜', desc: '정보·의료의 바탕' },
];
export const STAT_MAX = 10, POOL_MIN = 40, POOL_MAX = 50;
export const randomPool = (rand = Math.random) => POOL_MIN + Math.floor(rand() * (POOL_MAX - POOL_MIN + 1));
export const sumAlloc = (a) => CSTATS.reduce((s, { k }) => s + (a[k] || 0), 0);
export const emptyAlloc = () => Object.fromEntries(CSTATS.map(({ k }) => [k, 0]));

// 부서별 선호 스탯 순서(추천 배분용)
const PRIORITY = {
  operation: ['wis', 'cha', 'chm', 'skl', 'def', 'str'], rager: ['str', 'skl', 'def', 'cha', 'wis', 'chm'], defencer: ['def', 'str', 'skl', 'cha', 'wis', 'chm'],
  requester: ['cha', 'chm', 'wis', 'skl', 'def', 'str'], medical: ['wis', 'skl', 'def', 'cha', 'chm', 'str'], raider: ['skl', 'str', 'wis', 'def', 'cha', 'chm'],
  aerial: ['skl', 'wis', 'str', 'cha', 'def', 'chm'], carrier: ['str', 'def', 'skl', 'wis', 'cha', 'chm'],
};
export function autoAlloc(pool, dept) {
  const a = emptyAlloc(), order = PRIORITY[dept] || CSTATS.map((s) => s.k);
  let left = pool;
  for (const k of order) { const g = Math.min(3, left); a[k] += g; left -= g; }            // 바닥 3점씩
  for (const k of order) { const g = Math.min(STAT_MAX - a[k], left); a[k] += g; left -= g; } // 남은 점수는 우선순위대로 10까지
  for (const k of [...order].reverse()) { const g = Math.min(STAT_MAX - a[k], left); a[k] += g; left -= g; }
  return a;
}

/** 무기·장착 특성·장착 능력의 효과를 합산 */
export function sumFx(u) {
  const fx = { str: 0, def: 0, skl: 0, cha: 0, chm: 0, wis: 0, succ: 0, night: 0, day: 0, reward: 0, dmg: 0, heal: 0, speed: 0, upkeep: 0, rep: 0, mor: 0, patrolSafe: false, copycat: false };
  const add = (o) => { for (const [k, v] of Object.entries(o || {})) { if (typeof v === 'boolean') fx[k] = fx[k] || v; else fx[k] = (fx[k] || 0) + v; } };
  add(WEAPON[u.weapon]?.fx);
  for (const id of u.eq) add(TRAIT[id]?.fx);
  for (const id of u.ab) add(ABILITY[id]?.fx);
  return fx;
}
export const clampStat = (v) => Math.max(0, Math.min(15, v));

/** 기본 능력치(0~100) + 커스텀 스탯 → 임무 판정용 능력치 */
export function derive(base, cs) {
  return { cmb: base.cmb + 2 * cs.str + cs.skl, def: base.def + 3 * cs.def, mob: base.mob + 2 * cs.skl + cs.str, med: base.med + 2 * cs.wis + cs.skl, int: base.int + 2 * cs.wis + cs.cha };
}
