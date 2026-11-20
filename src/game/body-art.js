// 사람 몸 도트 — 첨부 템플릿(큰 머리 · 갈색 외곽선 · 셀 음영)의 정면 도트를 그대로 옮긴 것이다. (정면: 템플릿에서 추출한 17×40 원본)
// 역할 글자: 피부 o 외곽선 · O 짙은 외곽선 · s 피부 · l 밝은 피부 · h 그늘 · 눈 x u v y w · 겉옷 F H K I G · 검은 옷 B C · 다리감개 E D · 팔띠 U V · 등 표식 R r(부서색)
export const HEAD_DOWN = [
  '......OoooO......',
  '....OohssshoO....',
  '...ohslllllsho...',
  '...oslllllllso...',
  '..osslllllllsso..',
  '..ossslllllssso..',
  '..OsssssssssssO..',
  '..OhssssssssshO..',
  '.oshhOOsssOOhhso.',
  '.OshOxusssuxOhsO.',
  '..ohOxvsssvxOho..',
  '...OhywlllwyhO...',
];
export const TORSO_DOWN = [
  '....OslllllsO....',
  '...FFOslllsOFF...',
  '..FIGFOoooOFGIF..',
  '..FHIFsssssFKKF..',
  '.FIHKFBhshBFKHIF.',
  'FGGKHHFBBBFHHKGGF',
  'FKKHKHKFFFKHKHKKF',
  '.FFFIHIHKHIHIFFF.',
  'BCCFHHHHIHHHHFUVB',
  'BCCCFHKHIHKHFCCCB',
  'BCCCFHHHIHHHFCCCB',
  'oBCBFHIHKHIHFBCBo',
  'olBBFHHHKHHHFBBlo',
  'osssFKIHIHIKFssso',
  'osOsFFFFFFFFFsOso',
  'OsoOFKIHKHIKFOoso',
  '.osBFFFFFFFFFBsso',
];
export const LEGS_DOWN = [
  '..oCCCCCBCCCCCoo.',
  '..BCCCCB.BCCCCB..',
  '..BCCCCB.BCCCCB..',
  '..BCCCCB.BCCCCB..',
  '...BCCCB.BCCCB...',
  '...BEEIB.BIEEB...',
  '...BDDEB.BEDDB...',
  '..BCCCCB.BCCCCB..',
  '.BBBBCCB.BCCBBBB.',
  '.osssBCB.BCBssso.',
  '.BBBBBBB.BBBBBBB.',
];

/* ───────── 프레임 조립 ─────────
   정면(DOWN)은 템플릿 원본 그대로. 걷기 프레임은 한쪽 다리(발 포함)를 한 칸 들어 올린다.
   뒷모습(UP)은 같은 몸에서 얼굴을 지우고 겉옷 등판 + 등 표식(부서색 원)을 그린다.
   옆모습(SIDE)은 템플릿 부품(머리 반쪽 · 몸통 · 팔 · 다리)을 옆으로 재배치해 만든다. */
const W = 17, EMPTY = '.'.repeat(W);
const grid = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
const put = (g, rows, x, y, skip = '.') => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== skip && g[y + j] && x + i >= 0 && x + i < g[0].length) g[y + j][x + i] = ch; }));
const lines = (g) => g.map((r) => r.join(''));

const liftLeg = (legs, side) => legs.map((row, i) => { const next = legs[i + 1] || '.'.repeat(W); return side === 'L' ? next.slice(0, 8) + row.slice(8) : row.slice(0, 9) + next.slice(9); }).map((r, i, a) => (i === a.length - 1 ? (side === 'L' ? '.'.repeat(8) + r.slice(8) : r.slice(0, 9) + '.'.repeat(8)) : r));
const downFrame = (frame) => {
  const legs = frame === 1 ? liftLeg(LEGS_DOWN, 'L') : frame === 2 ? liftLeg(LEGS_DOWN, 'R') : LEGS_DOWN;
  return [EMPTY, ...HEAD_DOWN, ...TORSO_DOWN, ...legs];
};

// 뒷모습: 머리는 피부색 뒤통수(머리카락이 덮는다), 몸통은 등판
const HEAD_UP = HEAD_DOWN.map((row, i) => (i < 6 ? row : row.replace(/[xuvywhO]/g, (c, k) => (c === 'O' && (i === 6 || i === 7) && (k < 4 || k > 12) ? 'O' : 's')).replace(/l/g, 's')));
const TORSO_UP = TORSO_DOWN.map((row, i) => {
  const a = [...row];
  const set = (c0, str) => [...str].forEach((ch, k) => { if (ch !== '.') a[c0 + k] = ch; });
  if (i === 0) set(4, 'OsssssssO'); if (i === 1) set(3, 'FFOsssssOFF');
  if (i >= 3 && i <= 6) set(6, i === 3 ? 'FFFFFFF' : i === 4 ? 'FHHHHHF' : i === 5 ? 'FHHHHHF' : 'HHHHHHH');
  if (i >= 8 && i <= 16) { if (a[8] === 'I') a[8] = 'H'; }
  if (i >= 9 && i <= 13) set(6, ['.rrr.', 'rRRRr', 'rRRRr', 'rRRRr', '.rrr.'][i - 9].replace(/\./g, 'H'));
  return a.join('');
});
const LEGS_UP = LEGS_DOWN.map((row, i) => (i === 9 ? '.BCCCBCB.BCBCCCB.' : row));
const upFrame = (frame) => {
  const legs = frame === 1 ? liftLeg(LEGS_UP, 'L') : frame === 2 ? liftLeg(LEGS_UP, 'R') : LEGS_UP;
  return [EMPTY, ...HEAD_UP, ...TORSO_UP, ...legs];
};

// 옆모습(오른쪽 보기, 21칸 폭): 머리 = 템플릿 머리의 뒤쪽 반(눈·눈썹 제거) + 앞쪽 반(눈 그대로) + 코, 몸통 = 겉옷 중앙 9칸, 팔 = 템플릿 오른팔, 다리 = 템플릿 다리
const SW_ = 21;
const SIDE_HEAD = HEAD_DOWN.map((row, i) => row.slice(2, 8).replace(/[xuvywhO]/g, (c) => (c === 'O' && i < 8 ? 'O' : 's')) + row.slice(8, 16));
const up1 = (blk) => blk.map((r, i) => blk[i + 1] || '.'.repeat(r.length));   // 발을 한 칸 들어 올린 다리 블록
// 옆모습 다리: 템플릿 왼쪽 다리의 정강이(30~37행)를 그대로 쓰고, 샌들은 앞쪽(오른쪽)으로만 나온다.
const LEG_SIDE = [...LEGS_DOWN.slice(0, 8).map((r) => r.slice(2, 9).padEnd(10, '.')), 'BCCCCBBBB.', 'BCCCBsssso', 'BBBBBBBBBB'];
// 옆모습 몸통: 목(앞쪽 피부) · 뒤통수 쪽으로 올라온 후드 깃 · 겉옷 중앙. 지퍼(I)는 앞쪽(오른쪽) 가장자리로 옮긴다.
const TORSO_SIDE = [
  '...OsssO...', '..FFOssOFF.', '.FIGFOooOFF', '.FHIFsssFKF', 'FIHKFsssHKF', 'FGKHHFhFHKF', 'FKHKHKHHHKF', 'FFIHIHKHIFF',
  ...TORSO_DOWN.slice(8).map((r) => r.slice(3, 14).split('').map((ch, k) => (k === 5 && ch === 'I' ? 'H' : k === 9 && ch === 'H' ? 'I' : ch)).join('')),
];
const sideFrame = (frame) => {
  const g = grid(SW_, 41), f1 = frame === 1 ? 2 : frame === 2 ? -2 : 0;
  // 다리: 뒷다리 → 앞다리. 걸을 때는 크게 벌리고 뒷발을 든다.
  if (frame === 0) { put(g, LEG_SIDE, 5, 30); put(g, LEG_SIDE, 7, 30); }
  else if (frame === 1) { put(g, up1(LEG_SIDE), 2, 30); put(g, LEG_SIDE, 9, 30); }
  else { put(g, up1(LEG_SIDE), 9, 30); put(g, LEG_SIDE, 2, 30); }
  // 몸통
  put(g, TORSO_SIDE, 5, 13);
  // 팔: 템플릿 오른팔(소매 · 팔띠 · 손)을 몸 앞쪽에서 흔든다
  put(g, TORSO_DOWN.slice(8, 17).map((r) => r.slice(13, 17)), 8 + f1, 21);
  // 머리 + 귀 + 코(얼굴 앞 윤곽과 이어 붙인다)
  put(g, SIDE_HEAD, 3, 1); put(g, ['oh', 'Oo', 'oh'], 6, 9);
  put(g, ['s', 's'], 16, 12); put(g, ['s', 's'], 17, 12); put(g, ['o', 'o'], 18, 12); put(g, ['o'], 17, 11); put(g, ['o'], 17, 14);   // 코: 눈보다 아래
  return lines(g);
};

/** 한 프레임: rows(글자 격자), ox(몸 기준 x 오프셋: 실제 x = ox + 칸), 머리 상자·손 위치 */
export function bodyFrame(dir, frame) {
  if (dir === 'down') return { rows: downFrame(frame), ox: 8, head: { x0: 2, x1: 14, y0: 1, y1: 13 }, eyes: { y: 9, xs: [5, 10] }, hand: { x: 15, y: 28 } };
  if (dir === 'up') return { rows: upFrame(frame), ox: 8, head: { x0: 2, x1: 14, y0: 1, y1: 13 }, eyes: null, hand: { x: 1, y: 28 } };
  return { rows: sideFrame(frame), ox: 6, head: { x0: 3, x1: 16, y0: 1, y1: 13 }, eyes: { y: 9, xs: [13] }, hand: { x: 11 + (frame === 1 ? 2 : frame === 2 ? -2 : 0), y: 29 } };
}
