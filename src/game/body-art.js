// 사람 몸 — 첨부 템플릿(큰 머리 · 갈색 외곽선 · 셀 음영)을 복원한 걷기 시트(art/sprites/photo1_*_walk_4x3.png)에서 가져온 12프레임.
// 머리 = 맨몸(대머리 + 눈), 몸 = 의상 시트. 정면·후면·왼쪽·오른쪽 각 3프레임(0 = 중앙, 1 = 첫 보폭, 2 = 반대쪽 보폭). 데이터: body-frames.js (scripts/build-body-frames.py 가 생성)
// 역할 글자: 피부 o 외곽선 · O 짙은 외곽선 · s 피부 · l 밝은 피부 · h 그늘 · 눈 x u v y w · 겉옷 F H K I G · 검은 옷 B C · 다리감개 E D · 팔띠 U V · 등 표식 R r(부서색)
import { BODY_FRAMES } from './body-frames.js';

/** 한 프레임: rows(글자 격자, 셀 28×44), ox · oy(실제 x = ox + 칸, 실제 y = oy + 줄), head(머리뼈 x 범위 · 피부 윗줄). 왼쪽 보기는 시트의 왼쪽 행을 좌우반전해 저장했으므로 그리는 쪽이 한 번 더 뒤집는다. */
export function bodyFrame(dir, frame) {
  const f = BODY_FRAMES[dir][frame % 3], ox = Math.round(16 - (f.head[0] + f.head[1] + 1) / 2);   // 머리 중심을 몸 가운데(x=16)에 고정 → 걸어도 머리가 좌우로 흔들리지 않는다
  return { rows: f.rows, ox, oy: 1, legRow: f.top + 29, head: { x0: f.head[0], x1: f.head[1], y0: f.top, y1: f.top + 13 }, eyes: dir === 'up' ? null : { y: f.top + 8 } };
}
