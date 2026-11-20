// 공방 무기 90개: 3개 공방 × 18가지 무기 종류(근접 12 + 총기 6). 종류마다 5개이며 무기마다 모양(도트)이 모두 다르다. (티어 번호 없음)
// 착용할 때 착용비(fee)를 한 번 내고, 착용하는 동안 매일 유지비(upkeep)가 운영비에 더해진다.
// pw 는 화면에 표시되지 않는 내부 강도(1~5): 성능·착용비·유지비를 정하는 데만 쓰인다.
import { swordPixels, headPixels, gridPixels, toRects, gunArt, PALETTES, GUN_PALETTES } from './weapon-art.js';

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
const GUN = (o) => ({ k: 'gun', o });

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
  ['hammer', 'magma', '화산 망치', 3, HD(-9, 1, '.H./HKH/KBK/KEK/KBK/KDK')],

  ['greathammer', 'magma', '마그마 대형 망치', 2, HD(-14, 3, '.KKKKK./KBEBEBK/KBBEBBK/KDDDDDK')],
  ['greathammer', 'magma', '화산 파쇄 망치', 5, HD(-14, 3, 'K.KKK.K/KBBEBBK/KBEBEBK/KDBBBDK/.KKKKK.')],
  ['greathammer', 'arc', '뇌운 대형 망치', 3, HD(-14, 3, '..KEK../.KKBKK./KBBEBBK/.KKBKK./..KEK..')],
  ['greathammer', 'arc', '플라즈마 슬레지', 1, HD(-14, 3, 'KKKKKKK/KEEBEEK/KDDDDDK')],
  ['greathammer', 'wad', '공성 망치 WD-1', 4, HD(-14, 2, '.KKK./KBHBK/KTBTK/KTBTK/KBBBK/.KDK.')],

  ['handaxe', 'wad', '경량 손도끼', 1, HD(-8, 0, 'KBB./WHBD/WBBD/KDD.')],
  ['handaxe', 'wad', '합금 토마호크', 3, HD(-8, 1, '.KB./KWBB/.WHB/.WBD/.WDB/.K..')],
  ['handaxe', 'magma', '용암 손도끼', 4, HD(-8, 0, 'KBEB./WBBBB/WHBD./K.DD./..D..')],
  ['handaxe', 'magma', '분화 핸드액스', 2, HD(-8, 2, '.HKH./BEWEB/.DKD.')],
  ['handaxe', 'arc', '스파크 핸드액스', 5, HD(-8, 0, 'KEEE/WBD./W...')],

  ['battleaxe', 'arc', '전광 배틀엑스', 3, HD(-13, 3, '.B.F.B./BHBFBDB/BBEWEBB/.BBWBB./..DWD..')],
  ['battleaxe', 'arc', '아크 전투 도끼', 1, HD(-13, 0, 'KBBB../WHBEB./WBBBD./WBBEBD/KDBBD.')],
  ['battleaxe', 'wad', '정예 배틀엑스', 5, HD(-13, 3, '...K.../.BBKBB./BHBWBDB/BBBWBBB/.DBWBD.')],
  ['battleaxe', 'wad', '중장갑 도끼', 2, HD(-13, 0, 'K.KBB../WKBBBB./WHBBBBD/WBBBBBD/WKDDDD./K.DD...')],
  ['battleaxe', 'magma', '마그마 배틀엑스', 4, HD(-13, 3, 'B.BKB.B/BBEWEBB/BEBWBEB/.BDWDB./..DKD..')],

  // ── 총기 30종(종류마다 5개): 옆모습 도트. 마그마=흑요석 + 붉은 발광, 아크=강철 + 청록·보라 방전, 웨폰&아머=건메탈 + 금 장식
  ['pistol', 'magma', '용암 권총', 2, GUN({ body: 4, bh: 2, bar: 3, bt: 1, mz: 'cone', gp: 2, glow: 'core', top: 'iron', fins: 1 })],
  ['pistol', 'magma', '흑요석 핸드캐논', 4, GUN({ body: 4, bh: 3, bar: 3, bt: 2, mz: 'brake', gp: 2, glow: 'line', top: 'dot' })],
  ['pistol', 'arc', '스파크 피스톨', 1, GUN({ body: 3, bh: 2, bar: 3, bt: 1, mz: 'flash', gp: 1, mag: 'box', mp: 2, top: 'rail', glow: 'cells' })],
  ['pistol', 'arc', '플라즈마 사이드암', 3, GUN({ body: 4, bh: 2, bar: 3, bt: 1, mz: 'flash', gp: 2, top: 'dot', glow: 'line', fins: 1 })],
  ['pistol', 'wad', '경량 전술 권총', 5, GUN({ body: 3, bh: 2, bar: 2, bt: 1, mz: 'supp', gp: 1, mag: 'long', mp: 1, top: 'iron' })],

  ['smg', 'wad', '개량형 기관단총', 1, GUN({ stock: 'bulk', sl: 2, body: 4, bh: 2, bar: 2, bt: 1, mz: 'flash', gp: 2, mag: 'box', mp: 1, top: 'rail' })],
  ['smg', 'wad', '카본 SMG-7', 4, GUN({ stock: 'skel', sl: 3, body: 5, bh: 2, bar: 2, bt: 1, mz: 'supp', gp: 2, mag: 'curve', mp: 2, top: 'dot' })],
  ['smg', 'magma', '슬래그 기관단총', 3, GUN({ stock: 'pad', sl: 1, body: 4, bh: 3, bar: 2, bt: 1, hg: 1, gp: 2, mag: 'drum', mp: 2, glow: 'cells', top: 'iron' })],
  ['smg', 'magma', '분화 연발총', 5, GUN({ stock: 'fold', sl: 2, body: 5, bh: 3, bar: 3, bt: 2, mz: 'brake', gp: 3, mag: 'long', mp: 2, glow: 'core', top: 'rail' })],
  ['smg', 'arc', '아크 기관단총', 2, GUN({ stock: 'skel', sl: 2, body: 4, bh: 2, bar: 4, bt: 1, gp: 2, mag: 'curve', mp: 1, glow: 'line', top: 'dot', fins: 1 })],

  ['mg', 'arc', '번개 기관총', 2, GUN({ stock: 'skel', sl: 3, body: 5, bh: 3, bar: 4, bt: 1, hg: 1, gp: 2, mag: 'belt', mp: 2, top: 'rail', glow: 'cells', bipod: 1 })],
  ['mg', 'arc', '방전 갈링', 5, GUN({ stock: 'full', sl: 2, body: 4, bh: 3, bar: 5, bt: 2, fins: 1, gp: 2, mag: 'drum', mp: 1, glow: 'line', top: 'carry' })],
  ['mg', 'wad', '중장갑 기관총', 4, GUN({ stock: 'bulk', sl: 3, body: 5, bh: 3, bar: 3, bt: 2, hg: 2, gp: 2, mag: 'belt', mp: 2, top: 'carry', bipod: 1 })],
  ['mg', 'wad', '전술 지원화기', 1, GUN({ stock: 'full', sl: 3, body: 4, bh: 3, bar: 4, bt: 1, hg: 1, fore: 2, gp: 2, mag: 'long', mp: 2, top: 'scope' })],
  ['mg', 'magma', '화산 기관총', 3, GUN({ stock: 'pad', sl: 1, body: 6, bh: 3, bar: 3, bt: 2, hg: 2, mz: 'cone', gp: 3, mag: 'belt', mp: 3, glow: 'cells', top: 'iron', fins: 1 })],

  ['sniper', 'magma', '용암 저격총', 2, GUN({ stock: 'full', sl: 3, body: 4, bh: 2, bar: 6, bt: 1, mz: 'cone', gp: 2, mag: 'box', mp: 2, top: 'scope', glow: 'line' })],
  ['sniper', 'magma', '흑요석 장거리포', 5, GUN({ stock: 'bulk', sl: 3, body: 5, bh: 3, bar: 5, bt: 2, mz: 'brake', gp: 2, top: 'bigscope', bipod: 1, glow: 'core' })],
  ['sniper', 'arc', '뇌광 저격총', 3, GUN({ stock: 'skel', sl: 4, body: 4, bh: 2, bar: 6, bt: 1, mz: 'flash', gp: 2, mag: 'curve', mp: 2, top: 'bigscope', glow: 'cells' })],
  ['sniper', 'arc', '플라즈마 레일건', 4, GUN({ stock: 'none', body: 5, bh: 3, bar: 6, bt: 2, gp: 2, glow: 'line', top: 'rail', fins: 1 })],
  ['sniper', 'wad', '정밀 저격총', 1, GUN({ stock: 'full', sl: 4, body: 3, bh: 2, bar: 6, bt: 1, mz: 'supp', gp: 2, mag: 'long', mp: 1, top: 'scope' })],

  ['rocket', 'wad', '개량형 로켓포', 1, GUN({ tube: { len: 10, th: 3, flare: 'rear', head: 'none', pad: 1, sight: 1, grip: 2 } })],
  ['rocket', 'wad', '합금 대전차포', 4, GUN({ tube: { len: 12, th: 4, flare: 'both', head: 'rocket', pad: 0, sight: 1, grip: 2 } })],
  ['rocket', 'magma', '용암 로켓 런처', 3, GUN({ tube: { len: 12, th: 3, flare: 'rear', head: 'rocket', pad: 0, sight: 0, grip: 3 }, glow: 'cells' })],
  ['rocket', 'magma', '분화 폭렬포', 5, GUN({ tube: { len: 9, th: 4, flare: 'rear', head: 'rocket', pad: 1, sight: 1, grip: 3 }, glow: 'line' })],
  ['rocket', 'arc', '아크 미사일 런처', 2, GUN({ tube: { len: 10, th: 2, flare: 'both', head: 'rocket', pad: 0, sight: 1, grip: 2 }, glow: 'cells' })],

  ['mortar', 'arc', '코일 박격포', 2, GUN({ tube: { len: 6, th: 3, flare: 'none', head: 'shell', plate: 1, bipod: 1, grip: 0 }, glow: 'cells' })],
  ['mortar', 'arc', '전격 박격포', 5, GUN({ tube: { len: 8, th: 2, flare: 'rear', head: 'shell', plate: 1, bipod: 0, grip: 0 }, glow: 'line' })],
  ['mortar', 'wad', '전술 박격포', 1, GUN({ tube: { len: 7, th: 3, flare: 'both', head: 'none', plate: 0, bipod: 1, grip: 2 } })],
  ['mortar', 'wad', '중장갑 박격포', 4, GUN({ tube: { len: 6, th: 4, flare: 'rear', head: 'shell', plate: 1, bipod: 1, grip: 0 } })],
  ['mortar', 'magma', '화산 박격포', 3, GUN({ tube: { len: 5, th: 4, flare: 'both', head: 'shell', plate: 1, bipod: 0, grip: 0 }, glow: 'cells' })],
];

// ── 성능·비용: 내부 강도(pw)와 공방 성향으로 정한다 ──
const PRIM = [1, 2, 2, 3, 4];                                     // 공방 주력 능력치 증가량(강도 1~5)
const FEE = [2500, 5500, 10000, 17000, 28000], UPKEEP = [120, 260, 480, 800, 1250];
const CLASS_MUL = { dagger: 0.9, shortsword: 0.9, handaxe: 0.9, rapier: 0.9, gauntlet: 0.9, greatsword: 1.25, greathammer: 1.25, battleaxe: 1.25, pistol: 0.9, smg: 0.9, mg: 1.25, sniper: 1.1, rocket: 1.25, mortar: 1.25 };
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
  if (a.k === 'gun') return gunArt(a.o);
  return { kind: a.k, px: gridPixels(a.rows), w: Math.max(...a.rows.map((r) => r.length)), h: a.rows.length };   // shield | gauntlet
}

/** types: 기본 무기 정의 배열(이름·성능 참조용). 서리 대검은 전용 무기라 제외된다. */
export function buildWorkshopWeapons(types) {
  const TY = Object.fromEntries(types.filter((t) => t.id !== 'frostblade').map((t) => [t.id, t])), count = {};
  return CATALOG.map(([ty, wid, name, pw, art]) => {
    const T = TY[ty], wk = WORKSHOP[wid], mul = CLASS_MUL[ty] || 1, n = (count[`${wid}${ty}`] = (count[`${wid}${ty}`] || 0) + 1), tip = art.k === 'sword' ? hints(art.o) : [];
    return { id: `${wid}_${ty}_${n}`, name, desc: [`${T.name} · ${wk.short} 공방`, ...tip].join(' · '), base: ty, workshop: wid, pw,
      fee: Math.round((FEE[pw - 1] * mul) / 100) * 100, upkeep: Math.round((UPKEEP[pw - 1] * mul) / 10) * 10, fx: workshopFx(wid, pw, T.fx), parts: [], art: buildArt(art), pal: art.k === 'gun' ? GUN_PALETTES[wid] : PALETTES[wid], ...(T.gun ? { gun: { ...T.gun } } : {}) };
  }).sort((a, b) => types.findIndex((t) => t.id === a.base) - types.findIndex((t) => t.id === b.base) || a.pw - b.pw);
}
