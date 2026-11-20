#!/usr/bin/env python3
"""복원 시트(art/sprites)에서 게임용 몸 프레임(src/game/body-frames.js)과 은발 원본 머리카락 도안(src/game/hair-silver.js)을 만든다.
 - 몸(목 아래)  = 은발 걷기 시트(silver_walk_4x3.png, scripts/restore-silver-walk.py 산출) — 보폭 · 팔 흔들림 · 소매/등 표식 · 다리감개가 원본 그대로.
 - 머리(대머리 + 눈) = 맨몸 시트(photo1_base_walk_4x3.png). 은발 시트의 얼굴 피부에 겹치도록 위치를 맞춰 붙인다. 머리카락은 게임이 따로 얹는다.
 - 은발 머리카락 = 은발 시트 머리에서 회색/흰 칸만 따로 떼어 낸 도안(스타일 e1). 컷마다 위치(hair)가 다르므로 프레임에 함께 저장한다.
행: 정면·후면·왼쪽 보기·오른쪽 보기, 열: 첫 보폭·중앙·반대쪽 보폭. 사용: python3 scripts/build-body-frames.py"""
import numpy as np
from PIL import Image
NUDE = {'o': (0x77, 0x43, 0x2e), 'O': (0x57, 0x2d, 0x1d), 's': (0xf9, 0xd2, 0xa9), 'l': (0xff, 0xeb, 0xc6), 'h': (0xd8, 0x8a, 0x64), 'x': (0xad, 0xd2, 0xe5), 'u': (0x16, 0x54, 0x66), 'v': (0x1a, 0x6f, 0x8b), 'y': (0xde, 0xea, 0xf6), 'w': (0x1d, 0x7a, 0xbd)}
COST = {'W': (255, 255, 255), 'B': (0, 0, 0), 'C': (0x1d, 0x1d, 0x1d), 'F': (0x2c, 0x31, 0x2a), 'H': (0x45, 0x4a, 0x43), 'K': (0x78, 0x83, 0x72), 'I': (0x90, 0x90, 0x90), 'G': (0x55, 0x55, 0x55), 'E': (0xaa, 0xaa, 0xaa), 'D': (0xdc, 0xdc, 0xdc),
        'o': (0x77, 0x43, 0x2c), 'O': (0x58, 0x2d, 0x20), 's': (0xf9, 0xd2, 0xa7), 'l': (0xff, 0xed, 0xc7), 'h': (0xda, 0x89, 0x62), 'x': (0xb1, 0xd1, 0xe2), 'u': (0x16, 0x53, 0x69), 'v': (0x1a, 0x70, 0x8c), 'y': (0xdc, 0xea, 0xf4), 'w': (0x19, 0x7b, 0xbe), 'U': (0x2c, 2, 1), 'V': (0x58, 3, 1),
        'r': (0x59, 0x2a, 0x22), 'R': (0x9a, 0x32, 0x30), 'Q': (0xc6, 0x39, 0x3f)}
NW, NH = 28, 44          # 맨몸 시트 셀
SW, SH = 32, 48          # 은발 시트 셀 (발바닥 기준선 = 44행)
SPLIT = {0: 14, 1: 14, 2: 12, 3: 12}   # 은발 머리 윗줄 기준: 이 줄부터 아래가 몸(은발 시트), 위는 맨몸 머리
HAIR_CH = {'C': 0, 'B': 0, 'F': 0, 'H': 1, 'G': 0, 'I': 1, 'E': 2, 'D': 3, 'W': 4}   # 은발 회색 단계 → 도안 명도 0(외곽선)~4(광택)
SKIN = set('solhOxuvyw')
SHIFT_Y = -1             # 은발 셀의 발바닥(44행) → 게임 프레임의 발바닥(43행)

def cells(path, pal, cw, ch):
    inv = {v: k for k, v in pal.items()}; a = np.array(Image.open(path).convert('RGBA')); out = {}
    for ri in range(4):
        for ci in range(3):
            g = []
            for r in range(ch):
                row = ''
                for c in range(cw):
                    p = a[ri * ch + r, ci * cw + c]; row += '.' if p[3] == 0 else inv[tuple(int(v) for v in p[:3])]
                g.append(row)
            out[(ri, ci)] = g
    return out
nude = cells('art/sprites/photo1_base_walk_4x3.png', NUDE, NW, NH)
silver = cells('art/sprites/silver_walk_4x3.png', COST, SW, SH)

def top_of(g): return next(r for r, row in enumerate(g) if any(ch != '.' for ch in row))
def mirror(g): return [row[::-1] for row in g]

def compose(ri, ci):
    n = nude[(ri, ci)]; s = silver[(ri, ci)]; st = top_of(s); sp = st + SPLIT[ri]
    # 맨몸 머리를 은발 컷의 얼굴 피부에 겹치도록 위치를 찾는다(은발이 가린 부분은 감점하지 않는다)
    best = None
    for dy in range(-8, 9):
        for dx in range(-8, 9):
            sc = 0
            for r in range(NH):
                for c in range(NW):
                    if n[r][c] == '.': continue
                    rr, cc = r + dy, c + dx
                    if not (0 <= rr < SH and 0 <= cc < SW): sc -= 1; continue
                    t = s[rr][cc]
                    sc += 2 if t in SKIN else (0.2 if t in 'WDEIGC' else -1) if t != '.' else -1
            if best is None or sc > best[0]: best = (sc, dx, dy)
    _, dx, dy = best
    g = [['.'] * SW for _ in range(SH)]
    for r in range(sp, SH):
        for c in range(SW): g[r][c] = 'D' if s[r][c] == 'W' else s[r][c]      # 몸의 흰 칸(신발/다리감개 하이라이트)은 밝은 회색 D(몸 팔레트에 순백은 없다)
    for r in range(NH):
        for c in range(NW):
            ch = n[r][c]; rr, cc = r + dy, c + dx
            if ch != '.' and 0 <= rr < sp and 0 <= cc < SW and s[rr][cc] != '.': g[rr][cc] = ch      # 은발 컷에서 비어 있는(배경) 칸에 맨몸 머리 윤곽이 삐져나오지 않게(다른 머리 스타일은 정수리를 덮는다)
    return g, st, sp, s

frames = {}; hair = {}; info = []
for name, ri in (('down', 0), ('up', 1), ('left', 2), ('right', 3)):
    seq = []
    for game_f, ci in ((0, 1), (1, 0), (2, 2)):                 # 게임 프레임 0 = 중앙, 1 = 첫 보폭, 2 = 반대쪽 보폭
        g, st, sp, s = compose(ri, ci)
        # 머리카락 도안: 은발 컷 머리 구역(sp 위)의 회색/흰 칸
        hr = [[HAIR_CH.get(s[r][c], None) if r < sp else None for c in range(SW)] for r in range(SH)]
        pts = [(r, c) for r in range(SH) for c in range(SW) if hr[r][c] is not None]
        r0, r1 = min(p[0] for p in pts), max(p[0] for p in pts); c0, c1 = min(p[1] for p in pts), max(p[1] for p in pts)
        pat = [''.join('.' if hr[r][c] is None else str(hr[r][c]) for c in range(c0, c1 + 1)) for r in range(r0, r1 + 1)]
        hx, hy = c0, r0 + SHIFT_Y
        g = g[-SHIFT_Y:] + [['.'] * SW for _ in range(-SHIFT_Y)] if SHIFT_Y < 0 else g          # 한 줄 위로
        g = [''.join(r) for r in g]; top = top_of(g)
        if name == 'left': g = mirror(g); pat = mirror(pat); hx = SW - 1 - c1                        # 왼쪽 보기는 오른쪽 보기 형태로(좌우반전) 저장 → 게임이 다시 반전
        xs = [c for r in range(top + 2, top + 7) for c, ch in enumerate(g[r]) if ch != '.']          # 귀를 뺀 머리뼈 폭
        seq.append(dict(rows=g, head=[min(xs), max(xs)], top=top, leg=st + SHIFT_Y + 29, hair=[hx, hy]))
        hair.setdefault(name, pat)
        if hair[name] != pat: raise SystemExit(f'머리카락 도안이 프레임마다 다름: {name} {game_f}')
        info.append((name, game_f, top, st + SHIFT_Y, sp + SHIFT_Y, hx, hy))
    frames[name] = seq
for i in info: print(i)

out = "// 사람 몸 프레임 — 복원한 시트(art/sprites)에서 scripts/build-body-frames.py 가 만든 데이터(직접 고치지 말 것).\n// 몸 = 은발 걷기 시트 · 머리 = 맨몸 시트(대머리). 셀 32×(발바닥 43행). 글자 역할: body-art.js 머리말 참고.\n// head: 머리뼈 x 범위 · top: 대머리 정수리 줄 · leg: 다리 구역 시작 줄 · hair: 은발 원본 머리카락(e1) 도안의 왼쪽 위 칸(프레임 좌표).\nexport const BODY_FRAMES = {\n"
for name, seq in frames.items():
    out += f"  {name}: [\n"
    for f in seq:
        out += f"    {{ head: [{f['head'][0]}, {f['head'][1]}], top: {f['top']}, leg: {f['leg']}, hair: [{f['hair'][0]}, {f['hair'][1]}], rows: [\n" + "".join(f"      '{r}',\n" for r in f['rows']) + "    ] },\n"
    out += "  ],\n"
out += "};\n"
open('src/game/body-frames.js', 'w').write(out)
hs = "// 은발 원본 머리카락(스타일 e1) 도안 — scripts/build-body-frames.py 가 은발 걷기 시트에서 떼어 낸 데이터(직접 고치지 말 것).\n// 글자: . 투명 · 0 외곽선 · 1 어두움 · 2 기본 · 3 밝음 · 4 광택. 위치는 body-frames.js 의 프레임별 hair 좌표. side = 오른쪽 보기, sideL = 왼쪽 보기를 좌우반전해 둔 도안.\nexport const SILVER_HAIR = {\n"
for view, key in (('down', 'down'), ('up', 'up'), ('right', 'side'), ('left', 'sideL')):
    hs += f"  {key}: [\n" + "".join(f"    '{r}',\n" for r in hair[view]) + "  ],\n"
hs += "};\n"
open('src/game/hair-silver.js', 'w').write(hs)
print('done')
