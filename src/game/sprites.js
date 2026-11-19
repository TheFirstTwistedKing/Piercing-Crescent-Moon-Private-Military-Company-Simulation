// 캐릭터 스프라이트 — 코드로 그린 16×24 픽셀 캐릭터. 머리 스타일/머리색/무기는 커스터마이징으로 바뀌며 즉시 다시 그려진다.
import { DEPT } from './data.js';
import { drawHair, adj } from './hair.js';
import { drawWeapon } from './weapons.js';

export const CW = 16, CH = 24;
const DIRS = ['down', 'left', 'right', 'up'];
export const DIR_INDEX = { down: 0, left: 1, right: 2, up: 3 };
const cache = new Map();

// 드래곤 날개: 왼쪽 날개 모양을 좌우로 대칭해 그린다(x0=뼈대, x3=몸쪽 그림자). 걷는 프레임에서는 한 칸 내려가며 날갯짓.
const WING_ROWS = { 2: [0], 3: [0, 1], 4: [0, 1, 2], 5: [0, 1, 2], 6: [0, 1, 2, 3], 7: [0, 1, 2, 3], 8: [0, 1, 2, 3], 9: [0, 1, 2, 3], 10: [0, 1, 2, 3], 11: [0, 2, 3], 12: [0, 3], 13: [0] };
function drawWings(r, view, frame) {
  const fy = frame ? 1 : 0, mem = '#8a2230', dk = '#4f111c', bone = '#e0d3b4', hl = '#b8404c';
  const side = (mirror) => {
    for (const [y, xs] of Object.entries(WING_ROWS)) for (const x of xs) r(x === 0 ? bone : x === 3 ? dk : x === 1 && +y % 3 === 0 ? hl : mem, mirror ? 15 - x : x, +y + fy, 1, 1);
    r(dk, mirror ? 11 : 4, 9 + fy, 1, 3); // 어깨 연결부
  };
  side(false); if (view !== 'side') side(true);
}

function drawCell(c, dir, frame, L, accent, weapon, wings) {
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
    drawHair(r, back ? 'up' : 'down', L.hairStyle, L.hair);
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
    if (!right) { c.translate(CW, 0); c.scale(-1, 1); }
    if (wings) drawWings(r, 'side', frame);
    const f1 = lift === 1 ? 1 : lift === -1 ? -1 : 0;
    r(L.pants, 6 + f1, 16, 2, 5); r(L.pants, 8 - f1, 16, 2, 5);
    r(boots, 6 + f1, 20, 3, 2); r(boots, 8 - f1, 20, 3, 2);
    r(L.coat, 5, 9, 6, 8); r(L.coat2, 5, 9, 1, 8); r(L.coat2, 5, 16, 6, 1); r('#15110f', 5, 14, 6, 1); r(coatL, 9, 9, 2, 1);
    if (L.extra === 'vest') { r('#26221f', 6, 10, 4, 5); r('#3a342e', 8, 12, 2, 2); }
    if (L.extra === 'scarf') r(adj(L.coat2, 40), 6, 9, 5, 2);
    r(L.coat, 7 + f1, 10, 2, 6); r(L.skin, 7 + f1, 16, 2, 1); r(accent, 7 + f1, 12, 2, 2);
    r(L.skin, 5, 3, 6, 6);
    drawHair(r, 'side', L.hairStyle, L.hair);
    r(ink, 9, 6, 1, 1);
    if (L.extra === 'mask') r('#d9d6cf', 8, 7, 3, 2);
    if (L.extra === 'glasses') { r('#1c1c20', 8, 6, 3, 1); r('#7fa3b5', 9, 6, 1, 1); }
    hat(r, 's', false, L, accent, coatL);
    drawWeapon(r, 'side', weapon);
    c.restore();
  }
}

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
const sigOf = (u) => [hasWings(u) ? 'W' : '', u.look.hairStyle, u.look.hair, u.weapon, u.look.hat, u.look.extra, u.look.skin, u.look.coat, u.look.coat2, u.look.pants].join('|');

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
