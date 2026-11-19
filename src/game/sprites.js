// 캐릭터 스프라이트 — 코드로 그린 16×24 픽셀 캐릭터(첨부 이미지를 복제하지 않고 새로 설계).
// 부서 색은 팔 완장·옷깃 표식으로, 개인 차이는 머리색/겉옷색/모자/장비로 표현한다.
import { DEPT } from './data.js';

export const CW = 16, CH = 24;
const DIRS = ['down', 'left', 'right', 'up'];
export const DIR_INDEX = { down: 0, left: 1, right: 2, up: 3 };
const cache = new Map();

function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
}

function drawCell(c, dir, frame, L, accent) {
  const r = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const lift = frame === 1 ? 1 : frame === 2 ? -1 : 0; // +1: 왼다리 들기, -1: 오른다리 들기
  const ink = '#120d0b';
  const coatL = lighten(L.coat, 14);
  const boots = '#0f0b09';

  if (dir === 'down' || dir === 'up') {
    const back = dir === 'up';
    const ll = lift === 1 ? 1 : 0, rl = lift === -1 ? 1 : 0;
    r(L.pants, 5, 16 - ll, 3, 5); r(L.pants, 8, 16 - rl, 3, 5);
    r(boots, 5, 20 - ll, 3, 2); r(boots, 8, 20 - rl, 3, 2);
    // 몸통
    r(L.coat, 4, 9, 8, 8); r(L.coat2, 11, 9, 1, 8); r(L.coat2, 4, 16, 8, 1); r('#15110f', 4, 14, 8, 1);
    if (!back) { r(L.coat2, 7, 9, 2, 5); r(accent, 7, 10, 2, 3); r(coatL, 4, 9, 1, 5); } else { r(coatL, 4, 9, 8, 1); r(L.coat2, 7, 10, 2, 4); }
    if (L.extra === 'vest') { r('#26221f', 5, 10, 6, 5); r('#3a342e', 5, 12, 2, 2); r('#3a342e', 9, 12, 2, 2); }
    if (L.extra === 'scarf') r(lighten(L.coat2, 40), 5, 9, 6, 2);
    // 팔
    const al = lift === 1 ? 1 : 0, ar = lift === -1 ? 1 : 0;
    r(L.coat, 3, 10 + al, 1, 6); r(L.coat, 12, 10 + ar, 1, 6);
    r(L.skin, 3, 16 + al, 1, 1); r(L.skin, 12, 16 + ar, 1, 1);
    r(accent, back ? 12 : 3, 12 + (back ? ar : al), 1, 2); // 부서 완장
    // 머리
    r(L.skin, 5, 3, 6, 6);
    if (back) r(L.hair, 5, 3, 6, 6);
    else {
      r(L.hair, 5, 3, 6, 2); r(L.hair, 5, 5, 1, 2); r(L.hair, 10, 5, 1, 2);
      r(ink, 6, 6, 1, 1); r(ink, 9, 6, 1, 1);
      if (L.extra === 'mask') r('#d9d6cf', 5, 7, 6, 2);
      if (L.extra === 'glasses') { r('#1c1c20', 5, 6, 6, 1); r('#7fa3b5', 6, 6, 1, 1); r('#7fa3b5', 9, 6, 1, 1); }
    }
    hat(c, r, 'v', back, L, accent, coatL);
  } else {
    const right = dir === 'right';
    c.save();
    if (!right) { c.translate(CW, 0); c.scale(-1, 1); }
    const f1 = lift === 1 ? 1 : lift === -1 ? -1 : 0;
    r(L.pants, 6 + f1, 16, 2, 5); r(L.pants, 8 - f1, 16, 2, 5);
    r(boots, 6 + f1, 20, 3, 2); r(boots, 8 - f1, 20, 3, 2);
    r(L.coat, 5, 9, 6, 8); r(L.coat2, 5, 9, 1, 8); r(L.coat2, 5, 16, 6, 1); r('#15110f', 5, 14, 6, 1); r(coatL, 9, 9, 2, 1);
    if (L.extra === 'vest') { r('#26221f', 6, 10, 4, 5); r('#3a342e', 8, 12, 2, 2); }
    if (L.extra === 'scarf') r(lighten(L.coat2, 40), 6, 9, 5, 2);
    r(L.coat, 7 + f1, 10, 2, 6); r(L.skin, 7 + f1, 16, 2, 1); r(accent, 7 + f1, 12, 2, 2);
    r(L.skin, 5, 3, 6, 6); r(L.hair, 5, 3, 6, 2); r(L.hair, 5, 5, 2, 3);
    r(ink, 9, 6, 1, 1);
    if (L.extra === 'mask') r('#d9d6cf', 8, 7, 3, 2);
    if (L.extra === 'glasses') { r('#1c1c20', 8, 6, 3, 1); r('#7fa3b5', 9, 6, 1, 1); }
    hat(c, r, 's', false, L, accent, coatL);
    c.restore();
  }
}

function hat(c, r, view, back, L, accent, coatL) {
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

export function getSheet(char) {
  if (cache.has(char.id)) return cache.get(char.id);
  const cv = document.createElement('canvas'); cv.width = CW * 3; cv.height = CH * 4;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  const accent = DEPT[char.dept].color;
  DIRS.forEach((dir, di) => { for (let f = 0; f < 3; f++) { c.save(); c.translate(f * CW, di * CH); drawCell(c, dir, f, char.look, accent); c.restore(); } });
  cache.set(char.id, cv);
  return cv;
}

export function drawShadow(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.38)';
  ctx.fillRect(x - 5, y - 1, 10, 2); ctx.fillRect(x - 4, y - 2, 8, 1); ctx.fillRect(x - 4, y + 1, 8, 1);
}
