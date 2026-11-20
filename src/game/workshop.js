// 공방 무기 60개: 3개 공방 × 12가지 무기 종류. 종류마다 5개이며 무기마다 모양(도트)이 모두 다르다. (티어 번호 없음)
// 착용할 때 착용비(fee)를 한 번 내고, 착용하는 동안 매일 유지비(upkeep)가 운영비에 더해진다.
// pw 는 화면에 표시되지 않는 내부 강도(1~5): 성능·착용비·유지비를 정하는 데만 쓰인다.
import { swordPixels, headPixels, gridPixels, toRects, PALETTES } from './weapon-art.js';

export const WORKSHOPS = [
  { id: 'magma', name: '마그마 인더스트리 공방', short: '마그마', color: '#e0702a', desc: '지열로 벼린 중화기 공방. 흑요석처럼 검은 날에 용암 균열이 흐른다. 근력과 파괴력에 특화됐지만 둔해지고, 강한 무기는 열기로 한파를 막아 준다.' },
  { id: 'arc', name: '아크 공방', short: '아크', color: '#4fd0ff', desc: '플라즈마 방전을 쓰는 정밀 공방. 날렵한 날에 푸른 방전이 흐른다. 기술·기동·밤 작전에 강하고, 강한 무기는 안개를 가르며 순찰 중 부상을 막는다.' },
  { id: 'wad', name: '웨폰 & 아머 디벨롭 인더스트리 공방', short: '웨폰&아머', color: '#d8b64e', desc: '무기와 방어구를 함께 개발하는 대기업 공방. 강철 몸체에 금빛 장식과 리벳이 박혀 있다. 방어력과 부상 경감에 특화되고, 강한 무기는 하루를 마칠 때 사기를 북돋운다.' },
];
export const WORKSHOP = Object.fromEntries(WORKSHOPS.map((w) => [w.id, w]));

const SW = (o) => ({ k: 'sword', o });
const HD = (top, ox, rows, butt = 'cap') => ({ k: 'head', top, ox, rows: rows.split('/'), butt });
const SH = (rows) => ({ k: 'shield', rows: rows.split('/') });
const GN = (rows) => ({ k: 'gauntlet', rows: rows.split('/') });

// [종류, 공방, 이름, 내부 강도(1~5), 도트 설계]
const CATALOG = [
  ['dagger', 'magma', '용암 송곳니', 2, SW({ L: 5, w: 2, tp: 'taper', cv: 1, ed: 'serr', acc: 'crack', g: 'cross', gw: 3, pm: 'ball' })],
  ['dagger', 'magma', '흑요석 단도', 4, SW({ L: 6, w: 3, tp: 'leaf', fl: 'E', g: 'drop', gw: 5, pm: 'spike' })],
  ['dagger', 'arc', '스파크 스틸레토', 1, SW({ L: 7, w: 1, tp: 'needle', g: 'bar', gw: 3, pm: 'orb' })],
  ['dagger', 'arc', '코일 대거', 3, SW({ L: 5, w: 2, tp: 'straight', cv: -1, ed: 'zig', acc: 'zig', g: 'wing', gw: 3, pm: 'ring' })],
  ['dagger', 'wad', '전술 나이프 TK-9', 5, SW({ L: 6, w: 3, tp: 'cleaver', sp: 1, holes: [2], acc: 'rivet', g: 'bar', gw: 5, pm: 'cap' })],

  ['shortsword', 'wad', '개량형 쇼트소드', 1, SW({ L: 8, w: 3, tp: 'straight', fl: 'D', g: 'cross', gw: 5, pm: 'ball' })],
  ['shortsword', 'wad', '카본 블레이드', 4, SW({ L: 9, w: 3, tp: 'taper', holes: [2, 4], g: 'bar', gw: 3, pm: 'cap' })],
  ['shortsword', 'magma', '슬래그 가르개', 3, SW({ L: 8, w: 3, tp: 'cleaver', ed: 'bites', acc: 'crack', g: 'drop', gw: 5, pm: 'ball' })],
  ['shortsword', 'magma', '분화 쇼트소드', 5, SW({ L: 9, w: 3, tp: 'flame', cv: 1, fl: 'E', g: 'spike', gw: 5, pm: 'spike' })],
  ['shortsword', 'arc', '플라즈마 숏블레이드', 2, SW({ L: 8, w: 2, tp: 'leaf', cv: -1, acc: 'zig', g: 'wing', gw: 5, pm: 'orb' })],

  ['longsword', 'arc', '번개 롱소드', 2, SW({ L: 11, w: 2, tp: 'taper', acc: 'zig', g: 'wing', gw: 5, pm: 'orb' })],
  ['longsword', 'arc', '방전 장검', 5, SW({ L: 12, w: 3, tp: 'straight', fl: 'E', ed: 'zig', g: 'bar', gw: 7, pm: 'ring' })],
  ['longsword', 'wad', '정예 장검', 3, SW({ L: 11, w: 3, tp: 'taper', fl: 'D', g: 'crown', gw: 5, pm: 'cap' })],
  ['longsword', 'wad', '티타늄 롱소드', 1, SW({ L: 12, w: 2, tp: 'straight', sp: 1, g: 'cross', gw: 7, pm: 'ball' })],
  ['longsword', 'magma', '화염 장검', 4, SW({ L: 11, w: 3, tp: 'flame', cv: -1, acc: 'crack', g: 'drop', gw: 5, pm: 'spike' })],

  ['greatsword', 'magma', '마그마 그레이트소드', 3, SW({ L: 12, w: 4, tp: 'cleaver', sp: 1, ed: 'bites', acc: 'crack', g: 'disc', gw: 7, pm: 'cap' })],
  ['greatsword', 'magma', '화산 파쇄검', 5, SW({ L: 12, w: 4, tp: 'flame', cv: 2, ed: 'serr', fl: 'E', g: 'spike', gw: 7, pm: 'spike' })],
  ['greatsword', 'arc', '아크 그레이트소드', 1, SW({ L: 12, w: 3, tp: 'straight', fl: 'E', holes: [3, 6, 9], g: 'wing', gw: 7, pm: 'orb' })],
  ['greatsword', 'arc', '뇌운 대검', 4, SW({ L: 12, w: 4, tp: 'leaf', acc: 'zig', ed: 'zig', g: 'gear', gw: 7, pm: 'ring' })],
  ['greatsword', 'wad', '특수합금 그레이트소드', 2, SW({ L: 12, w: 4, tp: 'taper', sp: 1, acc: 'rivet', fl: 'D', g: 'crown', gw: 7, pm: 'cap' })],

  ['spear', 'wad', '개량형 장창', 1, HD(-14, 2, '..H../..B../.HBD./.HBD./.HBD./KKKKK', 'cap')],
  ['spear', 'wad', '합금 파이크', 4, HD(-14, 2, '..H../..B../..B../..B../..B../.HBD./.KTK.', 'spike')],
  ['spear', 'magma', '용암 창', 2, HD(-14, 2, '..F../.BEK./KBEB./.BEBK/.KEK.', 'cap')],
  ['spear', 'magma', '분화 랜스', 5, HD(-14, 0, 'BBBB./HBEBD/HBBBD/.BBD./KKK..', 'spike')],
  ['spear', 'arc', '전광 창', 3, HD(-14, 2, 'E.F.E/E.B.E/EEBEE/.KBK./..T..', 'cap')],

  ['shield', 'arc', '아크 배리어', 2, SH('.KKK./KHBBK/KBFBK/KBBDK/.KKK.')],
  ['shield', 'arc', '방전 방패', 5, SH('KKKKK/KHBBK/KBEBK/KBBEK/.KBK./.KEK./..K..')],
  ['shield', 'wad', '중장갑 방패', 3, SH('KTKKTK/KHBBBK/KBBBBK/KBBBBK/KBBBBK/KDDDDK/.KKKK.')],
  ['shield', 'wad', '전술 타워실드', 1, SH('KKKKK/KBBBK/KEEEK/KBBBK/KBTBK/KBBBK/KBBBK/KBBDK/.KKK.')],
  ['shield', 'magma', '흑요석 방패', 4, SH('K.KK.K/KKBBKK/KBEEBK/KBBBBK/.KBBK./.KEEK./..KK..')],

  ['rapier', 'magma', '불꽃 레이피어', 1, SW({ L: 11, w: 1, tp: 'flame', g: 'wing', gw: 5, pm: 'spike' })],
  ['rapier', 'magma', '용암 세검', 4, SW({ L: 12, w: 2, tp: 'taper', cv: 1, acc: 'crack', g: 'crown', gw: 5, pm: 'ball' })],
  ['rapier', 'arc', '스파크 레이피어', 2, SW({ L: 12, w: 1, tp: 'needle', g: 'disc', gw: 5, pm: 'orb' })],
  ['rapier', 'arc', '플라즈마 세검', 5, SW({ L: 11, w: 2, tp: 'straight', acc: 'zig', g: 'bar', gw: 7, pm: 'ring' })],
  ['rapier', 'wad', '정밀 레이피어', 3, SW({ L: 12, w: 2, tp: 'taper', g: 'cross', gw: 5, pm: 'cap', gr: 'plain' })],

  ['gauntlet', 'wad', '강화 건틀렛', 1, GN('.K./BBB/BHB/KDK')],
  ['gauntlet', 'wad', '중장갑 너클', 4, GN('KKKKK/BHBBK/BBBBB/DDDDD')],
  ['gauntlet', 'magma', '용암 건틀렛', 3, GN('K.K/K.K/BEB/BBB/KDK')],
  ['gauntlet', 'magma', '분화 너클', 5, GN('K..K/KBBK/BEEB/D..D')],
  ['gauntlet', 'arc', '방전 건틀렛', 2, GN('.FF./.EE./BEEB/BHHB/D..D')],

  ['hammer', 'arc', '코일 해머', 1, HD(-9, 2, 'KKKKK/.KEK./.KFK./KKKKK')],
  ['hammer', 'arc', '전격 망치', 4, HD(-9, 3, 'KKKKKKK/KHBEBDK/KDDDDDK')],
  ['hammer', 'wad', '전술 해머', 2, HD(-9, 2, 'K..KKK/KKBBBK/.KBHBK/..BDBK')],
  ['hammer', 'wad', '합금 메이스', 5, HD(-9, 2, '.K.K./KBHBK/TBEBT/KBDBK/.K.K.')],
  ['hammer', 'magma', '화산 망치', 3, HD(-9, 1, '.K./KKK/KBK/KEK/KBK/KDK')],

  ['greathammer', 'magma', '마그마 대형 망치', 2, HD(-14, 3, '.KKKKK./KBEBEBK/KBBEBBK/KDDDDDK')],
  ['greathammer', 'magma', '화산 파쇄 망치', 5, HD(-14, 3, 'K.KKK.K/KBBEBBK/KBEBEBK/KDBBBDK/.KKKKK.')],
  ['greathammer', 'arc', '뇌운 대형 망치', 3, HD(-14, 3, '..KEK../.KKBKK./KBBEBBK/.KKBKK./..KEK..')],
  ['greathammer', 'arc', '플라즈마 슬레지', 1, HD(-14, 3, 'KKKKKKK/KEEBEEK/KDDDDDK')],
  ['greathammer', 'wad', '공성 망치 WD-1', 4, HD(-14, 2, '.KKK./KBHBK/KTBTK/KTBTK/KBBBK/.KDK.')],

  ['handaxe', 'wad', '경량 손도끼', 1, HD(-8, 0, 'KBB./WHBD/WBBD/KDD.')],
  ['handaxe', 'wad', '합금 토마호크', 3, HD(-8, 1, '.KB./KWBB/.WHB/.WBD/.WDB/.K..')],
  ['handaxe', 'magma', '용암 손도끼', 4, HD(-8, 0, 'KBEB./WBBBB/WHBD./K.DD./..D..')],
  ['handaxe', 'magma', '분화 핸드액스', 2, HD(-8, 2, '.BKB./BBWBB/.DKD.')],
  ['handaxe', 'arc', '스파크 핸드액스', 5, HD(-8, 0, 'KEEE/WBD./W...')],

  ['battleaxe', 'arc', '전광 배틀엑스', 3, HD(-13, 3, '.B.F.B./BHBFBDB/BBEWEBB/.BBWBB./..DWD..')],
  ['battleaxe', 'arc', '아크 전투 도끼', 1, HD(-13, 0, 'KBBB../WHBEB./WBBBD./WBBEBD/KDBBD.')],
  ['battleaxe', 'wad', '정예 배틀엑스', 5, HD(-13, 3, '...K.../.BBKBB./BHBWBDB/BBBWBBB/.DBWBD.')],
  ['battleaxe', 'wad', '중장갑 도끼', 2, HD(-13, 0, 'K.KBB../WKBBBB./WHBBBBD/WBBBBBD/WKDDDD./K.DD...')],
  ['battleaxe', 'magma', '마그마 배틀엑스', 4, HD(-13, 3, 'B.BKB.B/BBEWEBB/BEBWBEB/.BDWDB./..DKD..')],
];

// ── 성능·비용: 내부 강도(pw)와 공방 성향으로 정한다 ──
const PRIM = [1, 2, 2, 3, 4];                                     // 공방 주력 능력치 증가량(강도 1~5)
const FEE = [2500, 5500, 10000, 17000, 28000], UPKEEP = [120, 260, 480, 800, 1250];
const CLASS_MUL = { dagger: 0.9, shortsword: 0.9, handaxe: 0.9, rapier: 0.9, gauntlet: 0.9, greatsword: 1.25, greathammer: 1.25, battleaxe: 1.25 };
const r2 = (n) => Math.round(n * 100) / 100;
function workshopFx(wid, pw, base) {
  const fx = { ...base }, add = (o) => { for (const [k, v] of Object.entries(o)) fx[k] = typeof v === 'boolean' ? (fx[k] || v) : r2((fx[k] || 0) + v); };
  if (wid === 'magma') { add({ str: PRIM[pw - 1], speed: -0.02 * pw }); if (pw >= 3) add({ coldProof: true }); if (pw >= 5) add({ succ: 0.03 }); }
  if (wid === 'arc') { add({ skl: PRIM[pw - 1], night: 0.01 * pw, speed: 0.02 * pw }); if (pw >= 3) add({ fogProof: true }); if (pw >= 5) add({ patrolSafe: true }); }
  if (wid === 'wad') { add({ def: PRIM[pw - 1], dmg: -0.03 * pw }); if (pw >= 3) add({ rest: 2 }); if (pw >= 5) add({ succ: 0.03 }); }
  return fx;
}
function hints(o) {   // 검류 외형 설명(자동)
  const a = [];
  if (o.tp === 'flame') a.push('물결치는 날'); if (o.tp === 'needle') a.push('바늘처럼 가는 날'); if (o.tp === 'cleaver') a.push('통짜 넓은 날'); if (o.cv) a.push('휘어진 날');
  if (o.ed === 'serr') a.push('톱니 날'); if (o.ed === 'bites') a.push('깊게 패인 날'); if (o.ed === 'zig') a.push('뾰족한 가장자리'); if ((o.holes || []).length) a.push('통풍구');
  if (o.acc === 'crack') a.push('용암 균열'); if (o.acc === 'zig') a.push('방전 줄기'); if (o.acc === 'rivet') a.push('리벳 보강'); if (o.fl === 'E') a.push('발광 홈');
  if (o.g === 'gear') a.push('톱니바퀴 가드'); if (o.g === 'crown') a.push('왕관 가드'); if (o.g === 'disc') a.push('원반 가드'); if (o.g === 'spike') a.push('가시 가드'); if (o.g === 'wing') a.push('날개 가드');
  return a.slice(0, 3);
}
function buildArt(a) {
  if (a.k === 'sword') return { kind: 'hand', rects: toRects(swordPixels(a.o)) };
  if (a.k === 'head') return { kind: 'hand', rects: toRects(headPixels(a)) };
  return { kind: a.k, px: gridPixels(a.rows), w: Math.max(...a.rows.map((r) => r.length)), h: a.rows.length };   // shield | gauntlet
}

/** types: 기본 무기 정의 배열(이름·성능 참조용). 서리 대검은 전용 무기라 제외된다. */
export function buildWorkshopWeapons(types) {
  const TY = Object.fromEntries(types.filter((t) => t.id !== 'frostblade').map((t) => [t.id, t])), count = {};
  return CATALOG.map(([ty, wid, name, pw, art]) => {
    const T = TY[ty], wk = WORKSHOP[wid], mul = CLASS_MUL[ty] || 1, n = (count[`${wid}${ty}`] = (count[`${wid}${ty}`] || 0) + 1), tip = art.k === 'sword' ? hints(art.o) : [];
    return { id: `${wid}_${ty}_${n}`, name, desc: [`${T.name} · ${wk.short} 공방`, ...tip].join(' · '), base: ty, workshop: wid, pw,
      fee: Math.round((FEE[pw - 1] * mul) / 100) * 100, upkeep: Math.round((UPKEEP[pw - 1] * mul) / 10) * 10, fx: workshopFx(wid, pw, T.fx), parts: [], art: buildArt(art), pal: PALETTES[wid] };
  }).sort((a, b) => types.findIndex((t) => t.id === a.base) - types.findIndex((t) => t.id === b.base) || a.pw - b.pw);
}
