// 상점 품목: 능력치 아이템 6 · 장비 10 · 소모품 5 · 가구 40. fx 키는 traits.js 의 설명을 따른다.
// (+ rest: 하루 종료 시 사기 회복, coldProof: 한파 이동 패널티 무시, fogProof: 안개 성공률 패널티 무시)
const STAT_KO = { str: '근력', def: '방어력', skl: '기술', cha: '카리스마', chm: '매력', wis: '지혜' };
export const STAT_ITEM_CAP = 3; // 한 캐릭터의 스탯 하나당 아이템으로 올릴 수 있는 최대치

const stat = (k, price) => ({ id: 'st_' + k, cat: 'stat', name: `${STAT_KO[k]}의 증표`, price, stat: k, desc: `사용하면 ${STAT_KO[k]}이(가) 영구적으로 +1 (캐릭터당 최대 +${STAT_ITEM_CAP}).` });
const eq = (id, slot, name, price, desc, fx) => ({ id: 'eq_' + id, cat: 'equip', slot, name, price, desc, fx });
const cs = (id, name, price, desc, use) => ({ id: 'cs_' + id, cat: 'consume', name, price, desc, use });

export const STAT_ITEMS = ['str', 'def', 'skl', 'cha', 'chm', 'wis'].map((k, i) => stat(k, 2000 + i * 0));
export const EQUIPMENT = [
  eq('leather', 'armor', '가죽 조끼', 1500, '가볍고 질긴 기본 방어구.', { def: 1, dmg: -0.05 }),
  eq('vest', 'armor', '방탄 조끼', 3500, '급소를 보호한다.', { def: 2, dmg: -0.1 }),
  eq('plate', 'armor', '중장갑', 7000, '매우 단단하지만 무겁다.', { def: 4, dmg: -0.2, speed: -0.1 }),
  eq('parka', 'armor', '방한복', 3000, '한파로 인한 이동 속도 감소를 막아 준다.', { def: 1, coldProof: true }),
  eq('tactical', 'armor', '경량 전술복', 3000, '움직임이 가볍다.', { skl: 1, speed: 0.1 }),
  eq('nvg', 'acc', '야시경', 2500, '밤에 더 잘 본다.', { night: 0.05 }),
  eq('goggles', 'acc', '안개 고글', 3000, '안개로 인한 임무 성공률 감소를 막아 준다.', { fogProof: true }),
  eq('headset', 'acc', '통신 헤드셋', 2200, '지원과 연락이 원활해진다.', { succ: 0.02 }),
  eq('charm', 'acc', '행운의 부적', 4000, '이상하게 일이 풀린다.', { succ: 0.02, reward: 0.03 }),
  eq('seal', 'acc', '용병 인장', 5000, '이름이 알려진다. 임무 성공 시 평판 +1.', { rep: 1 }),
];
export const CONSUMABLES = [
  cs('medkit', '응급 키트', 600, 'HP를 40 회복한다.', { hp: 40 }),
  cs('elixir', '고급 의약품', 1800, 'HP를 가득 회복한다.', { hp: 100 }),
  cs('ration', '전투 식량', 500, '사기를 20 올린다.', { mor: 20 }),
  cs('kit', '임무 지원 키트', 900, '다음 임무 성공률 +10% (1회).', { kit: true }),
  cs('warm', '방한 팩', 400, '오늘 하루 한파 이동 속도 감소를 무시한다.', { warm: true }),
];

// ── 가구 40종 ── art: 화면에 그려지는 모양, fav: 이 방에 두면 효과 ×1.5
const F = (n, sub, name, price, art, color, fx, fav = []) => ({ id: 'fn' + String(n).padStart(2, '0'), cat: 'furniture', sub, name, price, art, color, fx, fav });
export const FURNITURE = [
  // 휴식
  F(1, '휴식', '싱글 침대', 1200, 'bed', '#8fb0d0', { rest: 4, heal: 0.1 }, ['medical']),
  F(2, '휴식', '이층 침대', 2000, 'bed', '#7a8f6a', { rest: 6, heal: 0.05 }),
  F(3, '휴식', '소파', 1500, 'seat', '#8a4a4a', { rest: 3, mor: 1 }, ['lobby']),
  F(4, '휴식', '안락의자', 900, 'seat', '#6a5a8a', { rest: 2, wis: 1 }),
  F(5, '휴식', '따뜻한 담요', 400, 'bed', '#c98d4c', { rest: 2 }),
  F(6, '휴식', '난로', 2500, 'lamp', '#e0753a', { rest: 3, speed: 0.05, upkeep: 100 }),
  F(7, '휴식', '커피 머신', 1800, 'tech', '#8a6a4a', { day: 0.02, night: 0.02, upkeep: 100 }),
  F(8, '휴식', '미니 냉장고', 1000, 'safe', '#a8c0d0', { rest: 1, mor: 1 }),
  F(9, '휴식', '휴게 테이블', 700, 'desk', '#9a7a52', { chm: 1 }, ['lobby']),
  // 업무
  F(10, '업무', '책상', 800, 'desk', '#8a6a42', { wis: 1 }, ['operation', 'requester']),
  F(11, '업무', '서류 캐비닛', 1100, 'shelf', '#7a8a96', { succ: 0.01, wis: 1 }, ['requester']),
  F(12, '업무', '대형 지도 테이블', 3000, 'desk', '#c8b78a', { succ: 0.02, wis: 1 }, ['operation', 'raider']),
  F(13, '업무', '서재 책장', 1600, 'shelf', '#6a4a30', { wis: 1, cha: 1 }, ['requester']),
  F(14, '업무', '컴퓨터 단말', 2200, 'tech', '#5a9ac0', { skl: 1, succ: 0.01 }, ['operation']),
  F(15, '업무', '통신 장비', 2800, 'tech', '#6ac0a0', { succ: 0.02 }, ['aerial', 'operation']),
  F(16, '업무', '금고', 3500, 'safe', '#8a8f93', { reward: 0.03 }, ['requester']),
  F(17, '업무', '접수 카운터', 2000, 'desk', '#b9a37d', { reward: 0.02, chm: 1 }, ['requester']),
  // 훈련
  F(18, '훈련', '샌드백', 900, 'gym', '#a58a5e', { str: 1 }, ['rager']),
  F(19, '훈련', '덤벨 세트', 1100, 'gym', '#6a7078', { str: 1 }),
  F(20, '훈련', '철봉', 800, 'gym', '#8a9096', { str: 1, def: 1 }, ['rager']),
  F(21, '훈련', '사격 표적', 1300, 'board', '#c4553f', { skl: 1 }, ['rager', 'raider']),
  F(22, '훈련', '방패 거치대', 1200, 'shelf', '#4a6a8c', { def: 1 }, ['defencer']),
  F(23, '훈련', '장비 로커', 1000, 'shelf', '#3c4856', { dmg: -0.03 }),
  F(24, '훈련', '무기 거치대', 1500, 'shelf', '#5a5f64', { str: 1, skl: 1 }, ['rager', 'raider']),
  F(25, '훈련', '훈련 매트', 600, 'bed', '#3a5a4a', { dmg: -0.03, rest: 1 }),
  // 보안
  F(26, '보안', '감시 모니터', 2500, 'tech', '#7fa8bd', { night: 0.03, succ: 0.01 }, ['defencer', 'operation']),
  F(27, '보안', '바리케이드 세트', 1800, 'shelf', '#6d5e41', { def: 1, dmg: -0.03 }, ['defencer']),
  F(28, '보안', '경보 장치', 1600, 'lamp', '#d84a3a', { succ: 0.01, dmg: -0.02 }),
  F(29, '보안', '서치라이트', 2200, 'lamp', '#e8d890', { night: 0.04 }, ['aerial', 'defencer']),
  F(30, '보안', '금속 탐지기', 1400, 'tech', '#8a9aa0', { succ: 0.01 }),
  // 의료
  F(31, '의료', '응급 처치 선반', 1200, 'med', '#72b79d', { heal: 0.2 }, ['medical']),
  F(32, '의료', '수술 도구 세트', 3000, 'med', '#a8d0c0', { heal: 0.3, wis: 1 }, ['medical']),
  F(33, '의료', '약품 보관함', 1800, 'med', '#d0d6cf', { heal: 0.15, dmg: -0.02 }, ['medical']),
  F(34, '의료', '소독기', 1000, 'med', '#9ac0d0', { heal: 0.1 }),
  // 장식·설비
  F(35, '장식', '화분', 300, 'plant', '#4a8a5a', { rest: 1, mor: 1 }),
  F(36, '장식', '양탄자', 500, 'bed', '#8a3a3a', { rest: 1, speed: 0.02 }),
  F(37, '장식', '벽시계', 400, 'board', '#c9a24a', { day: 0.01 }),
  F(38, '장식', '천공월아 문장 액자', 900, 'board', '#d9d6cf', { cha: 1 }, ['operation', 'lobby']),
  F(39, '설비', '전기 발전기', 3200, 'tech', '#c98d4c', { upkeep: -200 }, ['carrier']),
  F(40, '설비', '공기 청정기', 1500, 'tech', '#cfe1f2', { heal: 0.05, rest: 1 }),
];

export const ITEMS = [...STAT_ITEMS, ...EQUIPMENT, ...CONSUMABLES, ...FURNITURE];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const CATS = [['stat', '능력치 아이템'], ['equip', '장비'], ['consume', '소모품'], ['furniture', '가구']];
export const FURN_SLOTS = 4; // 방마다 가구 자리 수
export const ROOM_KEYS = ['operation', 'requester', 'medical', 'aerial', 'rager', 'raider', 'defencer', 'carrier', 'lobby'];
