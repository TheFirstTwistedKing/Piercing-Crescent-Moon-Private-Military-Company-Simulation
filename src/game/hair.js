import { drawHair3 } from './hair3.js';
// 머리카락 스타일: 남성 24 + 여성 24 (기본 10+10, 확장 14+14). 16×24 스프라이트의 머리(x5..10, y3..8) 위에 그린다.
// 색은 임의의 hex — 명암은 색에서 자동 계산한다.
export function adj(hex, d) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, v + d));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
}

export const HAIR_STYLES = [
  { id: 'm1', g: 'm', name: '크롭', k: 'cap', rows: 2, side: 0 },
  { id: 'm2', g: 'm', name: '스포츠', k: 'cap', rows: 2, side: 2 },
  { id: 'm3', g: 'm', name: '가르마', k: 'cap', rows: 2, side: 1, part: true },
  { id: 'm4', g: 'm', name: '투블럭', k: 'cap', rows: 3, side: 0, top: true },
  { id: 'm5', g: 'm', name: '스파이크', k: 'spike' },
  { id: 'm6', g: 'm', name: '모히칸', k: 'mohawk' },
  { id: 'm7', g: 'm', name: '장발', k: 'cap', rows: 2, side: 3, back: 8 },
  { id: 'm8', g: 'm', name: '꽁지머리', k: 'pony', rows: 2, side: 1 },
  { id: 'm9', g: 'm', name: '삭발', k: 'bald' },
  { id: 'm10', g: 'm', name: '곱슬 아프로', k: 'afro' },
  { id: 'f1', g: 'f', name: '단발', k: 'cap', rows: 3, side: 4, back: 4, bangs: true },
  { id: 'f2', g: 'f', name: '긴 생머리', k: 'cap', rows: 2, side: 3, back: 10 },
  { id: 'f3', g: 'f', name: '포니테일', k: 'pony', rows: 2, side: 1, long: true },
  { id: 'f4', g: 'f', name: '트윈테일', k: 'twin', rows: 2, side: 1 },
  { id: 'f5', g: 'f', name: '똥머리', k: 'bun', rows: 2, side: 1 },
  { id: 'f6', g: 'f', name: '땋은 머리', k: 'braid', rows: 2, side: 2 },
  { id: 'f7', g: 'f', name: '숏컷', k: 'cap', rows: 3, side: 1, bangs: true },
  { id: 'f8', g: 'f', name: '웨이브 롱', k: 'cap', rows: 2, side: 3, back: 9, wave: true },
  { id: 'f9', g: 'f', name: '사이드 포니', k: 'sidepony', rows: 2, side: 1 },
  { id: 'f10', g: 'f', name: '히메컷', k: 'cap', rows: 3, side: 8, back: 7, bangs: true },
  // ── 확장 스타일: v2 설계(top 정수리 · lift 볼륨 · fr 앞머리 · sl 옆머리 길이 · bk 뒷머리 길이 · jag 들쭉날쭉한 끝 · flare 바깥으로 퍼짐 · tail 묶음/땋기) ──
  { id: 'm11', g: 'm', name: '올백', v2: { top: 'slick', lift: 1, sl: 1, bk: 2 } },
  { id: 'm12', g: 'm', name: '댄디컷', v2: { top: 'part', fr: 'side', sl: 2 } },
  { id: 'm13', g: 'm', name: '리젠트', v2: { top: 'quiff', lift: 3 } },
  { id: 'm14', g: 'm', name: '울프컷', v2: { top: 'flat', fr: 'straight', sl: 4, bk: 5, jag: 1 } },
  { id: 'm15', g: 'm', name: '드레드락', v2: { top: 'flat', tail: { t: 'dread', n: 7 } } },
  { id: 'm16', g: 'm', name: '맨번', v2: { top: 'slick', tail: { t: 'tbun' } } },
  { id: 'm17', g: 'm', name: '버즈컷', v2: { top: 'buzz' } },
  { id: 'm18', g: 'm', name: '포마드', v2: { top: 'pomp', lift: 2, sl: 1 } },
  { id: 'm19', g: 'm', name: '콤마 헤어', v2: { top: 'flat', fr: 'comma', sl: 3, bk: 2 } },
  { id: 'm20', g: 'm', name: '샤기컷', v2: { top: 'puff', fr: 'sheer', sl: 3, bk: 3, jag: 1 } },
  { id: 'm21', g: 'm', name: '변발', v2: { top: 'buzz', tail: { t: 'queue', n: 9 } } },
  { id: 'm22', g: 'm', name: '센터파트 장발', v2: { top: 'part', fr: 'curtain', sl: 6, bk: 9 } },
  { id: 'm23', g: 'm', name: '텍스처 크롭', v2: { top: 'crest' } },
  { id: 'm24', g: 'm', name: '쌍뿔', v2: { top: 'tufts' } },
  { id: 'f11', g: 'f', name: '레이어드 롱', v2: { top: 'part', fr: 'curtain', sl: 7, bk: 10, jag: 1 } },
  { id: 'f12', g: 'f', name: '허쉬컷', v2: { top: 'flat', fr: 'straight', sl: 5, bk: 6, jag: 1 } },
  { id: 'f13', g: 'f', name: '픽시컷', v2: { top: 'crest', fr: 'side' } },
  { id: 'f14', g: 'f', name: '시스루뱅 롱', v2: { top: 'flat', fr: 'sheer', sl: 8, bk: 11 } },
  { id: 'f15', g: 'f', name: '로우 포니', v2: { top: 'part', tail: { t: 'low', n: 9 } } },
  { id: 'f16', g: 'f', name: '하프업', v2: { top: 'part', fr: 'straight', sl: 6, bk: 8, tail: { t: 'halfup' } } },
  { id: 'f17', g: 'f', name: '트윈 번', v2: { top: 'flat', tail: { t: 'sbun' } } },
  { id: 'f18', g: 'f', name: '사이드 브레이드', v2: { top: 'part', fr: 'side', tail: { t: 'sbraid', n: 9 } } },
  { id: 'f19', g: 'f', name: '올림머리', v2: { top: 'puff', tail: { t: 'bun2' } } },
  { id: 'f20', g: 'f', name: '웨이브 숏', v2: { top: 'puff', fr: 'side', sl: 3, bk: 3 } },
  { id: 'f21', g: 'f', name: '컬 롱', v2: { top: 'part', fr: 'curtain', sl: 6, bk: 9, flare: 2 } },
  { id: 'f22', g: 'f', name: '양갈래 땋기', v2: { top: 'part', tail: { t: 'dbraid', n: 8 } } },
  { id: 'f23', g: 'f', name: '하이 포니', v2: { top: 'slick', lift: 1, tail: { t: 'pony', n: 11 } } },
  { id: 'f24', g: 'f', name: 'A라인 보브', v2: { top: 'part', fr: 'side', sl: 3, bk: 3, flare: 3 } },
];
// 헤어 템플릿 시트(첨부 이미지)에서 추출한 도안 스타일 30종 — 남녀 공용(g:'x'). A: 시트 2(8) · B/C: 시트 1(8+8) · D: 시트 4(6)
for (const id of ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6']) HAIR_STYLES.push({ id, g: 'x', name: `템플릿 ${id.toUpperCase()}`, sheet: id });
HAIR_STYLES.push({ id: 'e1', g: 'x', name: '은발 원본', sheet: 'e1', anchored: true });   // 사진 1 은발 캐릭터의 머리(방향·걸음마다 원본 도안)
export const HAIR = Object.fromEntries(HAIR_STYLES.map((s) => [s.id, s]));

// 자연색 + 염색색 견본
export const HAIR_COLORS = ['#1c1a1f', '#3a2418', '#6b4a2b', '#8a5a34', '#c9a063', '#e6d39a', '#d9d9dc', '#8a8a92', '#a5382a', '#d9692e', '#e58fb0', '#4a78b8', '#3f9a86', '#7a5aa8',
  '#0f2a3f', '#5b2a86', '#b02a52', '#f2c14e', '#9fe0d8', '#2d6a4f', '#c7b8ea', '#f4f4f6', '#3b3b4f'];   // 뒤 9색: 네이비 · 보라 · 로즈 · 금색 · 민트 · 포레스트 · 라벤더 · 백발 · 차콜

/** 머리카락 그리기(2배 해상도 생성기 hair3.js): r(color, x, y, w, h) 는 논리 칸 좌표 — 내부에서 반 칸(실제 1픽셀) 단위로 나눠 호출한다.
    view: 'down' | 'up' | 'side'(오른쪽 보기; 왼쪽은 호출측에서 좌우반전). tip 이 있으면 뿌리→끝 그라데이션. */
export function drawHair(r, view, id, col, tip = null, box = null) {
  drawHair3((c, x, y, w, h) => r(c, x / 2, y / 2, w / 2, h / 2), view, HAIR[id] || HAIR.m1, col, tip, box);
}
