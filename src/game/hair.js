import { drawHair3 } from './hair3.js';
// 머리카락 스타일: 크기가 큰 머리(폭 20도트 이상 · 어깨 아래로 내려오는 장발)를 뺀 스타일. 16×24 스프라이트의 머리(x5..10, y3..8) 위에 그린다.
// 색은 임의의 hex — 명암은 색에서 자동 계산한다.
export function adj(hex, d) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, v + d));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
}

export const HAIR_STYLES = [
  { id: 'w1', g: 'x', rough: 1.25, name: '은 브릿지 숏', accent: (c) => adj(c, 120) },
  { id: 'w2', g: 'x', rough: 1.2, name: '애쉬 플립 숏', accent: (c) => mixHex(c, '#4f9ea3', 0.7) },
  { id: 'w3', g: 'x', rough: 1.3, name: '헝클어진 숏 + 꼬리', accent: (c) => adj(c, 40) },
  { id: 'w4', g: 'x', rough: 0.7, name: '투톤 웨이브 롱', accent: (c) => adj(c, -150) },
  { id: 'w5', g: 'x', rough: 0.6, name: '스트레이트 롱', accent: (c) => adj(c, -40) },
];
const mixHex = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
export const HAIR = Object.fromEntries(HAIR_STYLES.map((s) => [s.id, s]));

// 자연색 + 염색색 견본
export const HAIR_COLORS = ['#1c1a1f', '#3a2418', '#6b4a2b', '#8a5a34', '#c9a063', '#e6d39a', '#d9d9dc', '#8a8a92', '#a5382a', '#d9692e', '#e58fb0', '#4a78b8', '#3f9a86', '#7a5aa8',
  '#0f2a3f', '#5b2a86', '#b02a52', '#f2c14e', '#9fe0d8', '#2d6a4f', '#c7b8ea', '#f4f4f6', '#3b3b4f'];   // 뒤 9색: 네이비 · 보라 · 로즈 · 금색 · 민트 · 포레스트 · 라벤더 · 백발 · 차콜

/** 머리카락 그리기(2배 해상도 생성기 hair3.js): r(color, x, y, w, h) 는 논리 칸 좌표 — 내부에서 반 칸(실제 1픽셀) 단위로 나눠 호출한다.
    view: 'down' | 'up' | 'side'(오른쪽 보기; 왼쪽은 호출측에서 좌우반전). tip 이 있으면 뿌리→끝 그라데이션. */
export function drawHair(r, view, id, col, tip = null, box = null) {
  drawHair3((c, x, y, w, h) => r(c, x / 2, y / 2, w / 2, h / 2), view, HAIR[id] || HAIR.w1, col, tip, box);
}
