// 캐릭터 스프라이트 — 코드로 그린 16×24 픽셀 캐릭터. 머리 스타일/머리색/무기는 커스터마이징으로 바뀌며 즉시 다시 그려진다.
import { DEPT } from './data.js';
import { drawHair, adj } from './hair.js';
import { drawWeapon, WEAPON } from './weapons.js';
import { RES } from './res.js';

export const CW = 32, CH = 24, OX = 8; // 논리 칸 기준: 날개가 펼쳐질 좌우 여백 8칸 씩 (몸은 셀 안 x=8..23)
export const PAD = 1;                    // 외곽선이 잘리지 않도록 사방에 1칸 여유
export const SW = (CW + PAD * 2) * RES, SH = (CH + PAD * 2) * RES;   // 셀 하나의 실제 픽셀 크기(2배 해상도)
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

// 사람(몸·머리·얼굴·옷·팔다리)은 반 칸(실제 1픽셀) 해상도로 직접 그린다. 비율은 첨부 도트 스타일(큰 머리·큰 눈·셀 음영·짙은 갈색 외곽선)을 따르고,
// 좌표 D(색, x, y, w, h)는 몸 기준 실제 픽셀(논리 칸 ×2) 단위다. 머리카락·모자·날개는 기존 도안(논리 칸)을 그대로 얹는다.
const hash = (str) => { let h = 7; for (const ch of str) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0; return Math.abs(h); };
const EYES = ['#3a82d0', '#6a4a30', '#3f9a62', '#8a5ac8', '#38404c'];
function drawInner(c, dir, frame, L0, accent, weapon, wings, rec) {
  const L = L0;
  const r = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };            // 논리 칸 좌표(머리카락·모자·무기·날개)
  const D = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x / 2, y / 2, w / 2, h / 2); };   // 실제 픽셀 좌표
  const lift = frame === 1 ? 1 : frame === 2 ? -1 : 0; // +1: 왼다리 들기, -1: 오른다리 들기
  const coatL = adj(L.coat, 16), coatD = adj(L.coat, -26), coat2L = adj(L.coat2, 14), coat2D = adj(L.coat2, -22), skinD = adj(L.skin, -38), skinL = adj(L.skin, 14), skinM = adj(L.skin, -18);
  const pantsL = adj(L.pants, 18), pantsD = adj(L.pants, -14), browC = adj(L.hair, -34), lip = '#a25a52', white = '#f4f0e8', lash = '#2a1c1a';
  const iris = EYES[hash(L.skin + L.coat) % EYES.length], irisL = adj(iris, 44), irisD = adj(iris, -40);
  const boots = '#17110e', bootL = '#3a2f29', sole = '#050403', shirt = adj(L.coat2, 36), lace = '#6a5a4c';
  const isGun = WEAPON[weapon]?.art?.kind === 'gun';
  const hairStage = (draw) => { rec.before = c.getImageData(0, 0, SW, SH).data; draw(); rec.after = c.getImageData(0, 0, SW, SH).data; };
  const eye = (x, y) => { D(lash, x, y, 3, 1); D(irisD, x, y + 1, 3, 1); D(iris, x + 1, y + 1, 2, 1); D(white, x, y + 1, 1, 1); D(irisL, x, y + 2, 3, 1); D(iris, x + 1, y + 2, 1, 1); };
  const headBase = (x0) => { D(L.skin, x0 + 1, 6, 10, 1); D(L.skin, x0, 7, 12, 10); D(L.skin, x0 + 1, 17, 10, 1); D(skinD, x0 + 1, 17, 10, 1); D(skinD, x0 + 11, 8, 1, 9); D(skinL, x0 + 1, 7, 2, 1); };

  if (dir === 'down' || dir === 'up') {
    const back = dir === 'up';
    if (wings && !back) drawWings(r, 'down', frame);
    const l2 = lift === 1 ? 2 : 0, r2 = lift === -1 ? 2 : 0;
    // 다리 + 부츠
    D(L.pants, 10, 32 - l2, 6, 9); D(L.pants, 16, 32 - r2, 6, 9);
    D(pantsL, 10, 33 - l2, 1, 8); D(pantsL, 16, 33 - r2, 1, 8); D(pantsD, 15, 33 - l2, 1, 8); D(pantsD, 21, 33 - r2, 1, 8); D(pantsL, 11, 37 - l2, 3, 1); D(pantsL, 17, 37 - r2, 3, 1); D(pantsD, 12, 35 - l2, 1, 2); D(pantsD, 18, 35 - r2, 1, 2);
    D(boots, 10, 40 - l2, 6, 4); D(boots, 16, 40 - r2, 6, 4); D(bootL, 10, 40 - l2, 6, 1); D(bootL, 10, 41 - l2, 2, 1); D(bootL, 16, 41 - r2, 2, 1); D(sole, 10, 43 - l2, 6, 1); D(sole, 16, 43 - r2, 6, 1);
    if (!back) { D(lace, 12, 41 - l2, 2, 1); D(lace, 18, 41 - r2, 2, 1); }
    // 몸통
    D(L.coat, 9, 19, 14, 1); D(L.coat, 8, 20, 16, 14); D(coatL, 9, 19, 5, 1); D(coatL, 8, 20, 2, 9); D(coatD, 22, 20, 2, 13); D(coatD, 8, 33, 16, 1);
    D(L.coat2, 8, 32, 16, 2); D(coat2D, 8, 33, 16, 1); D('#16110e', 8, 28, 16, 2); D('#2c241d', 8, 28, 16, 1);
    D('#c9a24a', 15, 28, 2, 2); D('#6e5a2a', 16, 29, 1, 1); D('#f0d48a', 15, 28, 1, 1);
    if (!back) {
      D(shirt, 13, 19, 6, 2); D(shirt, 14, 21, 4, 3); D(shirt, 15, 24, 2, 4); D(adj(shirt, -40), 14, 21, 1, 3); D(adj(shirt, -40), 15, 24, 1, 4);   // 안쪽 셔츠(V넥)
      D(accent, 15, 25, 2, 3); D(adj(accent, 40), 15, 25, 1, 1); D(coat2D, 13, 21, 1, 7); D(coat2D, 18, 21, 1, 7);   // 부서 표식 · 겉옷 안단
      D(coatD, 10, 25, 4, 1); D(coatL, 10, 24, 4, 1); D(coatD, 18, 25, 4, 1); D(coatL, 18, 24, 4, 1); D(coat2D, 10, 24, 1, 2); D(coat2D, 21, 24, 1, 2);   // 가슴 주머니
    } else {
      D(coat2D, 15, 20, 2, 12); D(coatD, 11, 21, 1, 7); D(coatD, 20, 21, 1, 7); D(accent, 15, 22, 2, 2); D(coatL, 9, 19, 14, 1); D(L.coat2, 9, 20, 14, 1);
    }
    if (L.extra === 'vest') { D('#26221f', 10, 21, 12, 9); D('#3a342e', 10, 25, 4, 4); D('#3a342e', 18, 25, 4, 4); D('#4a443c', 10, 25, 4, 1); D('#4a443c', 18, 25, 4, 1); D('#14110e', 15, 21, 2, 8); }
    if (L.extra === 'scarf') { D(adj(L.coat2, 40), 10, 19, 12, 4); D(adj(L.coat2, 20), 10, 22, 12, 1); D(adj(L.coat2, 56), 10, 19, 12, 1); }
    // 팔(소매 · 커프스 · 손)
    const al = lift === 1 ? 2 : 0, ar = lift === -1 ? 2 : 0, arm = (x, off, left) => {
      D(L.coat, x, 20 + off, 3, 9); D(left ? coatL : coatD, left ? x : x + 2, 20 + off, 1, 9); D(left ? coatD : coatL, left ? x + 2 : x, 21 + off, 1, 8);
      D(L.coat2, x, 28 + off, 3, 1); D(coat2D, x, 29 + off, 3, 1);
      D(L.skin, x, 30 + off, 3, 4); D(skinD, x, 32 + off, 3, 1); D(skinD, left ? x + 2 : x, 30 + off, 1, 3); D(skinL, left ? x : x + 2, 30 + off, 1, 2); D(skinM, x + 1, 33 + off, 1, 1);
      D(accent, x, 23 + off, 3, 2); D(adj(accent, 36), x, 23 + off, 3, 1);
    };
    arm(5, al, true); arm(24, ar, false);
    if (wings && back) drawWings(r, 'up', frame);
    // 머리
    headBase(10); D(skinD, 14, 18, 4, 1);
    if (back) D(skinD, 11, 16, 10, 1);
    hairStage(() => drawHair(r, back ? 'up' : 'down', L.hairStyle, L.hair, L.hair2));
    if (!back) {
      D(skinD, 10, 12, 12, 1); D(L.skin, 9, 14, 1, 3); D(L.skin, 22, 14, 1, 3); D(skinD, 9, 15, 1, 1); D(skinD, 22, 15, 1, 1);          // 앞머리 그림자 · 귀
      eye(11, 13); eye(18, 13); D(browC, 11, 12, 3, 1); D(browC, 18, 12, 3, 1);
      D(skinD, 15, 15, 2, 1); D(lip, 15, 16, 2, 1); D('rgba(224,110,100,.40)', 10, 16, 2, 1); D('rgba(224,110,100,.40)', 20, 16, 2, 1);
      if (L.extra === 'mask') D('#d9d6cf', 10, 14, 12, 4);
      if (L.extra === 'glasses') { D('#1c1c20', 10, 13, 12, 1); D('#1c1c20', 14, 14, 4, 1); D('rgba(150,200,225,.55)', 11, 14, 3, 2); D('rgba(150,200,225,.55)', 18, 14, 3, 2); D('#e8f6ff', 11, 14, 1, 1); D('#e8f6ff', 18, 14, 1, 1); }
    }
    hat(r, 'v', back, L, accent, coatL);
    drawWeapon(r, back ? 'up' : 'down', weapon);
    if (isGun) gunHand(r, back ? 'up' : 'down', L, skinD, al, ar);
  } else {
    const right = dir === 'right';
    c.save();
    if (!right) { c.translate(16, 0); c.scale(-1, 1); }
    if (wings) drawWings(r, 'side', frame);
    const f1 = lift === 1 ? 2 : lift === -1 ? -2 : 0;
    // 다리 + 부츠 (옆모습: 뒷다리 → 앞다리)
    D(pantsD, 12 + f1, 32, 4, 9); D(L.pants, 16 - f1, 32, 4, 9); D(pantsL, 16 - f1, 33, 1, 8); D(pantsL, 17 - f1, 37, 2, 1); D(pantsD, 19 - f1, 33, 1, 8);
    D(boots, 12 + f1, 40, 5, 4); D(boots, 16 - f1, 40, 6, 4); D(bootL, 16 - f1, 40, 6, 1); D(bootL, 19 - f1, 41, 2, 1); D(sole, 12 + f1, 43, 5, 1); D(sole, 16 - f1, 43, 6, 1); D(lace, 18 - f1, 41, 1, 1);
    // 몸통(옆)
    D(L.coat, 11, 19, 10, 1); D(L.coat, 10, 20, 12, 14); D(coatL, 17, 19, 4, 1); D(coatL, 20, 20, 2, 8); D(coatD, 10, 20, 2, 13); D(coatD, 10, 33, 12, 1);
    D(L.coat2, 10, 32, 12, 2); D(coat2D, 10, 33, 12, 1); D('#16110e', 10, 28, 12, 2); D('#2c241d', 10, 28, 12, 1); D('#c9a24a', 19, 28, 2, 2); D('#6e5a2a', 20, 29, 1, 1);
    D(coatD, 13, 21, 1, 8);
    if (L.extra === 'vest') { D('#26221f', 12, 21, 8, 9); D('#3a342e', 16, 25, 4, 4); D('#4a443c', 16, 25, 4, 1); }
    if (L.extra === 'scarf') { D(adj(L.coat2, 40), 12, 19, 10, 4); D(adj(L.coat2, 56), 12, 19, 10, 1); }
    // 앞쪽 팔(가려진 반대 팔은 몸통 뒤라 생략)
    D(L.coat, 14 + f1, 20, 4, 9); D(coatL, 14 + f1, 20, 1, 9); D(coatD, 17 + f1, 21, 1, 8); D(L.coat2, 14 + f1, 28, 4, 1); D(coat2D, 14 + f1, 29, 4, 1); D(accent, 14 + f1, 23, 4, 2); D(adj(accent, 36), 14 + f1, 23, 4, 1);
    D(L.skin, 14 + f1, 30, 4, 4); D(skinD, 14 + f1, 32, 4, 1); D(skinD, 17 + f1, 30, 1, 3); D(skinL, 14 + f1, 30, 1, 2); D(skinM, 15 + f1, 33, 2, 1);
    // 머리(옆)
    headBase(10); D(skinD, 14, 18, 4, 1);
    hairStage(() => drawHair(r, 'side', L.hairStyle, L.hair, L.hair2));
    D(skinD, 10, 12, 12, 1); D(L.skin, 22, 15, 1, 2); D(skinD, 22, 16, 1, 1);                                              // 앞머리 그림자 · 코
    D(skinD, 13, 14, 2, 3); D(skinM, 13, 14, 2, 1); D(skin2(L), 14, 15, 1, 1);                                              // 귀
    eye(17, 13); D(browC, 17, 12, 4, 1); D(lip, 19, 16, 2, 1); D('rgba(224,110,100,.40)', 17, 16, 2, 1);
    if (L.extra === 'mask') D('#d9d6cf', 16, 14, 6, 4);
    if (L.extra === 'glasses') { D('#1c1c20', 16, 13, 6, 1); D('rgba(150,200,225,.55)', 17, 14, 3, 2); D('#e8f6ff', 17, 14, 1, 1); }
    hat(r, 's', false, L, accent, coatL);
    drawWeapon(r, 'side', weapon);
    if (isGun) gunHand(r, 'side', L, skinD, 0, 0);
    c.restore();
  }
}
const skin2 = (L) => adj(L.skin, -58);

// 총을 쥔 손: 총기 손잡이 위로 손바닥·엄지·손가락 마디를 반 칸 단위로 덮는다. (손은 방향마다 총 도안의 손 위치와 같은 곳)
function gunHand(r, view, L, skinD, al, ar) {
  const [hx, hy] = view === 'down' ? [12, 15] : view === 'up' ? [3, 15] : [10, 15], dir = view === 'up' ? -1 : 1, X = (x, w = 1) => (dir > 0 ? hx + x : hx + 1 - x - w);
  r(L.skin, X(0), hy - 0.5, 1, 1.5); r(skinD, X(0), hy + 0.5, 1, 0.5);                // 손등/손바닥
  r(L.skin, X(1, 0.5), hy, 0.5, 1); r(skinD, X(1, 0.5), hy + 0.5, 0.5, 0.5);            // 방아쇠울 앞 손가락
  r(adj(L.skin, 16), X(0), hy - 0.5, 0.5, 0.5); r(adj(L.skin, 10), X(1, 0.5), hy - 0.5, 0.5, 0.5);   // 엄지 · 반사광
  r(skinD, X(0), hy, 1, 0.5);                                                         // 손가락 마디 사이 그림자
}

export const finishCanvas = (c, w, h) => finish(c, {}, w, h);   // 다른 도트(무법자 등)에도 같은 외곽선·음영 마감을 쓴다
function drawCell(c, dir, frame, L, accent, weapon, wings) {
  const rec = {};
  c.save(); c.scale(RES, RES); c.translate(PAD + OX, PAD); drawInner(c, dir, frame, L, accent, weapon, wings, rec); c.restore();
  finish(c, rec);
}

// 마감 처리: ① 실루엣 바깥에 반 칸 두께의 짙은 외곽선(바깥 색을 어둡게 — 선택적 외곽선) ② 실루엣 가장자리 음영(위·왼쪽은 밝게, 아래·오른쪽은 어둡게)
// ③ 머리카락은 위쪽 광택 띠 + 가닥 무늬 + 아래쪽 그림자. 모두 반 칸 해상도에서 한 번만 계산해 시트에 구워 둔다.
function finish(c, rec, W = SW, H = SH) {
  const SW = W, SH = H;
  const img = c.getImageData(0, 0, SW, SH), d = img.data, src = new Uint8ClampedArray(d), opaque = (x, y) => x >= 0 && y >= 0 && x < SW && y < SH && src[(y * SW + x) * 4 + 3] > 127;
  const hair = rec.before && rec.after ? (x, y) => { const i = (y * SW + x) * 4; return rec.after[i + 3] > 127 && (rec.before[i] !== rec.after[i] || rec.before[i + 1] !== rec.after[i + 1] || rec.before[i + 2] !== rec.after[i + 2] || rec.before[i + 3] !== rec.after[i + 3]) && src[i] === rec.after[i] && src[i + 1] === rec.after[i + 1] && src[i + 2] === rec.after[i + 2]; } : () => false;
  const mix = (i, t, to) => { for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, src[i + k] + (to - src[i + k]) * t)); };
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const i = (y * SW + x) * 4;
    if (src[i + 3] > 127) {
      const up = !opaque(x, y - 1), lf = !opaque(x - 1, y), dn = !opaque(x, y + 1), rt = !opaque(x + 1, y);
      if (hair(x, y)) {
        const hu = !hair(x, y - 1) || !opaque(x, y - 1), hd = !hair(x, y + 1) || !opaque(x, y + 1);
        if (hu) mix(i, 0.3, 255); else if (hd) mix(i, 0.22, 0); else if (y % 7 === 3) mix(i, 0.1, 255);
      } else if (up) mix(i, 0.22, 255); else if (lf) mix(i, 0.08, 255);
      if (dn) mix(i, 0.26, 0); else if (rt) mix(i, 0.14, 0);
    } else {
      let n = 0, R = 0, G = 0, B = 0;
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) if (opaque(x + dx, y + dy)) { const j = ((y + dy) * SW + x + dx) * 4; R += src[j]; G += src[j + 1]; B += src[j + 2]; n++; }
      if (n) { d[i] = (R / n) * 0.3 + 4; d[i + 1] = (G / n) * 0.3 + 3; d[i + 2] = (B / n) * 0.3 + 3; d[i + 3] = 235; }
    }
  }
  c.putImageData(img, 0, 0);
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
const sigOf = (u) => [hasWings(u) ? 'W' : '', u.look.hairStyle, u.look.hair, u.look.hair2 || '', u.weapon, u.look.hat, u.look.extra, u.look.skin, u.look.coat, u.look.coat2, u.look.pants].join('|');

// 셀 하나를 별도 캔버스(SW×SH)에 그려 마감(외곽선·음영)까지 끝낸 뒤 돌려준다. 같은 캔버스를 재사용하므로 호출 즉시 복사해야 한다.
let scratch = null;
function cellCanvas(dir, frame, L, accent, weapon, wings) {
  if (!scratch) { scratch = Object.assign(document.createElement('canvas'), { width: SW, height: SH }); scratch.ctx = scratch.getContext('2d', { willReadFrequently: true }); scratch.ctx.imageSmoothingEnabled = false; }
  scratch.ctx.clearRect(0, 0, SW, SH); drawCell(scratch.ctx, dir, frame, L, accent, weapon, wings);
  return scratch;
}

/** 스프라이트 시트(3프레임 × 4방향, 셀 SW×SH 실제 픽셀). 외형이 바뀌면 자동으로 다시 만든다. */
export function getSheet(char) {
  const sig = sigOf(char), hit = cache.get(char.id);
  if (hit && hit.sig === sig) return hit.cv;
  const cv = document.createElement('canvas'); cv.width = SW * 3; cv.height = SH * 4;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  const accent = DEPT[char.dept].color;
  DIRS.forEach((dir, di) => { for (let f = 0; f < 3; f++) c.drawImage(cellCanvas(dir, f, char.look, accent, char.weapon, hasWings(char)), f * SW, di * SH); });
  cache.set(char.id, { sig, cv });
  return cv;
}
/** 시트에서 (프레임, 방향) 한 칸을 월드/화면에 그린다. (x, y)는 몸 기준점이 아니라 셀의 왼쪽 위 — 논리 좌표 */
export function drawCellAt(g, char, frame, dir, x, y) { g.drawImage(getSheet(char), frame * SW, DIR_INDEX[dir] * SH, SW, SH, x - PAD, y - PAD, CW + PAD * 2, CH + PAD * 2); }

/** 미리보기용: 임의의 외형(머리/색/무기)으로 한 칸을 SW×SH 픽셀 캔버스에 그린다. */
export function drawPreview(ctx, char, { dir = 'down', frame = 0, hairStyle, hair, weapon, ab } = {}) {
  const look = { ...char.look, hairStyle: hairStyle ?? char.look.hairStyle, hair: hair ?? char.look.hair };
  ctx.drawImage(cellCanvas(dir, frame, look, DEPT[char.dept].color, weapon === undefined ? char.weapon : weapon, hasWings({ ab: ab ?? char.ab })), 0, 0);
}

export function drawShadow(ctx, x, y) {   // 반 칸 단위의 부드러운 타원 그림자
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x - 6, y - 0.5, 12, 1.5); ctx.fillRect(x - 5, y - 1.5, 10, 3.5);
  ctx.fillStyle = 'rgba(0,0,0,.26)'; ctx.fillRect(x - 5, y - 0.5, 10, 1.5); ctx.fillRect(x - 4, y - 1, 8, 2.5);
}
