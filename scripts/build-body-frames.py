#!/usr/bin/env python3
"""복원된 걷기 시트(art/sprites/photo1_*_walk_4x3.png)에서 게임용 몸 프레임(src/game/body-frames.js)을 만든다.
머리 = 맨몸 시트(대머리 + 눈) · 몸 = 의상 시트(목 아래). 머리카락·모자는 게임이 따로 얹는다.
셀 28×44, 행: 정면·후면·왼쪽 보기·오른쪽 보기, 열: 첫 보폭·중앙·반대쪽 보폭. 사용: python3 scripts/build-body-frames.py"""
import json
import numpy as np
from PIL import Image
NUDE = {'o': (0x77, 0x43, 0x2e), 'O': (0x57, 0x2d, 0x1d), 's': (0xf9, 0xd2, 0xa9), 'l': (0xff, 0xeb, 0xc6), 'h': (0xd8, 0x8a, 0x64), 'x': (0xad, 0xd2, 0xe5), 'u': (0x16, 0x54, 0x66), 'v': (0x1a, 0x6f, 0x8b), 'y': (0xde, 0xea, 0xf6), 'w': (0x1d, 0x7a, 0xbd)}
COST = {'W': (255, 255, 255), 'B': (0, 0, 0), 'C': (0x1d, 0x1d, 0x1d), 'F': (0x2c, 0x31, 0x2a), 'H': (0x45, 0x4a, 0x43), 'K': (0x78, 0x83, 0x72), 'I': (0x90, 0x90, 0x90), 'G': (0x55, 0x55, 0x55), 'E': (0xaa, 0xaa, 0xaa), 'D': (0xdc, 0xdc, 0xdc),
        'o': (0x77, 0x43, 0x2c), 'O': (0x58, 0x2d, 0x20), 's': (0xf9, 0xd2, 0xa7), 'l': (0xff, 0xed, 0xc7), 'h': (0xda, 0x89, 0x62), 'x': (0xb1, 0xd1, 0xe2), 'u': (0x16, 0x53, 0x69), 'v': (0x1a, 0x70, 0x8c), 'y': (0xdc, 0xea, 0xf4), 'w': (0x19, 0x7b, 0xbe), 'U': (0x2c, 2, 1), 'V': (0x58, 3, 1)}
CW, CH = 28, 44
def cells(path, pal):
    inv = {v: k for k, v in pal.items()}; a = np.array(Image.open(path).convert('RGBA')); out = {}
    for ri in range(4):
        for ci in range(3):
            g = []
            for r in range(CH):
                row = ''
                for c in range(CW):
                    p = a[ri * CH + r, ci * CW + c]; row += '.' if p[3] == 0 else inv[tuple(int(v) for v in p[:3])]
                g.append(row)
            out[(ri, ci)] = g
    return out
nude = cells('art/sprites/photo1_base_walk_4x3.png', NUDE); cost = cells('art/sprites/photo1_costume_walk_4x3.png', COST)
SKIN = set('solhOxuvyw')
def split_row(cl, ri):
    if ri < 2: return 14                       # 정면·후면: 후드 깃 시작(큰 정면 그림 기준 14줄 — 머리 맨 윗줄을 0으로 본 값에 아래서 보정)
    for r in range(CH // 3, CH):
        n = sum(1 for ch in cl[r] if ch in 'FHK'); n2 = sum(1 for ch in cl[r + 1] if ch in 'FHK') if r + 1 < CH else 0
        if n >= 4 and n2 >= 4 and r > 18: return r
    return 24
def top_of(g): return next(r for r, row in enumerate(g) if any(ch != '.' for ch in row))
def compose(ri, ci):
    n = nude[(ri, ci)]; c = cost[(ri, ci)]
    # 맨몸 머리를 의상 프레임에 맞춘다: 피부 칸이 의상 실루엣 안에 들어가는 위치를 찾는다.
    best = None
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            sc = 0
            for r in range(CH):
                for col in range(CW):
                    if n[r][col] == '.': continue
                    rr, cc = r + dy, col + dx
                    if 0 <= rr < CH and 0 <= cc < CW:
                        sc += (2 if c[rr][cc] in SKIN else 0.3) if c[rr][cc] != '.' else -1
                    else: sc -= 1
            if best is None or sc > best[0]: best = (sc, dx, dy)
    _, dx, dy = best
    ct = top_of(c); sp = max(ct + 13, 1) if ri < 2 else None
    if ri >= 2: sp = ct + (13 if ci == 2 else 14)     # 옆모습: 후드 깃이 시작하는 줄(의상 윗줄에서 13~14줄 아래)
    g = [['.'] * CW for _ in range(CH)]
    for r in range(sp, CH):
        for col in range(CW):
            ch = c[r][col]; g[r][col] = '.' if ch == 'W' else ch      # 몸에 갇힌 흰색(머리카락 하이라이트 보정의 부작용)은 투명으로
    for r in range(CH):
        for col in range(CW):
            ch = n[r][col]
            if ch != '.' and 0 <= r + dy < sp and 0 <= col + dx < CW: g[r + dy][col + dx] = ch
    # 후면: 등 표식(가운데의 갈색/붉은 덩어리) → 부서색 R/r
    if ri == 1:
        xs = [col for r in range(top_of(g), top_of(g) + 12) for col in range(CW) if g[r][col] != '.']; cx = (min(xs) + max(xs)) / 2
        for r in range(sp + 3, sp + 14):
            for col in range(CW):
                if abs(col - cx) <= 3.6 and g[r][col] in 'oOhUV': g[r][col] = 'r' if g[r][col] in 'OU' else 'R'
    leg = top_of(g) + 29
    for r in range(CH):
        for col in range(CW):
            ch = g[r][col]
            if ch == '.': continue
            if r >= leg and ch in 'xuvywUV': g[r][col] = 'B' if ch in 'UV' else '.'                 # 다리 구역의 눈색·팔띠색은 번짐 잡티
            if r < sp + 4 and ch in 'DEW': g[r][col] = '.'                                        # 목 둘레의 머리카락 잔재
    for r in range(sp + 4, leg):                                                                   # 몸통 구역의 밝은 회색/흰색은 번짐: 가장자리면 제거, 안쪽이면 겉옷 밝은색
        for col in range(CW):
            if g[r][col] in 'DEW':
                edge = col == 0 or col + 1 >= CW or g[r][col - 1] == '.' or g[r][col + 1] == '.'
                g[r][col] = '.' if edge else 'K'
    for r in range(leg, CH):                                                                       # 가로 폭 1칸짜리 세로 흰 줄(다리감개가 아닌 번짐) 제거
        for col in range(CW):
            if g[r][col] in 'DE' and (col == 0 or g[r][col - 1] not in 'DE') and (col + 1 >= CW or g[r][col + 1] not in 'DE'): g[r][col] = '.'
    return [''.join(r) for r in g], sp
def mirror(g): return [row[::-1] for row in g]
frames = {}; info = []
for name, ri in (('down', 0), ('up', 1), ('left', 2), ('right', 3)):
    seq = []
    for game_f, ci in ((0, 1), (1, 0), (2, 2)):          # 게임 프레임 0 = 중앙, 1 = 첫 보폭, 2 = 반대쪽 보폭
        g, sp = compose(ri, ci)
        if name == 'left': g = mirror(g)                  # 왼쪽 보기는 '왼쪽 행'을 좌우반전해 오른쪽 보기 형태로 저장 → 게임이 다시 반전하면 원본 그대로
        top = top_of(g); xs = [c for r in range(top + 2, top + 7) for c, ch in enumerate(g[r]) if ch != '.']   # 귀를 뺀 머리뼈 폭
        hx0, hx1 = min(xs), max(xs)
        seq.append(dict(rows=g, head=[hx0, hx1], top=top, split=sp)); info.append((name, game_f, sp, top, hx0, hx1))
    frames[name] = seq
for i in info: print(i)
out = "// 사람 몸 프레임 — 복원한 베이스/의상 걷기 시트(art/sprites)에서 scripts/build-body-frames.py 가 만든 데이터(직접 고치지 말 것).\n// 셀 28×44 (머리 중심 = 14열, 발 기준선 = 43행). 글자 역할: body-art.js 머리말 참고.\nexport const BODY_FRAMES = {\n"
for name, seq in frames.items():
    out += f"  {name}: [\n"
    for f in seq:
        out += f"    {{ head: [{f['head'][0]}, {f['head'][1]}], top: {f['top']}, rows: [\n" + "".join(f"      '{r}',\n" for r in f['rows']) + "    ] },\n"
    out += "  ],\n"
out += "};\n"
open('src/game/body-frames.js', 'w').write(out)
