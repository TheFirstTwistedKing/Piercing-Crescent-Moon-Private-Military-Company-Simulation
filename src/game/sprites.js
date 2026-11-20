// 캐릭터 스프라이트 — 코드로 그린 16×24 픽셀 캐릭터. 머리 스타일/머리색/무기는 커스터마이징으로 바뀌며 즉시 다시 그려진다.
import { DEPT } from './data.js';
import { drawHair, adj } from './hair.js';
import { drawWeapon } from './weapons.js';

export const CW = 32, CH = 24, OX = 8; // 날개가 펼쳐질 좌우 여백 8px 씩 (몸은 셀 안 x=8..23)
const DIRS = ['down', 'left', 'right', 'up'];
export const DIR_INDEX = { down: 0, left: 1, right: 2, up: 3 };
const cache = new Map();

// 드래곤 날개(왼쪽 기준 12×13 도안, 오른쪽은 대칭). B=뼈대(팔 + 손가락뼈 3줄, 푸른색) C=손톱 M=막.
// 막은 노랑 — 몸쪽/아래쪽은 어두운 금색, 아랫단은 한 톤 진하게, 곳곳에 하이라이트. 아랫단은 손가락 사이가 오목한 물결 모양.
const WING = [
  '......C.....',
  '......B.....',
  '....BBB.....',
  '..BBMMMB....',
  'BBMMMMBB....',
  '..MMMBMMB...',
  '...MBMMMB...',
  '...BMMMBMB..',
  '..BMMMBMMB..',
  '.BMMMBMMMMB.',
  'B.MMMBMMMMMB',
  '...MBMMMMMM.',
  '....BMMM....',
];
const WING_HL = new Set(['4,3', '3,4', '3,5', '4,8', '3,9', '7,9', '3,10', '6,11']);
function wingColor(col, row) {
  const ch = WING[row][col];
  if (ch === 'C') return '#d6ebff';
  if (ch === 'B') return row < 4 ? '#5fa8ee' : '#2f6fc0';   // 뼈대는 푸른색(윗부분은 조금 밝게)
  if (WING_HL.has(col + ',' + row)) return '#ffe066';
  const below = WING[row + 1]?.[col];
  if (!below || below === '.') return '#c99a12';           // 아랫단(물결 가장자리)
  return col >= 8 || row >= 11 ? '#b8860b' : '#e8b923';     // 몸쪽/아래는 어둡게
}
// 걷는 프레임에서는 날개가 한 칸 내려갔다 올라오며 날갯짓한다. (셀 좌표 col → 몸 기준 x = col - OX)
function drawWings(r, view, frame) {
  const fy = frame ? 1 : 0;
  const put = (mirror) => WING.forEach((line, row) => { for (let col = 0; col < 12; col++) if (line[col] !== '.') r(wingColor(col, row), mirror ? (CW - 1 - col) - OX : col - OX, row + fy, 1, 1); });
  put(false); if (view !== 'side') put(true);
}

function drawInner(c, dir, frame, L0, accent, weapon, wings) {
  const L = L0;

  const r = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const lift = frame === 1 ? 1 : frame === 2 ? -1 : 0; // +1: 왼다리 들기, -1: 오른다리 들기
  const ink = '#120d0b';
  const coatL = adj(L.coat, 14);
  const boots = '#0f0b09';

  if (dir === 'down' || dir === 'up') {
    const back = dir === 'up';
    if (wings && !back) drawWings(r, 'down', frame);
    const ll = lift === 1 ? 1 : 0, rl = lift === -1 ? 1 : 0;
    r(L.pants, 5, 16 - ll, 3, 5); r(L.pants, 8, 16 - rl, 3, 5);
    r(boots, 5, 20 - ll, 3, 2); r(boots, 8, 20 - rl, 3, 2);
    r(L.coat, 4, 9, 8, 8); r(L.coat2, 11, 9, 1, 8); r(L.coat2, 4, 16, 8, 1); r('#15110f', 4, 14, 8, 1);
    if (!back) { r(L.coat2, 7, 9, 2, 5); r(accent, 7, 10, 2, 3); r(coatL, 4, 9, 1, 5); } else { r(coatL, 4, 9, 8, 1); r(L.coat2, 7, 10, 2, 4); }
    if (L.extra === 'vest') { r('#26221f', 5, 10, 6, 5); r('#3a342e', 5, 12, 2, 2); r('#3a342e', 9, 12, 2, 2); }
    if (L.extra === 'scarf') r(adj(L.coat2, 40), 5, 9, 6, 2);
    const al = lift === 1 ? 1 : 0, ar = lift === -1 ? 1 : 0;
    r(L.coat, 3, 10 + al, 1, 6); r(L.coat, 12, 10 + ar, 1, 6);
    r(L.skin, 3, 16 + al, 1, 1); r(L.skin, 12, 16 + ar, 1, 1);
    r(accent, back ? 12 : 3, 12 + (back ? ar : al), 1, 2); // 부서 완장
    if (wings && back) drawWings(r, 'up', frame);
    r(L.skin, 5, 3, 6, 6);
    drawHair(r, back ? 'up' : 'down', L.hairStyle, L.hair, L.hair2);
    if (!back) {
      r(ink, 6, 6, 1, 1); r(ink, 9, 6, 1, 1);
      if (L.extra === 'mask') r('#d9d6cf', 5, 7, 6, 2);
      if (L.extra === 'glasses') { r('#1c1c20', 5, 6, 6, 1); r('#7fa3b5', 6, 6, 1, 1); r('#7fa3b5', 9, 6, 1, 1); }
    }
    hat(r, 'v', back, L, accent, coatL);
    drawWeapon(r, back ? 'up' : 'down', weapon);
  } else {
    const right = dir === 'right';
    c.save();
    if (!right) { c.translate(16, 0); c.scale(-1, 1); }
    if (wings) drawWings(r, 'side', frame);
    const f1 = lift === 1 ? 1 : lift === -1 ? -1 : 0;
    r(L.pants, 6 + f1, 16, 2, 5); r(L.pants, 8 - f1, 16, 2, 5);
    r(boots, 6 + f1, 20, 3, 2); r(boots, 8 - f1, 20, 3, 2);
    r(L.coat, 5, 9, 6, 8); r(L.coat2, 5, 9, 1, 8); r(L.coat2, 5, 16, 6, 1); r('#15110f', 5, 14, 6, 1); r(coatL, 9, 9, 2, 1);
    if (L.extra === 'vest') { r('#26221f', 6, 10, 4, 5); r('#3a342e', 8, 12, 2, 2); }
    if (L.extra === 'scarf') r(adj(L.coat2, 40), 6, 9, 5, 2);
    r(L.coat, 7 + f1, 10, 2, 6); r(L.skin, 7 + f1, 16, 2, 1); r(accent, 7 + f1, 12, 2, 2);
    r(L.skin, 5, 3, 6, 6);
    drawHair(r, 'side', L.hairStyle, L.hair, L.hair2);
    r(ink, 9, 6, 1, 1);
    if (L.extra === 'mask') r('#d9d6cf', 8, 7, 3, 2);
    if (L.extra === 'glasses') { r('#1c1c20', 8, 6, 3, 1); r('#7fa3b5', 9, 6, 1, 1); }
    hat(r, 's', false, L, accent, coatL);
    drawWeapon(r, 'side', weapon);
    c.restore();
  }
}

function drawCell(c, dir, frame, L, accent, weapon, wings) { c.save(); c.translate(OX, 0); drawInner(c, dir, frame, L, accent, weapon, wings); c.restore(); }

function hat(r, view, back, L, accent, coatL) {
  const side = view === 's';
  switch (L.hat) {
    case 'cap': r(L.coat2, 5, 2, 6, 2); r(coatL, 5, 2, 6, 1); if (!back) r('#0f0b09', side ? 9 : 5, 4, side ? 3 : 6, 1); break;
    case 'beret': r('#3a1f24', 4, 2, 7, 2); r('#4b2a30', 5, 2, 5, 1); r('#3a1f24', side ? 5 : 4, 3, 2, 2); break;
    case 'helm': r('#3b4036', 4, 2, 8, 3); r('#565d4d', 5, 2, 6, 1); r(accent, 4, 4, 8, 1); break;
    case 'hood': r(L.coat2, 4, 2, 8, 2); r(L.coat2, 4, 3, 1, 6); r(L.coat2, 11, 3, 1, 6); if (back) r(L.coat2, 4, 3, 8, 6); break;
    case 'headset': r('#202226', 5, 2, 6, 1); r('#202226', 4, 5, 1, 3); r('#202226', 11, 5, 1, 3); r(accent, 4, 6, 1, 1); if (!back && !side) r('#202226', 5, 8, 2, 1); break;
    case 'goggles': r('#202226', 5, 4, 6, 1); r('#7fa3b5', 6, 3, 2, 2); r('#7fa3b5', 8, 3, 2, 2); r('#b9d3df', 6, 3, 1, 1); break;
    default: break;
  }
}

const hasWings = (u) => !!u.ab && u.ab.includes('dragon');
const sigOf = (u) => [hasWings(u) ? 'W' : '', u.look.hairStyle, u.look.hair, u.look.hair2 || '', u.weapon, u.look.hat, u.look.extra, u.look.skin, u.look.coat, u.look.coat2, u.look.pants].join('|');

/** 스프라이트 시트(3프레임 × 4방향). 외형이 바뀌면 자동으로 다시 만든다. */
export function getSheet(char) {
  const sig = sigOf(char), hit = cache.get(char.id);
  if (hit && hit.sig === sig) return hit.cv;
  const cv = document.createElement('canvas'); cv.width = CW * 3; cv.height = CH * 4;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  const accent = DEPT[char.dept].color;
  DIRS.forEach((dir, di) => { for (let f = 0; f < 3; f++) { c.save(); c.translate(f * CW, di * CH); drawCell(c, dir, f, char.look, accent, char.weapon, hasWings(char)); c.restore(); } });
  cache.set(char.id, { sig, cv });
  return cv;
}

/** 미리보기용: 임의의 외형(머리/색/무기)으로 한 칸을 그린다. */
export function drawPreview(ctx, char, { dir = 'down', frame = 0, hairStyle, hair, weapon, ab } = {}) {
  const look = { ...char.look, hairStyle: hairStyle ?? char.look.hairStyle, hair: hair ?? char.look.hair };
  drawCell(ctx, dir, frame, look, DEPT[char.dept].color, weapon === undefined ? char.weapon : weapon, hasWings({ ab: ab ?? char.ab }));
}

export function drawShadow(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.38)';
  ctx.fillRect(x - 5, y - 1, 10, 2); ctx.fillRect(x - 4, y - 2, 8, 1); ctx.fillRect(x - 4, y + 1, 8, 1);
}
