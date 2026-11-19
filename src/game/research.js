// 연구: 연구 포인트는 '오늘의 보고서'를 올릴 때마다 1씩 얻는다.
import { ABILITIES } from './traits.js';

export const RESEARCH = [
  ...ABILITIES.map((a) => ({ key: 'ab:' + a.id, kind: 'ability', ability: a.id, name: `능력 — ${a.name}`, desc: a.desc, cost: () => 10 })),
  { key: 'speed3', kind: 'once', name: '3배속 해금', desc: '현장 지휘·CCTV에서 3배속을 쓸 수 있다.', cost: () => 5 },
  { key: 'income', kind: 'level', max: 20, name: '수입 증가', desc: '임무 보상이 단계마다 +0.5% 늘어난다. (최대 20단계 = +10%)', cost: (lv) => 2 * (lv + 1) },
  { key: 'pulls', kind: 'level', max: 5, name: '특성 재도전', desc: '모든 캐릭터의 특성 뽑기 기회가 단계마다 +1 늘어난다.', cost: (lv) => 3 + 2 * lv },
  { key: 'heal', kind: 'level', max: 5, name: '의무 강화', desc: '의무실 회복 속도가 단계마다 +10% 빨라진다.', cost: (lv) => 2 + 2 * lv },
];
export const RESEARCH_BY_KEY = Object.fromEntries(RESEARCH.map((r) => [r.key, r]));
export const freshResearch = () => ({ points: 0, abilities: [], speed3: false, income: 0, pulls: 0, heal: 0 });
