#!/usr/bin/env python3
"""첨부 도트 이미지 5장을 사진별 투명 PNG 스프라이트 시트로 복원한다. (Pillow + numpy + scipy)

사용: python3 scripts/restore-sprites.py [원본폴더=art/source] [출력폴더=art/sprites]

방법: 이미지마다 '도트 1칸'의 크기(피치)와 격자 원점을 오차 최소화로 찾고, 칸 중심 색을 읽어 팔레트 단색 / 완전 투명 픽셀로 바꾼다.
 - 사진1 큰 정면 그림: 도트 1칸 = 11.58px → 정확히 17×40 / 17×41 로 읽힘(원본 그대로).
 - 사진1 걷기 시트: 도트 1칸 = 2.316px(JPG 번짐이 큼) → 프레임마다 격자 위치를 맞춰 읽고, 큰 정면 그림의 팔레트로 확정. 중앙 정면 프레임은 큰 그림으로 교체.
 - 사진2: 도트 1칸 = 3.0px(정수 배율) → 정확. 사진5: 4.82px. 사진4: 1.8px(저해상도). 사진3: 2.0px(번진 원본).
"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from scipy.cluster.vq import kmeans2

SRC = sys.argv[1] if len(sys.argv) > 1 else 'art/source'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'art/sprites'
os.makedirs(OUT, exist_ok=True)
load = lambda n: np.asarray(Image.open(os.path.join(SRC, n)).convert('RGB')).astype(float)

def bilinear(a, x, y):
    x0 = int(np.floor(x)); y0 = int(np.floor(y)); fx = x - x0; fy = y - y0
    x0 = min(max(x0, 0), a.shape[1] - 2); y0 = min(max(y0, 0), a.shape[0] - 2)
    p = a[y0:y0 + 2, x0:x0 + 2]
    return p[0, 0] * (1 - fx) * (1 - fy) + p[0, 1] * fx * (1 - fy) + p[1, 0] * (1 - fx) * fy + p[1, 1] * fx * fy
def grid_centers(a, x0, y0, cols, rows, P):
    return np.array([[bilinear(a, x0 + (c + .5) * P, y0 + (r + .5) * P) for c in range(cols)] for r in range(rows)])
def box_centers(a, x0, y0, cols, rows, P, w):
    out = np.zeros((rows, cols, 3))
    for r in range(rows):
        for c in range(cols):
            cx = x0 + (c + .5) * P; cy = y0 + (r + .5) * P
            xa = int(round(cx - w / 2)); xb = max(xa + 1, int(round(cx + w / 2))); ya = int(round(cy - w / 2)); yb = max(ya + 1, int(round(cy + w / 2)))
            out[r, c] = a[ya:yb, xa:xb].reshape(-1, 3).mean(axis=0)
    return out
def recon_err(a, x0, y0, cols, rows, P, g):
    err = 0; n = 0
    for r in range(rows):
        for c in range(cols):
            xa, xb = int(round(x0 + c * P)), int(round(x0 + (c + 1) * P)); ya, yb = int(round(y0 + r * P)), int(round(y0 + (r + 1) * P))
            sub = a[ya:yb, xa:xb]
            if sub.size: err += np.abs(sub - g[r, c]).mean(); n += 1
    return err / max(n, 1)
def to_png(rows, pal, name, scale=8):
    h = len(rows); w = max(len(r) for r in rows); img = Image.new('RGBA', (w, h), (0, 0, 0, 0)); px = img.load()
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.': px[x, y] = tuple(pal[ch]) + (255,)
    img.save(os.path.join(OUT, name)); img.resize((w * scale, h * scale), Image.NEAREST).save(os.path.join(OUT, name.replace('.png', f'_x{scale}.png')))
    return img

# ───────── 사진 1: 캐릭터 ─────────
NUDE = {'o': (0x77, 0x43, 0x2e), 'O': (0x57, 0x2d, 0x1d), 's': (0xf9, 0xd2, 0xa9), 'l': (0xff, 0xeb, 0xc6), 'h': (0xd8, 0x8a, 0x64), 'x': (0xad, 0xd2, 0xe5), 'u': (0x16, 0x54, 0x66), 'v': (0x1a, 0x6f, 0x8b), 'y': (0xde, 0xea, 0xf6), 'w': (0x1d, 0x7a, 0xbd)}
COST = {'W': (255, 255, 255), 'B': (0, 0, 0), 'C': (0x1d, 0x1d, 0x1d), 'F': (0x2c, 0x31, 0x2a), 'H': (0x45, 0x4a, 0x43), 'K': (0x78, 0x83, 0x72), 'I': (0x90, 0x90, 0x90), 'G': (0x55, 0x55, 0x55), 'E': (0xaa, 0xaa, 0xaa), 'D': (0xdc, 0xdc, 0xdc),
        'o': (0x77, 0x43, 0x2c), 'O': (0x58, 0x2d, 0x20), 's': (0xf9, 0xd2, 0xa7), 'l': (0xff, 0xed, 0xc7), 'h': (0xda, 0x89, 0x62), 'x': (0xb1, 0xd1, 0xe2), 'u': (0x16, 0x53, 0x69), 'v': (0x1a, 0x70, 0x8c), 'y': (0xdc, 0xea, 0xf4), 'w': (0x19, 0x7b, 0xbe), 'U': (0x2c, 2, 1), 'V': (0x58, 3, 1)}
def nearest_label(col, pal):
    return min((k for k in pal if k != 'W'), key=lambda k: sum((x - y) ** 2 for x, y in zip(col, pal[k])))
def big_figure(a, x0, y0, cols, rows, pal, p=11.58):
    g = grid_centers(a, x0, y0, cols, rows, p)
    return [''.join('.' if min(g[r, c]) > 238 else nearest_label(g[r, c], pal) for c in range(cols)) for r in range(rows)]
def fill_enclosed_white(g):
    H = len(g); W = len(g[0]); pad = [['.'] * (W + 2)] + [['.'] + list(r) + ['.'] for r in g] + [['.'] * (W + 2)]
    seen = {(0, 0)}; st = [(0, 0)]
    while st:
        r, c = st.pop()
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            rr, cc = r + dr, c + dc
            if 0 <= rr < H + 2 and 0 <= cc < W + 2 and (rr, cc) not in seen and pad[rr][cc] == '.': seen.add((rr, cc)); st.append((rr, cc))
    out = [list(r) for r in g]
    for r in range(H):
        for c in range(W):
            if out[r][c] == '.' and (r + 1, c + 1) not in seen: out[r][c] = 'W'
    return [''.join(r) for r in out]
P1 = 2.316
def conf_labels(g, pal):
    R, C = g.shape[:2]; lab = [[None] * C for _ in range(R)]
    for r in range(R):
        for c in range(C):
            col = g[r, c]
            if min(col) > 222: lab[r][c] = ('.', '.', 1.0); continue
            ds = sorted((sum((x - y) ** 2 for x, y in zip(col, pal[k])) ** .5, k) for k in pal if k != 'W')
            lab[r][c] = (ds[0][1], ds[1][1], 1 - ds[0][0] / (ds[1][0] + 1e-6))
    return lab
def settle(lab, thr=0.5):   # 확신이 낮은(번져서 두 색 사이인) 칸은 이웃 8칸의 투표로 확정
    R = len(lab); C = len(lab[0]); first = [[x[0] for x in row] for row in lab]; out = [['.'] * C for _ in range(R)]
    for r in range(R):
        for c in range(C):
            b, s, conf = lab[r][c]
            if conf >= thr or b == '.': out[r][c] = b; continue
            votes = {b: 0, s: 0}
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if (dr or dc) and 0 <= r + dr < R and 0 <= c + dc < C and first[r + dr][c + dc] in votes: votes[first[r + dr][c + dc]] += 1
            out[r][c] = b if votes[b] >= votes[s] else s
    return out
def halo_cleanup(g, light='DEly'):
    H = len(g); W = len(g[0])
    for r in range(H):
        for c in range(W):
            if g[r][c] in light:
                if sum(1 for rr, cc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)) if not (0 <= rr < H and 0 <= cc < W) or g[rr][cc] == '.') >= 2: g[r][c] = '.'
    mask = np.array([[ch != '.' for ch in row] for row in g]); lab, n = ndi.label(mask, structure=np.ones((3, 3)))
    for i in range(1, n + 1):
        if (lab == i).sum() < 4:
            for r, c in zip(*np.where(lab == i)): g[r][c] = '.'
    return g
def trim(g):
    rs = [r for r, row in enumerate(g) if any(ch != '.' for ch in row)]; cs = [c for c in range(len(g[0])) if any(row[c] != '.' for row in g)]
    return [''.join(row[cs[0]:cs[-1] + 1]) for row in g[rs[0]:rs[-1] + 1]]
def small_frame(a, box, pal):
    bx0, bx1, by0, by1 = box; cols = int(round((bx1 + 1 - bx0) / P1)); rows = int(round((by1 + 1 - by0) / P1)); best = None
    for dx in np.arange(-1.2, 1.21, .2):
        for dy in np.arange(-1.2, 1.21, .2):
            g = grid_centers(a, bx0 + dx, by0 + dy, cols, rows, P1); e = recon_err(a, bx0 + dx, by0 + dy, cols, rows, P1, g)
            if best is None or e < best[0]: best = (e, dx, dy)
    g = box_centers(a, bx0 + best[1], by0 + best[2], cols, rows, P1, 1.8)
    g2 = halo_cleanup(settle(conf_labels(g, pal)))
    if 'W' in pal: g2 = [list(r) for r in fill_enclosed_white([''.join(r) for r in g2])]
    return trim(g2)
def photo1():
    a = load('photo1_characters.jpg')
    nude_big = big_figure(a, 113.5, 39.5, 17, 40, NUDE); cost_big = fill_enclosed_white(big_figure(a, 414.5, 28.0, 17, 41, COST))
    to_png(nude_big, NUDE, 'photo1_base_front_large.png', 12); to_png(cost_big, COST, 'photo1_costume_front_large.png', 12)
    rows_c = [(544, 644), (662, 760), (778, 876), (891, 991)]; cols_c = [(417, 468), (491, 533), (559, 610)]
    rows_n = [(544, 641), (660, 757), (776, 873), (891, 989)]; cols_n = [(116, 167), (190, 230), (258, 309)]
    CW, CH = 28, 44
    for label, pal, rows, cols, big in (('base', NUDE, rows_n, cols_n, nude_big), ('costume', COST, rows_c, cols_c, cost_big)):
        sheet = Image.new('RGBA', (CW * 3, CH * 4), (0, 0, 0, 0)); sp = sheet.load()
        for ri in range(4):
            for ci in range(3):
                g = big if (ri, ci) == (0, 1) else small_frame(a, (cols[ci][0], cols[ci][1], rows[ri][0], rows[ri][1]), pal)
                xs = [c for r in range(min(12, len(g))) for c, ch in enumerate(g[r]) if ch != '.']
                x0 = int(round(CW / 2 - (min(xs) + max(xs)) / 2 - .5)); y0 = CH - len(g)      # 머리 중심을 셀 가운데, 발 기준선을 셀 바닥에 맞춘다
                for r, row in enumerate(g):
                    for c, ch in enumerate(row):
                        X = ci * CW + x0 + c
                        if ch != '.' and ci * CW <= X < (ci + 1) * CW: sp[X, ri * CH + y0 + r] = tuple(pal[ch]) + (255,)
        sheet.save(os.path.join(OUT, f'photo1_{label}_walk_4x3.png')); sheet.resize((sheet.width * 8, sheet.height * 8), Image.NEAREST).save(os.path.join(OUT, f'photo1_{label}_walk_4x3_x8.png'))
        S = 6; frames = []
        for t in (1, 0, 1, 2):      # 중앙 → 첫 보폭 → 중앙 → 반대쪽 보폭
            W = Image.new('RGBA', (CW * S * 4, CH * S), (40, 46, 64, 255))
            for ri in range(4): W.alpha_composite(sheet.crop((t * CW, ri * CH, (t + 1) * CW, (ri + 1) * CH)).resize((CW * S, CH * S), Image.NEAREST), (ri * CW * S, 0))
            frames.append(W.convert('P', palette=Image.ADAPTIVE))
        frames[0].save(os.path.join(OUT, f'photo1_{label}_walk_preview.gif'), save_all=True, append_images=frames[1:], duration=180, loop=0, disposal=2)

# ───────── 헤어 시트(사진 2·3·4·5) ─────────
def fit_grid(a, P0, span, step, offs):
    H, W = a.shape[:2]; best = None
    for P in np.arange(P0 - span, P0 + span + 1e-9, step):
        for ox in np.arange(0, P, P / offs):
            for oy in np.arange(0, P, P / offs):
                cols = int((W - ox) / P); rows = int((H - oy) / P); err = 0; n = 0
                for r in range(2, rows - 2, 3):
                    for c in range(2, cols - 2, 3):
                        xa, xb = int(round(ox + c * P)), int(round(ox + (c + 1) * P)); ya, yb = int(round(oy + r * P)), int(round(oy + (r + 1) * P)); sub = a[ya:yb, xa:xb]
                        if sub.size: err += np.abs(sub - bilinear(a, ox + (c + .5) * P, oy + (r + .5) * P)).mean(); n += 1
                if n and (best is None or err / n < best[0]): best = (err / n, P, ox, oy)
    return best
def halo(fg, lum, thr):   # 흰 배경이 번진 밝은 가장자리 칸 제거
    H, W = fg.shape
    for _ in range(2):
        drop = np.zeros_like(fg)
        for r in range(H):
            for c in range(W):
                if fg[r, c] and lum[r, c] > thr:
                    if sum(1 for rr, cc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)) if not (0 <= rr < H and 0 <= cc < W) or not fg[rr, cc]) >= 1: drop[r, c] = True
        fg = fg & ~drop
    lab, n = ndi.label(fg, structure=np.ones((3, 3)))
    for i in range(1, n + 1):
        if (lab == i).sum() < 3: fg[lab == i] = False
    return fg
def hair_sheet(name, out_name, P, ox, oy, w, k, is_bg, halo_thr=None, gray=False, scale=6):
    a = load(name); H, W = a.shape[:2]; cols = int((W - ox) / P); rows = int((H - oy) / P); S = box_centers(a, ox, oy, cols, rows, P, w); lum = S.mean(axis=2)
    fg = ~is_bg(S)
    if halo_thr: fg = halo(fg, lum, halo_thr)
    vals = lum[fg].reshape(-1, 1) if gray else S[fg]
    cent, _ = kmeans2(vals.astype(float), k, minit='++', seed=3)
    cent = np.array(sorted(cent.tolist(), key=lambda v: np.sum(v)))
    img = Image.new('RGBA', (cols, rows), (0, 0, 0, 0)); px = img.load()
    for r in range(rows):
        for c in range(cols):
            if fg[r, c]:
                v = lum[r, c] if gray else S[r, c]; i = int(np.argmin(((cent - v) ** 2).sum(axis=1) if not gray else np.abs(cent[:, 0] - v)))
                col = (int(round(cent[i, 0])),) * 3 if gray else tuple(int(round(x)) for x in cent[i]); px[c, r] = col + (255,)
    img.save(os.path.join(OUT, out_name)); img.resize((cols * scale, rows * scale), Image.NEAREST).save(os.path.join(OUT, out_name.replace('.png', f'_x{scale}.png')))
    return img
def blue_bg(S):                                   # 파란 기운이 있는 밝은 칸 = 배경 (머리카락은 무채색)
    m = ((S[:, :, 2] - S[:, :, 0]) >= 11) & (S.mean(axis=2) > 150); m[:2, :] = True; m[:, :1] = True; return m
def photo2(): hair_sheet('photo2_hair_two_palettes.jpg', 'photo2_hair_two_palettes_8x6.png', 3.0, 0.5, 0.0, 1.8, 12, blue_bg, None, True, 8)
def photo5(): hair_sheet('photo5_outline_hair_6x4.jpg', 'photo5_outline_hair_6x4.png', 4.82, 0.8, 4.02, 2.6, 9, lambda S: S.mean(axis=2) >= 236, 190, True, 6)
def photo4(): hair_sheet('photo4_gray_hair_8x6.jpg', 'photo4_gray_hair_8x6.png', 1.8, 0.3, 1.5, 1.3, 9, lambda S: S.mean(axis=2) >= 232, 196, True, 6)
def photo3(): hair_sheet('photo3_hair_catalog.jpg', 'photo3_hair_catalog_15x19.png', 2.0, 1.5, 1.5, 1.4, 24, lambda S: S.mean(axis=2) >= 238, 200, False, 4)

if __name__ == '__main__':
    for f in (photo1, photo2, photo5, photo4, photo3):
        print('→', f.__name__); f()
    print('완료:', OUT)
