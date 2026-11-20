// 캐릭터 스프라이트 — 코드로 그린 16×24 픽셀 캐릭터. 머리 스타일/머리색/무기는 커스터마이징으로 바뀌며 즉시 다시 그려진다.
import { DEPT } from './data.js';
import { drawHair, adj } from './hair.js';
import { drawWeapon, WEAPON, gunHandX } from './weapons.js';
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

// 사람(몸·머리·얼굴·옷·팔다리)은 실제 픽셀 해상도로 직접 그린다. 비율은 첨부 도트(큰 머리 · 큰 눈 · 셀 음영 · 짙은 외곽선)를 따른다:
// 머리 x8..23 × y4..21(키의 약 37%), 몸통 x9..22 × y22..32, 팔 x6..8 / x23..25, 다리 x11..20 × y33..43. 좌표 D(색, x, y, w, h)는 몸 기준 실제 픽셀(논리 칸 ×2).
const hash = (str) => { let h = 7; for (const ch of str) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0; return Math.abs(h); };
const EYES = ['#3a82d0', '#6a4a30', '#3f9a62', '#8a5ac8', '#38404c'];
function drawInner(c, dir, frame, L0, accent, weapon, wings, rec) {
  const L = L0;
  const r = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };            // 논리 칸 좌표(날개·무기)
  const D = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x / 2, y / 2, w / 2, h / 2); };   // 실제 픽셀 좌표
  const lift = frame === 1 ? 1 : frame === 2 ? -1 : 0; // +1: 왼다리 들기, -1: 오른다리 들기
  const coatL = adj(L.coat, 16), coatD = adj(L.coat, -26), coat2D = adj(L.coat2, -22), skinD = adj(L.skin, -38), skinL = adj(L.skin, 14), skinM = adj(L.skin, -18);
  const pantsL = adj(L.pants, 18), pantsD = adj(L.pants, -14), browC = adj(L.hair, -34), lip = '#a25a52', white = '#f4f0e8', lash = '#2a1c1a';
  const iris = EYES[hash(L.skin + L.coat) % EYES.length], irisL = adj(iris, 46), irisD = adj(iris, -42);
  const boots = '#17110e', bootL = '#3a2f29', sole = '#050403', shirt = adj(L.coat2, 36), lace = '#6a5a4c';
  const isGun = WEAPON[weapon]?.art?.kind === 'gun';
  const hairStage = (draw) => { rec.before = c.getImageData(0, 0, SW, SH).data; draw(); rec.after = c.getImageData(0, 0, SW, SH).data; };
  // 큰 눈(4×5): 눈꺼풀 선 · 어두운 윗부분 · 반짝임 · 밝은 아랫부분
  const eye = (x, y) => { D(lash, x, y, 4, 1); D(irisD, x, y + 1, 1, 3); D(irisD, x + 1, y + 1, 3, 1); D(white, x + 1, y + 1, 1, 1); D(iris, x + 1, y + 2, 3, 1); D(iris, x, y + 3, 4, 1); D(irisL, x + 1, y + 4, 2, 1); D(irisL, x + 3, y + 3, 1, 1); };
  const headBase = () => { D(L.skin, 10, 7, 12, 1); D(L.skin, 8, 8, 16, 12); D(L.skin, 9, 20, 14, 1); D(L.skin, 10, 21, 12, 1); D(skinD, 22, 9, 2, 11); D(skinD, 21, 20, 1, 1); D(skinD, 10, 21, 12, 1); D(skinL, 8, 9, 2, 6); D(skinD, 9, 11, 14, 2); };

  if (dir === 'down' || dir === 'up') {
    const back = dir === 'up';
    if (wings && !back) drawWings(r, 'down', frame);
    const l2 = lift === 1 ? 2 : 0, r2 = lift === -1 ? 2 : 0;
    // 다리(바지 → 부츠)
    D(L.pants, 11, 33 - l2, 5, 7); D(L.pants, 16, 33 - r2, 5, 7);
    D(pantsL, 11, 34 - l2, 1, 6); D(pantsL, 16, 34 - r2, 1, 6); D(pantsD, 15, 34 - l2, 1, 6); D(pantsD, 20, 34 - r2, 1, 6); D(pantsL, 12, 37 - l2, 3, 1); D(pantsL, 17, 37 - r2, 3, 1); D(pantsD, 13, 35 - l2, 1, 2); D(pantsD, 18, 35 - r2, 1, 2);
    D(boots, 11, 40 - l2, 5, 4); D(boots, 16, 40 - r2, 5, 4); D(bootL, 11, 40 - l2, 5, 1); D(bootL, 11, 41 - l2, 2, 1); D(bootL, 16, 41 - r2, 2, 1); D(sole, 11, 43 - l2, 5, 1); D(sole, 16, 43 - r2, 5, 1);
    if (!back) { D(lace, 13, 41 - l2, 2, 1); D(lace, 18, 41 - r2, 2, 1); }
    // 몸통
    D(L.coat, 10, 22, 12, 1); D(L.coat, 9, 23, 14, 10); D(coatL, 10, 22, 4, 1); D(coatL, 9, 23, 2, 7); D(coatD, 21, 23, 2, 10); D(coatD, 9, 32, 14, 1);
    D(L.coat2, 9, 31, 14, 2); D(coat2D, 9, 32, 14, 1); D('#16110e', 9, 29, 14, 2); D('#2c241d', 9, 29, 14, 1);
    D('#c9a24a', 15, 29, 2, 2); D('#6e5a2a', 16, 30, 1, 1); D('#f0d48a', 15, 29, 1, 1);
    if (!back) {
      D(shirt, 13, 22, 6, 2); D(shirt, 14, 24, 4, 3); D(shirt, 15, 27, 2, 2); D(adj(shirt, -40), 14, 24, 1, 3); D(adj(shirt, -40), 15, 27, 1, 2); D(coat2D, 13, 24, 1, 5); D(coat2D, 18, 24, 1, 5);
      D(accent, 15, 25, 2, 2); D(adj(accent, 40), 15, 25, 1, 1);
      D(coatD, 10, 27, 3, 1); D(coatL, 10, 26, 3, 1); D(coatD, 19, 27, 3, 1); D(coatL, 19, 26, 3, 1);
    } else {
      D(coat2D, 15, 23, 2, 8); D(coatD, 11, 24, 1, 5); D(coatD, 20, 24, 1, 5); D(accent, 15, 24, 2, 2); D(coatL, 10, 23, 12, 1);
    }
    if (L.extra === 'vest') { D('#26221f', 11, 23, 10, 8); D('#3a342e', 11, 26, 3, 3); D('#3a342e', 18, 26, 3, 3); D('#4a443c', 11, 26, 3, 1); D('#4a443c', 18, 26, 3, 1); D('#14110e', 15, 23, 2, 7); }
    if (L.extra === 'scarf') { D(adj(L.coat2, 40), 10, 21, 12, 4); D(adj(L.coat2, 20), 10, 24, 12, 1); D(adj(L.coat2, 56), 10, 21, 12, 1); }
    // 팔(소매 · 커프스 · 손)
    const al = lift === 1 ? 2 : 0, ar = lift === -1 ? 2 : 0, arm = (x, off, left) => {
      D(L.coat, x, 23 + off, 3, 8); D(left ? coatL : coatD, left ? x : x + 2, 23 + off, 1, 8); D(left ? coatD : coatL, left ? x + 2 : x, 24 + off, 1, 7);
      D(L.coat2, x, 30 + off, 3, 1); D(coat2D, x, 31 + off, 3, 1);
      D(L.skin, x, 31 + off, 3, 4); D(skinD, x, 34 + off, 3, 1); D(skinD, left ? x + 2 : x, 32 + off, 1, 2); D(skinL, left ? x : x + 2, 31 + off, 1, 2); D(skinM, x + 1, 33 + off, 1, 1);
      D(accent, x, 25 + off, 3, 2); D(adj(accent, 36), x, 25 + off, 3, 1);
    };
    arm(6, al, true); arm(23, ar, false);
    if (wings && back) drawWings(r, 'up', frame);
    // 머리
    headBase(); D(skinD, 13, 21, 6, 1);
    hairStage(() => drawHair(r, back ? 'up' : 'down', L.hairStyle, L.hair, L.hair2));
    if (!back) {
      D(L.skin, 7, 14, 1, 4); D(skinD, 7, 15, 1, 2); D(L.skin, 24, 14, 1, 4); D(skinD, 24, 15, 1, 2);       // 귀
      eye(10, 13); eye(18, 13); D(browC, 10, 12, 4, 1); D(browC, 18, 12, 4, 1);
      D(skinD, 15, 18, 2, 1); D(lip, 15, 19, 2, 1); D('rgba(224,110,100,.42)', 9, 18, 2, 1); D('rgba(224,110,100,.42)', 21, 18, 2, 1);
      if (L.extra === 'mask') D('#d9d6cf', 9, 18, 14, 4);
      if (L.extra === 'glasses') { D('#1c1c20', 9, 12, 6, 1); D('#1c1c20', 17, 12, 6, 1); D('#1c1c20', 9, 18, 6, 1); D('#1c1c20', 17, 18, 6, 1); D('#1c1c20', 9, 13, 1, 5); D('#1c1c20', 14, 13, 1, 5); D('#1c1c20', 17, 13, 1, 5); D('#1c1c20', 22, 13, 1, 5); D('#1c1c20', 15, 14, 2, 1); D('rgba(150,200,225,.30)', 10, 13, 4, 5); D('rgba(150,200,225,.30)', 18, 13, 4, 5); }
    } else D(skinD, 10, 20, 12, 1);
    hatNative(D, back ? 'up' : 'down', L, accent, coatL);
    drawWeapon(r, back ? 'up' : 'down', weapon);
    if (isGun) gunHand(r, back ? 'up' : 'down', L, skinD, weapon);
  } else {
    const right = dir === 'right';
    c.save();
    if (!right) { c.translate(16, 0); c.scale(-1, 1); }
    if (wings) drawWings(r, 'side', frame);
    const f1 = lift === 1 ? 2 : lift === -1 ? -2 : 0;
    // 다리(뒷다리 → 앞다리)
    D(pantsD, 12 + f1, 33, 4, 7); D(L.pants, 16 - f1, 33, 4, 7); D(pantsL, 16 - f1, 34, 1, 6); D(pantsL, 17 - f1, 37, 2, 1); D(pantsD, 19 - f1, 34, 1, 6); D(pantsD, 14 + f1, 35, 1, 2);
    D(boots, 12 + f1, 40, 4, 4); D(boots, 16 - f1, 40, 5, 4); D(bootL, 16 - f1, 40, 5, 1); D(bootL, 18 - f1, 41, 2, 1); D(sole, 12 + f1, 43, 4, 1); D(sole, 16 - f1, 43, 5, 1); D(lace, 17 - f1, 41, 1, 1);
    // 몸통(옆)
    D(L.coat, 11, 22, 10, 1); D(L.coat, 10, 23, 12, 10); D(coatL, 17, 22, 4, 1); D(coatL, 20, 23, 2, 6); D(coatD, 10, 23, 2, 10); D(coatD, 10, 32, 12, 1);
    D(L.coat2, 10, 31, 12, 2); D(coat2D, 10, 32, 12, 1); D('#16110e', 10, 29, 12, 2); D('#2c241d', 10, 29, 12, 1); D('#c9a24a', 19, 29, 2, 2); D('#6e5a2a', 20, 30, 1, 1);
    D(coatD, 13, 24, 1, 6);
    if (L.extra === 'vest') { D('#26221f', 12, 23, 8, 8); D('#3a342e', 16, 26, 4, 3); D('#4a443c', 16, 26, 4, 1); }
    if (L.extra === 'scarf') { D(adj(L.coat2, 40), 12, 21, 10, 4); D(adj(L.coat2, 56), 12, 21, 10, 1); }
    // 앞쪽 팔
    D(L.coat, 14 + f1, 23, 4, 8); D(coatL, 14 + f1, 23, 1, 8); D(coatD, 17 + f1, 24, 1, 7); D(L.coat2, 14 + f1, 30, 4, 1); D(coat2D, 14 + f1, 31, 4, 1); D(accent, 14 + f1, 25, 4, 2); D(adj(accent, 36), 14 + f1, 25, 4, 1);
    D(L.skin, 14 + f1, 31, 4, 4); D(skinD, 14 + f1, 34, 4, 1); D(skinD, 17 + f1, 32, 1, 2); D(skinL, 14 + f1, 31, 1, 2); D(skinM, 15 + f1, 33, 2, 1);
    // 머리(옆)
    headBase(); D(skinD, 13, 21, 6, 1);
    hairStage(() => drawHair(r, 'side', L.hairStyle, L.hair, L.hair2));
    D(L.skin, 24, 16, 1, 2); D(skinD, 24, 18, 1, 1);                                                             // 코
    D(skinD, 12, 14, 3, 4); D(skinM, 12, 14, 3, 1); D(adj(L.skin, -58), 13, 15, 1, 2);                         // 귀
    eye(18, 13); D(browC, 18, 12, 5, 1); D(lip, 21, 19, 2, 1); D('rgba(224,110,100,.42)', 18, 18, 2, 1);
    if (L.extra === 'mask') D('#d9d6cf', 16, 18, 8, 4);
    if (L.extra === 'glasses') { D('#1c1c20', 17, 12, 6, 1); D('#1c1c20', 17, 18, 6, 1); D('#1c1c20', 17, 13, 1, 5); D('#1c1c20', 22, 13, 1, 5); D('rgba(150,200,225,.30)', 18, 13, 4, 5); D('#1c1c20', 12, 13, 5, 1); }
    hatNative(D, 'side', L, accent, coatL);
    drawWeapon(r, 'side', weapon);
    if (isGun) gunHand(r, 'side', L, skinD, weapon);
    c.restore();
  }
}

// 모자·장비(머리에 얹는 것). 머리 상자 x8..23 · y4..21 기준, 앞/뒤/옆(오른쪽 보기)을 각각 직접 그린다.
function hatNative(D, view, L, accent, coatL) {
  const side = view === 'side', back = view === 'up', c2 = L.coat2, c2L = adj(c2, 22), c2D = adj(c2, -22);
  switch (L.hat) {
    case 'cap': D(c2, 8, 2, 16, 6); D(c2L, 9, 2, 12, 1); D(c2D, 8, 7, 16, 1); D(c2L, 8, 3, 2, 3); if (!back) D('#0f0b09', side ? 17 : 8, 8, side ? 9 : 16, 1); if (side) D('#17110e', 21, 7, 5, 1); break;
    case 'beret': D('#3a1f24', 7, 3, 17, 5); D('#4b2a30', 9, 1, 13, 3); D('#5a3038', 10, 1, 6, 1); D('#2a1418', 7, 7, 17, 1); D('#3a1f24', side ? 7 : 6, 5, 2, 5); break;
    case 'helm': D('#3b4036', 7, 1, 18, 8); D('#565d4d', 9, 1, 14, 2); D('#2a2e27', 7, 8, 18, 1); D(accent, 7, 8, 18, 1); D('#6e7762', 10, 3, 4, 1); if (!back) D('#2a2e27', 8, 9, 2, 3); break;
    case 'hood': D(c2, 7, 2, 18, 6); D(c2L, 9, 2, 14, 1); D(c2, 7, 8, 2, 13); D(c2, 23, 8, 2, 13); D(c2D, 7, 18, 2, 3); D(c2D, 23, 18, 2, 3); if (back) D(c2, 8, 8, 16, 12); break;
    case 'headset': D('#202226', 9, 3, 14, 1); D('#2e3136', 9, 4, 1, 8); D('#2e3136', 22, 4, 1, 8); D('#202226', 6, 12, 3, 6); D('#202226', 23, 12, 3, 6); D(accent, 6, 14, 1, 2); D(accent, 25, 14, 1, 2); if (!back && !side) D('#202226', 9, 19, 5, 1); if (side) D('#202226', 12, 12, 3, 6); break;
    case 'goggles': D('#202226', 8, 10, 16, 1); if (!side) { D('#3a4a52', 10, 8, 5, 4); D('#3a4a52', 17, 8, 5, 4); D('#7fa3b5', 11, 9, 3, 2); D('#7fa3b5', 18, 9, 3, 2); D('#d6ecf4', 11, 9, 1, 1); D('#d6ecf4', 18, 9, 1, 1); } else { D('#3a4a52', 16, 8, 6, 4); D('#7fa3b5', 17, 9, 4, 2); D('#d6ecf4', 17, 9, 1, 1); } break;
    default: break;
  }
}

// 총을 쥔 손: 총기 손잡이 위로 손바닥·엄지·손가락 마디를 반 칸 단위로 덮는다. (손은 방향마다 총 도안의 손 위치와 같은 곳)
function gunHand(r, view, L, skinD, weapon) {
  const hy = 15.5, hx = gunHandX(WEAPON[weapon], view), dir = view === 'up' ? -1 : 1, X = (x, w = 1) => (dir > 0 ? hx + x : hx + 1 - x - w);
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
  const hair = () => false;   // 머리카락 광택·그림자는 hair3.js 가 직접 칠한다
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
