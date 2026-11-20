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


/* ───────── 옆모습: 템플릿 걷기 시트(오른쪽 보기)에서 그대로 옮김 ─────────
   맨몸 시트의 머리(깨끗함) + 옷 시트의 몸(JPG 번짐을 확신도 투표로 정리)을 같은 격자에 맞춰 합쳤다. 프레임 0 = 서 있기, 1·2 = 걷기. */
export const SIDE_FRAMES = [
  { ox: 7, oy: 2, head: [2, 15], rows: [
    '................',
    '.....lOOooool...',
    '....sohhsslloos.',
    '....ohsslllllso.',
    '...losslllllllOl',
    '...ohhslllllllsO',
    '..lohhsslllllssO',
    '..lohhhssslssssO',
    '..lOhhhohhOOsssO',
    '..lOhhoshOxOssO.',
    '...OhhossOxvssO.',
    '....ohhossy..llO',
    '....ohhhhsllllso',
    '....lohOssslllO.',
    '...FFFFFohsssG..',
    '..FKIIKKFHCOGK..',
    '..FFFGGGKFBCKF..',
    '.HKKIFGGGFBFHF..',
    'FIIIIGFFFFFFFF..',
    'FGGGGKFKHKHKFGH.',
    '.HCFFCCKGIHIFFG.',
    '..CCCCBGGIHHFG..',
    '..BCCCCKGKHKF...',
    '..BCFFCGHKHGF...',
    '..BClsGIHKHIF...',
    '..BCsssHHKHHF...',
    '..UhshooHKHKF...',
    '..ohsssIHGHGF...',
    '...osssICIHKF...',
    '...ohsIBCKHKF...',
    '...BooCCFFFFF...',
    '..BBCCCCCBBBF...',
    '..BBCCCCCBBBF...',
    '..BCCCCCBBBC....',
    '..CBCCCBBBCC....',
    '..CCFFCBIIIC....',
    '..CIEEBCBIIC....',
    '..CIEEBBBBCCC...',
    '..BCCCCBBBCBCC..',
    '..BCCCFFBBBBHH..',
    '..BCCFDDFBBBCC..',
    '..FFFFFFH.......',
  ] },
  { ox: 5, oy: 2, head: [4, 17], rows: [
    '.............l.......',
    '.......hOoooooll.....',
    '......lohhssslOol....',
    '.....sOssslllllsO....',
    '.....sOssllllllsOl...',
    '.....ohhsllllllllo...',
    '.....ohhsslllllslo...',
    '.....ohhhsssssssso...',
    '....lohhhohhOOssso...',
    '.....ohhoshoxussO....',
    '.....ohhossoxvlsO....',
    '.....sohhhssyvll.O...',
    '.....sOhhhhsllll.O...',
    '.......OhosssllsO....',
    '.....FHHFHoEsssG.....',
    '....CIIIKKFHUoO......',
    '....FFHHGGKFBBKH.....',
    '...FKIIFKGKFBFGH.....',
    '..FIIIIGFFFFFFFH.....',
    '..HGGGGKFKHKHKFGC....',
    '..EFFFCFKKHIHIFFH....',
    '..BFFCBCFHHIHHFH.....',
    '..BCCCBCFGHKHKFF.....',
    '..BCCCBHHGHKHHFOO....',
    '..GllsOKHIHKHIFohO...',
    '..GlsssOFHHKHHOhhO...',
    '..OsshoFKKHKHKChhG...',
    '..OssssFFHHHHHCOO....',
    '...GsEBFKKHIHKF......',
    '....GBBFKKHKHKF......',
    '....BBCCFFFFFFFF.....',
    '....BCCFCCBBBBBF.....',
    '....BCCCCCBBBBCF.....',
    '...CCCCCCCCBBBCF.....',
    '..CCCCCCCC.BBCCCB....',
    '..CICCCCF...CKCEBBBC.',
    '.CCIICF.....FKBCCCCCF',
    'BCCCCFB......BBBCCFFC',
    'FCCCCCB......FBBBBFFF',
    '.CCCBCBC......BBBBF..',
    '..CBBCCG......FFFH...',
    '...CCCC..............',
  ] },
  { ox: 5, oy: 1, head: [4, 17], rows: [
    '......................',
    '.......sOOooool.......',
    '......sohhsllsool.....',
    '......ohssllllllo.....',
    '.....lOsslllllllO.....',
    '....sohhsllllllssO....',
    '....sohhssllllssso....',
    '....sohhhsssssssso....',
    '....sOhhhohhOOssso....',
    '....sOhhoshOxOssO.....',
    '....sOhhossOyulsO.....',
    '......Ohhosh.vllsO....',
    '......ohhhhsllllso....',
    '.....FKFIFsssllsH.....',
    '....EFFFFFHhssEG......',
    '....FKIIKKFHHGGK......',
    '....FFFGGGKFCKKH......',
    '...HIIIFGGKFCFHH......',
    '..HIIIIGFFFFFFFH......',
    '..HGGGGKFKHKGKFGF.....',
    '...HCCOOUCHIGIFFH.....',
    '....BUVOUCCGGHFHK.....',
    '....BUUUCCCCHKFOO.....',
    '....CUFBCCCCCHshoO....',
    '...OhUFCBCCUOshhso....',
    '..KOhoFHCBCCsllsshG...',
    '...OhoFHHCCCEsssshG...',
    '....oHFGGGGFFFhhhG....',
    '....KBFKKKKICCOOO.....',
    '....KBFFFFFFFFFK......',
    '....BBBBBBBBBBCC......',
    '....BBBBBBBBCCCC......',
    '....BBBBBBCCCCCCB.....',
    '...BCCBBBFCCCCCCB.....',
    '..BBBBBBF.CCCCCCC.....',
    '..BBBBBB...CCCCCICEE..',
    '.BBBBBC.....CCCIEBBBC.',
    'BBBBBCC.....DCIE.CCCCC',
    'CBBBBBC......BIECFCCCH',
    '.BBBBCCC......BBFCCCHH',
    '..BBCIIH......BBCBBB..',
    '...FFFF.......BBBBG...',
    '..............CCC.....',
  ] },
];

/** 한 프레임: rows(글자 격자), ox · oy(실제 x = ox + 칸, 실제 y = oy + 줄), head(머리 x 범위 · 피부 윗줄) */
export function bodyFrame(dir, frame) {
  if (dir === 'down') return { rows: downFrame(frame), ox: 8, oy: 4, head: { x0: 2, x1: 14, y0: 1, y1: 13 }, eyes: { y: 9, xs: [5, 10] } };
  if (dir === 'up') return { rows: upFrame(frame), ox: 8, oy: 4, head: { x0: 2, x1: 14, y0: 1, y1: 13 }, eyes: null };
  const f = SIDE_FRAMES[frame % 3];
  return { rows: f.rows, ox: f.ox, oy: f.oy, head: { x0: f.head[0], x1: f.head[1], y0: 1, y1: 13 }, eyes: { y: 9, xs: [f.head[1] - 3] } };
}
