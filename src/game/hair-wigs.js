// 가발 참고 사진 5종 도안. 좌표는 머리 기준 상대 픽셀(u 오른쪽 +, v 정수리에서 아래 +). 얼굴은 u -5..5, v 4..13(눈 v 8~10), 어깨는 v 14쯤.
// 부피: 머리폭(13칸)의 1.4~1.6배(짧은 머리 폭 ±9, 정수리 위 5칸) 덩어리를 먼저 깔고, 그 위에 가닥(앞머리·플립·뾰족한 끝·삐침)을 겹친다 — 가닥만 그리면 숱이 없어 보인다.
// 앞(down)/뒤(up)는 좌우 대칭(땋은 머리·꼬리·사이드 뱅은 사진처럼 한쪽), 옆(side)은 오른쪽(+u)이 얼굴.
import { fan, fanSym, lockSym } from './hair3.js';

const ell = (cu, cv, rx, ry) => (v) => { const d = 1 - ((v + 0.5 - cv) / ry) ** 2; if (d <= 0) return null; const w = rx * Math.sqrt(d); return [[cu - w, cu + w]]; };
const FACE_FRONT = (u, v) => v >= 3.4 && Math.abs(u) < 5.6;                 // 정면: 이마 아래 얼굴
const FACE_SIDE = (u, v) => v >= 2.6 && u > 4.4;                            // 옆: 얼굴 쪽
const blobs = (cv, arr, o = {}) => { for (const [cu, cvv, rx, ry] of arr) cv.mass(ell(cu, cvv, rx, ry), Math.floor(cvv - ry) - 1, Math.ceil(cvv + ry) + 1, o); };
const sides = (a, b, v0, v1, cv) => cv.mass((v) => [[-b, -a], [a, b]], v0, v1);
// 긴 머리 폭: 어깨 위로 내려오면서 살짝 출렁이는 곡선
const wave = (v, amp, f, ph = 0) => amp * Math.sin(v * f + ph);

// W1 — 검은 머리 + 은색 브릿지, 정수리 삐침 한 가닥, 옆 땋은 머리(은색 마디). 얼굴 앞을 비스듬히 가로지르는 은색 가닥 + 사방으로 튀는 층
function w1(cv, view) {
  const spikes = (cv, vs, a0, a1, len, o = {}) => { for (let i = 0; i < vs.length; i++) lockSym(cv, 7.4, vs[i], a0 + (a1 - a0) * (i / Math.max(1, vs.length - 1)), len + (i % 2), -1.2, 2.6, { curv2: -5, ...o }); };
  if (view === 'down') {
    cv.mass(ell(0, 1, 9.1, 6.4), -6, 8, { clip: FACE_FRONT }); sides(5.4, 8.2, 6, 9, cv);
    cv.braid(-9, 9, 17, 3, { accMid: true, accTip: 0.78, taper: 0.45 });
    spikes(cv, [1, 3.5, 6, 8.5], 40, 70, 5);
    fanSym(cv, { n: 4, x0: 0.6, y0: -2.5, x1: 5.8, y1: -1, a0: 97, a1: 76, len0: 7.5, len1: 6, curv: -1.0, w: 3, seed: 3 });
    cv.lock(6.5, -4, 124, 15, 1.2, 4.4, { acc: true, taper: 0.6 });  // 이마를 오른쪽 위에서 왼쪽 아래로 가로지르는 굵은 은색 가닥
    cv.lock(3.6, -4.5, 118, 13, 1.3, 3.8, { acc: true, taper: 0.6 });
    cv.lock(-3, -4, 66, 11, -1.2, 3, { acc: true });
    cv.lock(-6, 2, 70, 8, -1, 2.6, { acc: true });
    cv.lock(-5.5, -3.2, 60, 10, -1, 2.8);                            // 반대쪽에서 짧게 내려오는 검은 가닥
    lockSym(cv, 3.5, -1.5, 305, 5, 6, 2.6);
    cv.lock(0.2, -4, 270, 9, 20, 1.8);
  } else if (view === 'up') {
    cv.mass(ell(0, 3, 9.1, 9.2), -6, 12);
    fanSym(cv, { n: 5, x0: 0.8, y0: 2, x1: 7.4, y1: 5, a0: 100, a1: 74, len0: 8, len1: 7, curv: -0.8, w: 3.2, seed: 2 });
    lockSym(cv, 4.5, -2.5, 106, 13, 0.8, 4, { acc: true, taper: 0.6 });
    spikes(cv, [2, 5, 8], 50, 75, 5);
    fanSym(cv, { n: 4, x0: 1.5, y0: 10.5, x1: 8, y1: 10, a0: 94, a1: 66, len0: 4.5, len1: 5, curv: -1.6, curv2: -4, w: 3.2, seed: 4 });
    cv.braid(-3, 9, 19, 3, { accMid: true, accTip: 0.8, taper: 0.45 });
    cv.lock(0.2, -4, 270, 9, 20, 1.8);
  } else {
    cv.mass(ell(-1.4, 1.2, 9.6, 6.6), -6, 8, { clip: FACE_SIDE });
    cv.mass(ell(-4.8, 7.4, 5.4, 5), 2, 12.5, { clip: FACE_SIDE });
    cv.braid(-8, 10, 17, 3, { accMid: true, accTip: 0.78, taper: 0.45 });
    fan(cv, { n: 5, x0: -9.5, y0: 1, x1: -6, y1: 11, a0: 150, a1: 118, len0: 4.5, len1: 5, curv: 1.8, curv2: 5, w: 3, seed: 6 });
    fan(cv, { n: 4, x0: 2, y0: -2.5, x1: 6, y1: -0.5, a0: 84, a1: 62, len0: 7.5, len1: 6, curv: -1.2, w: 3, seed: 7 });
    cv.lock(5.5, -4, 112, 14, 1.0, 4.2, { acc: true, taper: 0.6 });
    cv.lock(3, -4.5, 106, 12, 1.0, 3.6, { acc: true, taper: 0.6 });
    cv.lock(4.8, 2.2, 96, 7, -0.2, 2.6);
    cv.lock(-1, -4, 270, 9, 20, 1.8);
  }
}

// W2 — 애쉬 회갈색 플립 레이어드(끝이 바깥으로 말림) + 청록 끝, 정수리 가운데 가름마. 모자 같은 둥근 윗선 대신 가닥이 바깥/위로 튀는 윗선
function w2(cv, view) {
  const crown = (cv) => { for (const [x, y, a, len] of [[1.6, -4.5, 280, 3.4], [4, -3.6, 300, 3.4]]) lockSym(cv, x, y, a, len, 2, 3.6, { curv2: 3, taper: 0.55, minW: 1.6 }); };
  if (view === 'down') {
    cv.mass(ell(0, 1.6, 8.2, 5.4), -6, 8, { clip: FACE_FRONT });
    blobs(cv, [[0, -2.2, 5.2, 4], [-4.8, -1, 4.2, 3.8], [4.8, -1, 4.2, 3.8], [-7.6, 2.6, 3.4, 3.8], [7.6, 2.6, 3.4, 3.8]], { clip: FACE_FRONT });
    cv.mass((v) => [[-(7.6 + (v - 5) * 0.8), -5.6], [5.6, 7.6 + (v - 5) * 0.8]], 5, 9);
    blobs(cv, [[-9.4, 7.8, 3.2, 3.4], [9.4, 7.8, 3.2, 3.4], [-8.4, 4.4, 3, 3], [8.4, 4.4, 3, 3]], { clip: FACE_FRONT });
    crown(cv);
    fanSym(cv, { n: 4, x0: 7.4, y0: 7.5, x1: 11, y1: 10.5, a0: 58, a1: 30, len0: 5.5, len1: 7.5, curv: -1.0, curv2: -4, w: 3.4, accTip: 0.45, seed: 11 });
    fanSym(cv, { n: 3, x0: 5.6, y0: 2, x1: 8.6, y1: 5, a0: 76, a1: 54, len0: 7, len1: 8, curv: -1.0, curv2: -4.5, w: 3.2, accTip: 0.55, seed: 12 });
    fanSym(cv, { n: 4, x0: 0.6, y0: -2.5, x1: 5.6, y1: -1, a0: 98, a1: 78, len0: 7, len1: 6, curv: -0.9, curv2: -2.5, w: 3, seed: 13 });
    cv.lock(-0.8, -3, 62, 12, 1.6, 3.2, { taper: 0.7 });          // 한쪽으로 쓸어 넘긴 앞머리 한 줄
    cv.lock(0, -4.5, 270, 3.5, 12, 2.6);
  } else if (view === 'up') {
    cv.mass(ell(0, 3.4, 8.6, 8.6), -5, 12.5);
    blobs(cv, [[0, -2.2, 5.4, 4], [-4.8, -1, 4.4, 3.8], [4.8, -1, 4.4, 3.8], [-8, 2.6, 3.6, 4], [8, 2.6, 3.6, 4]]);
    cv.mass((v) => [[-(9.2 + (v - 8) * 0.9), 9.2 + (v - 8) * 0.9]], 8, 12);
    blobs(cv, [[-9, 9, 3.4, 3.6], [9, 9, 3.4, 3.6], [-6, 12, 3.2, 3], [-2, 12.8, 3.2, 3], [2, 12.8, 3.2, 3], [6, 12, 3.2, 3]]);
    crown(cv);
    fanSym(cv, { n: 5, x0: 0.8, y0: 1, x1: 7.8, y1: 4, a0: 98, a1: 68, len0: 8, len1: 8, curv: -0.9, curv2: -3.5, w: 3.4, accTip: 0.62, seed: 15 });
    fanSym(cv, { n: 5, x0: 1.8, y0: 11, x1: 11, y1: 12, a0: 94, a1: 40, len0: 5, len1: 7.5, curv: -1.4, curv2: -5, w: 3.3, accTip: 0.4, seed: 16 });
    cv.lock(0, -4.5, 270, 3.5, 12, 2.6);
  } else {
    cv.mass(ell(-1.4, 1.6, 9, 5.6), -5, 8, { clip: FACE_SIDE });
    blobs(cv, [[-2, -2.2, 5.6, 4], [-7, 0.6, 4.2, 4], [2.2, -0.6, 3.6, 3.6], [-9, 5.5, 3.4, 4], [-6, 10, 4.6, 4.2], [-9.4, 11, 3, 3.4]], { clip: FACE_SIDE });
    for (const [x, y, a, len] of [[-2, -4.5, 262, 3.4], [1, -4.5, 285, 3.4], [3.5, -3.5, 305, 3.4]]) cv.lock(x, y, a, len, 2, 3.6, { curv2: 3, taper: 0.55, minW: 1.6 });
    fan(cv, { n: 5, x0: -10.5, y0: 4, x1: -4, y1: 12, a0: 160, a1: 108, len0: 5, len1: 7, curv: 1.6, curv2: 5, w: 3.4, accTip: 0.45, seed: 17 });
    fan(cv, { n: 3, x0: 2, y0: -2.5, x1: 6, y1: -0.5, a0: 84, a1: 62, len0: 7, len1: 6, curv: -1.0, curv2: -2.4, w: 3, seed: 18 });
    cv.lock(4.8, 2.4, 96, 8, -0.2, 2.6);
    cv.lock(-1, -4.5, 270, 3.5, 12, 2.6);
  }
}

// W3 — 금발 헝클어진 숏: 끝이 뾰족한 굵은 가닥 + 정수리 고리 삐침 + 낮은 꼬리
function w3(cv, view) {
  if (view === 'down') {
    cv.mass(ell(0, 1, 9.6, 6.7), -6, 8, { clip: FACE_FRONT }); sides(5.4, 8.4, 6, 9, cv);
    cv.braid(9, 13, 11, 3.4, { taper: 0.55, drift: 1 });
    fanSym(cv, { n: 3, x0: 7.2, y0: 6, x1: 8.8, y1: 9, a0: 72, a1: 56, len0: 5.5, len1: 6.5, curv: -1.2, curv2: -4.5, w: 3.6, seed: 21 });
    fanSym(cv, { n: 4, x0: 0.5, y0: -2, x1: 5.8, y1: -0.5, a0: 98, a1: 78, len0: 7, len1: 6, curv: -1.0, curv2: -2, w: 3.4, taper: 0.9, seed: 22 });
    cv.lock(0.3, -2, 92, 10, 0.4, 3.4, { taper: 0.9 });
    fanSym(cv, { n: 4, x0: 0.6, y0: -5.5, x1: 7, y1: -2.5, a0: 98, a1: 40, len0: 9, len1: 6.5, curv: -0.8, curv2: -2.5, w: 3.8, taper: 0.9, seed: 53 });
    cv.lock(0.5, -4, 262, 10, 24, 2.2);
  } else if (view === 'up') {
    cv.mass(ell(0, 3, 9.6, 9.4), -6, 12);
    fanSym(cv, { n: 5, x0: 0.6, y0: -5, x1: 7.5, y1: -1, a0: 100, a1: 45, len0: 10, len1: 8, curv: -0.6, curv2: -2, w: 3.8, taper: 0.9, seed: 54 });
    fanSym(cv, { n: 5, x0: 0.8, y0: 2, x1: 7.4, y1: 5, a0: 100, a1: 70, len0: 7.5, len1: 7, curv: -0.9, curv2: -3.5, w: 3.5, seed: 24 });
    cv.braid(0, 11, 16, 4.2, { taper: 0.6, sway: 0.6, swayF: 0.45 });
    fanSym(cv, { n: 3, x0: 2, y0: 10.5, x1: 8, y1: 10.5, a0: 96, a1: 66, len0: 4.5, len1: 5, curv: -1.4, curv2: -4.5, w: 3.5, seed: 25 });
    cv.lock(0.5, -4, 262, 10, 24, 2.2);
  } else {
    cv.mass(ell(-1.4, 1.2, 10, 6.9), -6, 8, { clip: FACE_SIDE });
    cv.mass(ell(-4.8, 7.4, 5.6, 5.2), 2, 12.5, { clip: FACE_SIDE });
    cv.braid(-8, 11, 15, 4.2, { taper: 0.6, drift: -1, sway: 0.5, swayF: 0.45 });
    fan(cv, { n: 4, x0: -9, y0: 6, x1: -5, y1: 11.5, a0: 140, a1: 112, len0: 5, len1: 5.5, curv: 1.6, curv2: 4.5, w: 3.5, seed: 26 });
    fan(cv, { n: 4, x0: 2, y0: -2.5, x1: 6, y1: -0.5, a0: 84, a1: 62, len0: 7, len1: 6, curv: -1.1, curv2: -2, w: 3.3, taper: 0.9, seed: 27 });
    cv.lock(4.6, 2.4, 96, 8, -0.2, 2.8);
    cv.lock(-0.5, -4, 262, 10, 24, 2.2);
  }
}

// 긴 머리 공통: 줄마다 폭이 어깨쯤에서 살짝 넓어지고 끝으로 갈수록 좁아지는 커튼(덩어리) + 그 위에 결(가닥)·끝 가닥
const taper = (v, vend, k = 0.32) => 1 - Math.max(0, (v - (vend - 9)) / 12) * k;
function curtainFront(cv, sgn, v0, vend, amp = 0, ph = 0) {
  cv.mass((v) => { const o = 5.3 + Math.max(0, wave(v, amp * 0.5, 0.3, ph)), w = (4.6 + wave(v, amp, 0.32, ph + 1) + Math.min(1.2, (v - v0) * 0.1) + (v > vend - 8 ? (v - (vend - 8)) * 0.12 : 0)) * taper(v, vend, 0.2); return [[sgn < 0 ? -(o + w) : o, sgn < 0 ? -o : o + w]]; }, v0, vend - 1, { dim: 0 });
}
function strandsFront(cv, vend, o) {
  fanSym(cv, { n: 3, x0: 6.2, y0: 5, x1: 8.4, y1: 6, a0: 92, a1: 86, len0: vend - 7, len1: vend - 5, curv: o.curv ?? 0, w: 3, taper: 0.5, wave: o.wave, accTip: o.accTip, seed: o.seed, jit: 4 });
  fanSym(cv, { n: 3, x0: 6.4, y0: vend - 5, x1: 9, y1: vend - 5, a0: 94, a1: 80, len0: 4.5, len1: 6, curv: -0.3, curv2: o.flick ?? -5, w: 3.2, taper: 0.8, accTip: o.accTip, seed: o.seed + 3, jit: 3 });
}

const gaps = (cv, us, v0, len, amp = 0.5) => { for (let i = 0; i < us.length; i++) cv.lock(us[i], v0 + (i % 2) * 2, 90, len - (i % 2) * 3, 0, 1, { gap: true, minW: 1, taper: 0.2, wave: { amp, f: 0.5, ph: i } }); };

// W4 — 긴 웨이브: 뿌리와 끝이 어둡고 가운데가 밝은 투톤, 한쪽으로 쓸어 넘긴 앞머리. 머리폭 ±9.5로 어깨 위를 덮는다
function w4(cv, view) {
  const VEND = 27;
  if (view === 'down') {
    cv.mass(ell(0, 1, 9.4, 6.5), -6, 8, { clip: FACE_FRONT, dim: 0 });
    cv.mass(ell(0, -1, 7.2, 3.3), -4, 3, { acc: true, dim: 0 });
    curtainFront(cv, -1, 4, VEND, 2.4, 0); curtainFront(cv, 1, 4, VEND, 2.4, 0);
    strandsFront(cv, VEND, { wave: { amp: 1.3, f: 0.55 }, accTip: 0.74, seed: 31 });
    cv.lock(-1.5, -3, 52, 13.5, 1.6, 3.6);
    fanSym(cv, { n: 2, x0: 1, y0: -2, x1: 3, y1: -2, a0: 100, a1: 88, len0: 5.5, len1: 5, curv: -1, w: 2.8, seed: 33 });
  } else if (view === 'up') {
    cv.mass(ell(0, 3, 9.6, 9.4), -6, 12, { dim: 0 });
    cv.mass(ell(0, -1, 7.4, 3.3), -4, 3, { acc: true, dim: 0 });
    cv.mass((v) => { const w = (9.6 + wave(v, 2.0, 0.3) + (v > VEND - 8 ? (v - (VEND - 8)) * 0.15 : 0)) * taper(v, VEND, 0.2); return [[-w, w]]; }, 12, VEND - 1, { dim: 0 });
    fanSym(cv, { n: 6, x0: 0.8, y0: 6, x1: 8.4, y1: 8, a0: 94, a1: 84, len0: VEND - 9, len1: VEND - 11, curv: 0, w: 3.2, taper: 0.5, wave: { amp: 1.3, f: 0.5 }, accTip: 0.74, seed: 34, jit: 3 });
    fanSym(cv, { n: 5, x0: 1.5, y0: VEND - 5, x1: 9, y1: VEND - 5, a0: 94, a1: 78, len0: 5, len1: 6, curv: -0.4, curv2: -3, w: 3.4, taper: 0.8, accTip: 0.62, seed: 35, jit: 3 });
    blobs(cv, [[-8.4, VEND - 5, 3.2, 3.6], [-4.4, VEND - 3.4, 3.4, 3.8], [0, VEND - 4.2, 3.4, 3.8], [4.4, VEND - 3.4, 3.4, 3.8], [8.4, VEND - 5, 3.2, 3.6], [-9.6, 17, 2.8, 4], [9.6, 17, 2.8, 4]], { dim: 0 });
    gaps(cv, [-6.5, -3.5, 0, 3, 6], 6, 17);
  } else {
    cv.mass(ell(-1.4, 1.2, 9.8, 6.8), -6, 8, { clip: FACE_SIDE, dim: 0 });
    cv.mass(ell(-1.4, -1, 7, 3.3), -4, 3, { acc: true, dim: 0 });
    cv.mass((v) => { const w = (10.2 + wave(v, 1.8, 0.3) + (v > VEND - 8 ? (v - (VEND - 8)) * 0.15 : 0)) * taper(v, VEND, 0.25); return [[-w + 0.8, 0.8]]; }, 5, VEND - 1, { dim: 0 });
    cv.mass((v) => [[2.6, (5.8 + wave(v, 0.5, 0.5, 1)) * taper(v, VEND - 2, 0.2) ]], 6, VEND - 4, { dim: 0 });
    fan(cv, { n: 5, x0: -9, y0: 6, x1: -1, y1: 7, a0: 95, a1: 92, len0: VEND - 9, len1: VEND - 10, curv: 0.1, w: 3.2, taper: 0.5, wave: { amp: 1.3, f: 0.5 }, accTip: 0.74, seed: 36, jit: 3 });
    fan(cv, { n: 5, x0: -9, y0: VEND - 5, x1: 0, y1: VEND - 5, a0: 98, a1: 92, len0: 5, len1: 6, curv: 0.4, curv2: 3, w: 3.4, taper: 0.8, accTip: 0.62, seed: 37, jit: 3 });
    cv.lock(-1, -3, 52, 13.5, 1.6, 3.6);
    blobs(cv, [[-8, VEND - 4, 3.4, 3.8], [-4.2, VEND - 3, 3.4, 3.8], [-0.6, VEND - 4.4, 3, 3.4], [-10, 16, 2.8, 4.2]], { dim: 0 });
    gaps(cv, [-7, -4.5, -2], 8, 14);
  }
}

// W5 — 긴 직모: 가운데 가르마, 길게 쓸어내린 사이드 뱅, 끝이 층진 뾰족한 레이어
function w5(cv, view) {
  const VEND = 28;
  if (view === 'down') {
    cv.mass(ell(0, 1, 9.2, 6.4), -6, 8, { clip: FACE_FRONT, dim: 0 });
    curtainFront(cv, -1, 4, VEND, 1.4, 0.5); curtainFront(cv, 1, 4, VEND, 1.4, 0.5);
    strandsFront(cv, VEND, { wave: { amp: 0.4, f: 0.5 }, seed: 41, flick: -1.5 });
    lockSym(cv, 6.2, VEND - 13, 92, 8, 0.2, 2.8, {});
    cv.lock(-1.5, -3, 52, 14, 1.5, 3.8, { taper: 0.5 });
    fanSym(cv, { n: 2, x0: 0.8, y0: -2.5, x1: 4, y1: -2, a0: 102, a1: 92, len0: 6, len1: 5.5, curv: -0.6, w: 2.8, seed: 43 });
  } else if (view === 'up') {
    cv.mass(ell(0, 3, 9.4, 9.4), -6, 12, { dim: 0 });
    cv.mass((v) => { const w = (9.6 + wave(v, 1.2, 0.3)) * taper(v, VEND, 0.2); return [[-w, w]]; }, 12, VEND - 1, { dim: 0 });
    fanSym(cv, { n: 6, x0: 0.8, y0: 6, x1: 8.4, y1: 8, a0: 93, a1: 86, len0: VEND - 9, len1: VEND - 12, curv: 0, w: 3.2, taper: 0.5, seed: 44, jit: 3.5 });
    fanSym(cv, { n: 5, x0: 1.5, y0: VEND - 5, x1: 9, y1: VEND - 5, a0: 93, a1: 82, len0: 5, len1: 6.5, curv: -0.2, curv2: -2, w: 3.4, taper: 0.8, seed: 45, jit: 3.5 });
    blobs(cv, [[-8.4, VEND - 5, 3, 3.2], [-4.4, VEND - 4, 3.2, 3.4], [0, VEND - 4.6, 3.2, 3.4], [4.4, VEND - 4, 3.2, 3.4], [8.4, VEND - 5, 3, 3.2]], { dim: 0 });
    gaps(cv, [-6.5, -3.5, 0, 3, 6], 6, 18, 0.3);
  } else {
    cv.mass(ell(-1.4, 1.2, 9.6, 6.8), -6, 8, { clip: FACE_SIDE, dim: 0 });
    cv.mass((v) => { const w = (10.2 + wave(v, 1.1, 0.3)) * taper(v, VEND, 0.25); return [[-w + 0.8, 0.8]]; }, 5, VEND - 1, { dim: 0 });
    cv.mass((v) => [[2.6, 5.6 * taper(v, VEND - 3, 0.2)]], 6, VEND - 6, { dim: 0 });
    fan(cv, { n: 5, x0: -9, y0: 6, x1: -1, y1: 7, a0: 96, a1: 92, len0: VEND - 10, len1: VEND - 11, curv: 0, w: 3.2, taper: 0.5, seed: 46, jit: 3.5 });
    fan(cv, { n: 5, x0: -9, y0: VEND - 5, x1: 0, y1: VEND - 5, a0: 97, a1: 90, len0: 5, len1: 6.5, curv: 0.2, curv2: 2, w: 3.4, taper: 0.8, seed: 47, jit: 3.5 });
    cv.lock(-1, -3, 52, 14, 1.5, 3.8, { taper: 0.5 });
    gaps(cv, [-7, -4.5, -2], 8, 15, 0.3);
  }
}

export const WIG_BUILD = { w1, w2, w3, w4, w5 };
