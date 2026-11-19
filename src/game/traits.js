// 특성 60개(일반/희귀/전설 각 20) + 능력 5개. fx 키:
//  str def skl cha chm wis : 커스텀 스탯 보정   succ night day : 임무 성공률(전체/밤/낮)   reward : 보상   dmg : 받는 부상
//  heal : 의무실 회복   speed : 이동 속도   upkeep : 일일 유지비(CR)   rep : 임무 성공 시 평판   mor : 사기 변화   patrolSafe / copycat : 특수
export const RARITY = {
  c: { ko: '일반', color: '#aebccd', odds: 0.7 },
  r: { ko: '희귀', color: '#7fc8ff', odds: 0.25 },
  l: { ko: '전설', color: '#ffb23e', odds: 0.05 },
};
export const GACHA_ODDS = { c: 0.7, r: 0.25, l: 0.05 };

const T = (id, rarity, name, desc, fx, bad = false) => ({ id, rarity, name, desc, fx, bad });
export const TRAITS = [
  // ── 일반 20 ──
  T('c01', 'c', '튼튼한 체질', '잔병치레가 없다.', { def: 1 }),
  T('c02', 'c', '근면 성실', '맡은 일은 끝까지 한다.', { succ: 0.02 }),
  T('c03', 'c', '빠른 발', '걸음이 가볍다.', { speed: 0.1 }),
  T('c04', 'c', '단련된 팔', '꾸준한 훈련의 결과.', { str: 1 }),
  T('c05', 'c', '침착함', '위기에도 흔들리지 않는다.', { wis: 1 }),
  T('c06', 'c', '눈썰미', '작은 것도 놓치지 않는다.', { skl: 1 }),
  T('c07', 'c', '붙임성', '누구와도 금방 친해진다.', { chm: 1 }),
  T('c08', 'c', '낙천적', '실패해도 금방 털어낸다.', { mor: 2 }),
  T('c09', 'c', '야간 근무자', '밤눈이 밝다.', { night: 0.03 }),
  T('c10', 'c', '아침형 인간', '해가 뜨면 컨디션이 좋다.', { day: 0.03 }),
  T('c11', 'c', '알뜰살뜰', '쓸데없이 쓰지 않는다.', { upkeep: -100 }),
  T('c12', 'c', '꼼꼼함', '확인 또 확인. 대신 느리다.', { succ: 0.03, speed: -0.05 }),
  T('c13', 'c', '굳은살', '웬만한 상처는 아프지 않다.', { dmg: -0.05 }),
  T('c14', 'c', '응급처치 교육', '회복이 조금 빠르다.', { heal: 0.1 }),
  T('c15', 'c', '말솜씨', '말에 힘이 있다.', { cha: 1 }),
  T('c16', 'c', '체력 단련', '튼튼하고 잘 달린다.', { def: 1, speed: 0.05 }),
  T('c17', 'c', '흥정 감각', '값을 조금 더 받아낸다.', { reward: 0.03 }),
  T('c18', 'c', '길눈 밝음', '지름길을 안다.', { speed: 0.05, succ: 0.01 }),
  T('c19', 'c', '소심함', '조심스러워 막는 데는 강하지만 결정이 느리다.', { succ: -0.02, def: 1 }, true),
  T('c20', 'c', '덜렁이', '손재주가 서툴지만 발은 빠르다.', { skl: -1, speed: 0.1 }, true),
  // ── 희귀 20 ──
  T('r01', 'r', '근육질', '눈에 띄는 체격.', { str: 2 }),
  T('r02', 'r', '강철 피부', '칼도 잘 박히지 않는다.', { def: 2 }),
  T('r03', 'r', '매의 눈', '정확도가 뛰어나다.', { skl: 2 }),
  T('r04', 'r', '지략가', '두세 수 앞을 본다.', { wis: 2 }),
  T('r05', 'r', '타고난 지휘관', '사람들이 따른다.', { cha: 2 }),
  T('r06', 'r', '매혹적인 미소', '협상 테이블이 부드러워진다.', { chm: 2 }),
  T('r07', 'r', '베테랑', '경험이 성공률을 올린다.', { succ: 0.05 }),
  T('r08', 'r', '야행성 사냥꾼', '밤에 훨씬 강하다.', { night: 0.07 }),
  T('r09', 'r', '햇살의 가호', '낮에 훨씬 강하다.', { day: 0.07 }),
  T('r10', 'r', '행운아', '일이 이상하게 잘 풀린다.', { succ: 0.03, reward: 0.05 }),
  T('r11', 'r', '철의 의지', '이를 악물고 버틴다.', { dmg: -0.15 }),
  T('r12', 'r', '회복의 손길', '회복력이 뛰어나다.', { heal: 0.3 }),
  T('r13', 'r', '돌풍 걸음', '바람처럼 움직인다.', { speed: 0.25 }),
  T('r14', 'r', '협상의 달인', '보상을 후하게 받아낸다.', { reward: 0.1 }),
  T('r15', 'r', '용병의 평판', '이름이 알려져 있다.', { rep: 1 }),
  T('r16', 'r', '불면증', '밤엔 또렷하지만 낮엔 멍하다.', { night: 0.06, day: -0.04 }),
  T('r17', 'r', '급한 성격', '빠르지만 다치기 쉽다.', { speed: 0.2, dmg: 0.1 }),
  T('r18', 'r', '허세꾼', '말발은 세지만 생각이 짧다.', { cha: 2, wis: -1 }),
  T('r19', 'r', '도박꾼', '한 방을 노린다. 잃을 때도 크다.', { reward: 0.15, succ: -0.04 }),
  T('r20', 'r', '무릎 부상 경력', '오래된 부상이 발목을 잡는다.', { speed: -0.15, def: -1 }, true),
  // ── 전설 20 (좋은 것 · 양날의 검 · 순수하게 나쁜 것이 섞여 있다) ──
  T('l01', 'l', '전장의 신', '싸움터에서 태어난 사람.', { str: 3, def: 2, skl: 2, succ: 0.05 }),
  T('l02', 'l', '천재 전략가', '지도를 보면 결말이 보인다.', { wis: 4, cha: 2, succ: 0.06 }),
  T('l03', 'l', '불사의 육체', '쓰러져도 다시 일어난다.', { dmg: -0.4, heal: 0.6 }),
  T('l04', 'l', '암흑의 지배자', '어둠이 곧 그의 영역.', { night: 0.15, skl: 3 }),
  T('l05', 'l', '태양의 기사', '빛 아래에서 가장 단단하다.', { day: 0.15, def: 3 }),
  T('l06', 'l', '마성의 매력', '누구도 거절하지 못한다.', { chm: 4, reward: 0.15 }),
  T('l07', 'l', '황금 손', '손대는 계약마다 돈이 된다.', { reward: 0.3 }),
  T('l08', 'l', '용병의 전설', '이름만으로 일이 풀린다.', { rep: 2, succ: 0.05 }),
  T('l09', 'l', '번개의 발', '눈 깜짝할 새에 도착한다.', { speed: 0.5, skl: 2 }),
  T('l10', 'l', '철벽', '뚫리지 않는다. 대신 느리다.', { def: 5, speed: -0.2 }),
  T('l11', 'l', '광전사', '피를 보면 힘이 솟는다. 방어는 포기.', { str: 5, def: -3, dmg: 0.2 }),
  T('l12', 'l', '유리 대포', '한 방은 강하지만 쉽게 깨진다.', { str: 4, skl: 3, dmg: 0.4 }),
  T('l13', 'l', '외로운 늑대', '혼자서 뛰어나지만 사람을 못 이끈다.', { skl: 3, str: 2, cha: -3 }),
  T('l14', 'l', '도박의 신', '대박 아니면 쪽박. 판돈도 든다.', { reward: 0.4, succ: -0.08, upkeep: 300 }),
  T('l15', 'l', '대식가', '힘은 장사, 식비도 장사.', { str: 3, def: 2, upkeep: 500 }),
  T('l16', 'l', '불운의 별', '이상하게 일이 꼬인다.', { succ: -0.08, reward: -0.1 }, true),
  T('l17', 'l', '저주받은 혈통', '몸이 말을 듣지 않는다.', { str: -2, def: -2, skl: -2, dmg: 0.2 }, true),
  T('l18', 'l', '파멸의 예감', '불길한 기운이 판단을 흐린다.', { wis: -3, cha: -3, succ: -0.06 }, true),
  T('l19', 'l', '몰락한 귀족', '체면 유지에 돈이 든다.', { upkeep: 800, chm: -2 }, true),
  T('l20', 'l', '무기력의 저주', '의욕이 바닥나 움직임이 둔하다.', { speed: -0.3, mor: -3, str: -1 }, true),
];
export const TRAIT = Object.fromEntries(TRAITS.map((t) => [t.id, t]));

// ── 능력 (연구로 해금 → 캐릭터에 장착, 캐릭터당 최대 2개) ──
export const ABILITIES = [
  { id: 'remote', name: '원격 감지', desc: '멀리서 위험을 먼저 감지한다. 순찰 중 부상을 입지 않는다.', fx: { succ: 0.06, wis: 1, patrolSafe: true } },
  { id: 'dragon', name: '드래곤', desc: '용의 힘을 빌려 등에 날개가 돋는다. 막강하지만 먹이 값이 든다.', fx: { str: 3, def: 2, dmg: -0.25, upkeep: 400 } },
  { id: 'copycat', name: '카피캣', desc: '같은 부서 동료의 최고 스탯을 70% 수준으로 따라한다.', fx: { copycat: true } },
  { id: 'might', name: '괴력', desc: '상식을 벗어난 힘.', fx: { str: 4, succ: 0.03 } },
  { id: 'stealth', name: '은신', desc: '기척을 지운다. 밤에 특히 강하고 덜 다친다.', fx: { skl: 3, night: 0.05, dmg: -0.1 } },
];
export const ABILITY = Object.fromEntries(ABILITIES.map((a) => [a.id, a]));
export const MAX_TRAITS = 3, MAX_ABILITIES = 2;

const PCT = { succ: '임무 성공률', night: '밤 임무 성공률', day: '낮 임무 성공률', reward: '임무 보상', heal: '의무실 회복', speed: '이동 속도' };
const STAT = { str: '근력', def: '방어력', skl: '기술', cha: '카리스마', chm: '매력', wis: '지혜' };
const sg = (v) => (v > 0 ? '+' : '') + v;
/** fx → 사람이 읽는 줄 목록 */
export function fxLines(fx) {
  const out = [];
  for (const [k, v] of Object.entries(fx || {})) {
    if (STAT[k]) out.push({ t: `${STAT[k]} ${sg(v)}`, good: v > 0 });
    else if (PCT[k]) out.push({ t: `${PCT[k]} ${sg(Math.round(v * 100))}%`, good: v > 0 });
    else if (k === 'dmg') out.push({ t: `받는 부상 ${sg(Math.round(v * 100))}%`, good: v < 0 });
    else if (k === 'upkeep') out.push({ t: `일일 유지비 ${sg(v)} CR`, good: v < 0 });
    else if (k === 'rep') out.push({ t: `임무 성공 시 평판 ${sg(v)}`, good: v > 0 });
    else if (k === 'mor') out.push({ t: `사기 변화 ${sg(v)}`, good: v > 0 });
    else if (k === 'patrolSafe') out.push({ t: '순찰 중 부상 없음', good: true });
    else if (k === 'copycat') out.push({ t: '동료 최고 스탯의 70% 복사', good: true });
  }
  return out;
}
