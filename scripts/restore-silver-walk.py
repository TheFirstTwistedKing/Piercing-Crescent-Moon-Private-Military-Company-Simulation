#!/usr/bin/env python3
"""사진 1 오른쪽(은발) 캐릭터의 걷기 12컷을 4행×3열 투명 PNG 시트로 복원한다. (Pillow + numpy + scipy)

사용: python3 scripts/restore-silver-walk.py [원본=art/source/photo1_characters.jpg] [출력폴더=art/sprites]
출력: silver_walk_4x3.png(원본 해상도 1도트=1px) · _x8.png(최근접 확대) · silver_walk_preview.gif(4방향 가운데→왼쪽→가운데→오른쪽) · silver_walk_preview_x6.png

행: 정면 / 후면 / 화면 왼쪽을 봄 / 화면 오른쪽을 봄. 열: 첫 보폭 / 기본 자세(항상 가운데) / 반대쪽 보폭.
방법
 - 큰 정면 그림(11.58px/도트)은 정확히 17×41 도트로 읽힌다 → 정면 12컷 머리와 기본 자세는 이 그림 그대로.
 - 작은 걷기 컷(2.316px/도트, JPG 번짐)은 컷마다 격자 위치를 오차 최소화로 맞춰 읽고 팔레트 단색으로 확정.
 - 같은 방향 3컷의 머리는 한 머리를 그대로 그린 것이므로 3컷을 정렬해 도트별 다수결(합의)로 읽어 번짐을 줄인다.
 - 정면/후면의 좌우 보폭 두 컷은 서로 좌우반전 관계 → 확신도 투표로 합친다(비대칭 소매 표식은 제외).
"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = sys.argv[1] if len(sys.argv) > 1 else 'art/source/photo1_characters.jpg'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'art/sprites'
os.makedirs(OUT, exist_ok=True)
a = np.asarray(Image.open(SRC).convert('RGB')).astype(float)

COST = {'W': (255, 255, 255), 'B': (0, 0, 0), 'C': (0x1d, 0x1d, 0x1d), 'F': (0x2c, 0x31, 0x2a), 'H': (0x45, 0x4a, 0x43), 'K': (0x78, 0x83, 0x72), 'I': (0x90, 0x90, 0x90), 'G': (0x55, 0x55, 0x55), 'E': (0xaa, 0xaa, 0xaa), 'D': (0xdc, 0xdc, 0xdc),
        'o': (0x77, 0x43, 0x2c), 'O': (0x58, 0x2d, 0x20), 's': (0xf9, 0xd2, 0xa7), 'l': (0xff, 0xed, 0xc7), 'h': (0xda, 0x89, 0x62), 'x': (0xb1, 0xd1, 0xe2), 'u': (0x16, 0x53, 0x69), 'v': (0x1a, 0x70, 0x8c), 'y': (0xdc, 0xea, 0xf4), 'w': (0x19, 0x7b, 0xbe), 'U': (0x2c, 2, 1), 'V': (0x58, 3, 1),
        'r': (0x59, 0x2a, 0x22), 'R': (0x9a, 0x32, 0x30), 'Q': (0xc6, 0x39, 0x3f)}       # r/R/Q = 후면 등 표식(원본 화소 값을 직접 읽은 어두운 테두리/붉은 바탕/중앙)
READ_PAL = {k: v for k, v in COST.items() if k not in 'rRQW'}                              # 읽기용 팔레트(표식색은 뒤에서 따로 그린다)
P1 = 2.316
HAIR_PAL = {k: COST[k] for k in 'CGIEDoOshlxuvyw'}   # 머리 구역 읽기용(머리카락 회색·피부·눈) — 초록 회색 옷 색과 섞이지 않게
CW, CH = 32, 48              # 셀(도트). 가장 넓은 보폭 22도트, 가장 큰 키 43도트 → 사방 투명 여백 ≥2
BASE = 44                    # 셀 안 발바닥(가장 낮은 발) 기준선 행: 아래 3행은 항상 투명

def bilinear(a, x, y):
    x0 = int(np.floor(x)); y0 = int(np.floor(y)); fx = x - x0; fy = y - y0
    x0 = min(max(x0, 0), a.shape[1] - 2); y0 = min(max(y0, 0), a.shape[0] - 2)
    p = a[y0:y0 + 2, x0:x0 + 2]
    return p[0, 0] * (1 - fx) * (1 - fy) + p[0, 1] * fx * (1 - fy) + p[1, 0] * (1 - fx) * fy + p[1, 1] * fx * fy
def grid_centers(x0, y0, cols, rows, P):
    return np.array([[bilinear(a, x0 + (c + .5) * P, y0 + (r + .5) * P) for c in range(cols)] for r in range(rows)])
def box_centers(x0, y0, cols, rows, P, w):
    out = np.zeros((rows, cols, 3))
    for r in range(rows):
        for c in range(cols):
            cx = x0 + (c + .5) * P; cy = y0 + (r + .5) * P
            xa = int(round(cx - w / 2)); xb = max(xa + 1, int(round(cx + w / 2))); ya = int(round(cy - w / 2)); yb = max(ya + 1, int(round(cy + w / 2)))
            out[r, c] = a[ya:yb, xa:xb].reshape(-1, 3).mean(axis=0)
    return out
def recon_err(x0, y0, cols, rows, P, g):
    err = 0; n = 0
    for r in range(rows):
        for c in range(cols):
            xa, xb = int(round(x0 + c * P)), int(round(x0 + (c + 1) * P)); ya, yb = int(round(y0 + r * P)), int(round(y0 + (r + 1) * P))
            sub = a[ya:yb, xa:xb]
            if sub.size: err += np.abs(sub - g[r, c]).mean(); n += 1
    return err / max(n, 1)
def nearest_label(col, pal): return min((k for k in pal if k != 'W'), key=lambda k: sum((x - y) ** 2 for x, y in zip(col, pal[k])))
def fill_enclosed_white(g):          # 외곽선 안에 갇힌 흰 칸 = 머리카락 흰 하이라이트
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
def conf_labels(g, PAL=None, bg=226):
    PAL = PAL or READ_PAL
    R, C = g.shape[:2]; lab = [[None] * C for _ in range(R)]
    for r in range(R):
        for c in range(C):
            col = g[r, c]
            if min(col) > bg and max(col) - min(col) < 14: lab[r][c] = ('.', '.', 1.0); continue      # 배경(눈 하이라이트 #deeaf6 은 푸른기가 있어 배경이 아님)
            cand = [k for k in PAL if k != 'W' and not (PAL is HAIR_PAL and max(col) - min(col) < 20 and k in 'oOshl')]      # 머리 구역: 무채색 어두운 칸이 갈색(피부 윤곽)으로 읽히지 않게
            ds = sorted((sum((x - y) ** 2 for x, y in zip(col, PAL[k])) ** .5, k) for k in cand)
            lab[r][c] = (ds[0][1], ds[1][1], 1 - ds[0][0] / (ds[1][0] + 1e-6))
    return lab
def settle(lab, thr=0.5):            # 확신이 낮은(번져서 두 색 사이인) 칸은 이웃 8칸의 투표로 확정
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
            if g[r][c] in light and sum(1 for rr, cc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)) if not (0 <= rr < H and 0 <= cc < W) or g[rr][cc] == '.') >= 2: g[r][c] = '.'
    mask = np.array([[ch != '.' for ch in row] for row in g]); lab, n = ndi.label(mask, structure=np.ones((3, 3)))
    for i in range(1, n + 1):
        if (lab == i).sum() < 4:
            for r, c in zip(*np.where(lab == i)): g[r][c] = '.'
    return g

# ───────── 원본 컷 위치 ─────────
ROWS = [(544, 644), (662, 760), (778, 876), (891, 991)]; COLS = [(417, 468), (491, 533), (559, 610)]
NONW = a.min(axis=2) < 225
def bbox(ri, ci):
    y0, y1 = ROWS[ri]; x0, x1 = COLS[ci]; sub = NONW[y0 - 8:y1 + 9, x0 - 8:x1 + 9]
    ys = np.where(sub.any(axis=1))[0]; xs = np.where(sub.any(axis=0))[0]
    return x0 - 8 + xs[0], x0 - 8 + xs[-1], y0 - 8 + ys[0], y0 - 8 + ys[-1]
def read_cell(ri, ci):
    x0, x1, y0, y1 = bbox(ri, ci); cols = int(round((x1 + 1 - x0) / P1)); rows = int(round((y1 + 1 - y0) / P1)); best = None
    for dx in np.arange(-1.2, 1.21, .2):
        for dy in np.arange(-1.2, 1.21, .2):
            g = grid_centers(x0 + dx, y0 + dy, cols, rows, P1); e = recon_err(x0 + dx, y0 + dy, cols, rows, P1, g)
            if best is None or e < best[0]: best = (e, dx, dy)
    raw = box_centers(x0 + best[1], y0 + best[2], cols, rows, P1, 1.8)
    out = []
    for pal, bg in ((None, 226), (HAIR_PAL, 238)):      # 몸용(옷 팔레트) / 머리용(회색 머리카락 팔레트, 밝은 회색 결도 살리려 배경 기준을 높임)
        g = halo_cleanup(settle(conf_labels(raw, pal, bg))); out.append([list(r) for r in fill_enclosed_white([''.join(r) for r in g])])
    return out + [raw.mean(axis=2)]

# 큰 정면 그림(정확한 17×41 도트)
def big_figure():
    g = grid_centers(414.5, 28.0, 17, 41, 11.58)
    rows = [''.join('.' if min(g[r, c]) > 238 else nearest_label(g[r, c], READ_PAL) for c in range(17)) for r in range(41)]
    return [list(r) for r in fill_enclosed_white(rows)]

# ───────── 격자 도구 ─────────
def blank(w, h): return [['.'] * w for _ in range(h)]
def top_of(g): return next(i for i, r in enumerate(g) if any(ch != '.' for ch in r))
def mirror(g): return [r[::-1] for r in g]
def shifted(g, dx, dy, w=None, h=None):
    h = h or len(g); w = w or len(g[0]); out = blank(w, h)
    for r, row in enumerate(g):
        for c, ch in enumerate(row):
            if ch != '.' and 0 <= r + dy < h and 0 <= c + dx < w: out[r + dy][c + dx] = ch
    return out
def overlap(A, B, rows, dx):
    n = 0
    for r in rows:
        for c in range(len(A[r])):
            cc = c + dx
            if 0 <= cc < len(B[r]) and A[r][c] != '.' and A[r][c] == B[r][cc]: n += 1
    return n

def head_consensus(frames, n_rows, weights=(1, 1.3, 1)):
    """같은 방향 3컷의 머리(위 n_rows줄)를 가로로 정렬해 도트별 다수결로 합친다. 반환: 컷별 머리(각 컷 좌표) · 컷별 정렬 이동량"""
    ref = 1; dxs = []
    for i, g in enumerate(frames):
        best = max(range(-3, 4), key=lambda d: (overlap(frames[ref], g, range(n_rows), d), -abs(d)))
        dxs.append(best)                                   # g 의 열 c+dx 가 ref 의 열 c 에 대응
    W = max(len(g[0]) for g in frames) + 8; off = 4; H = []
    for r in range(n_rows):
        row = []
        for c in range(-off, W - off):
            votes = {}
            for i, g in enumerate(frames):
                cc = c + dxs[i]; ch = g[r][cc] if 0 <= cc < len(g[r]) else '.'
                votes[ch] = votes.get(ch, 0) + weights[i]
            row.append(max(votes, key=votes.get))
        H.append(row)
    out = []
    for i, g in enumerate(frames):
        h = blank(len(g[0]), n_rows)
        for r in range(n_rows):
            for c in range(len(g[0])):
                cc = c - dxs[i]                              # ref 좌표 → 이 컷 좌표
                if -off <= cc < W - off: h[r][c] = H[r][cc + off]
        out.append(h)
    return out, dxs

def seal_fill(h, it=2):
    """머리 윤곽에 1~2칸 틈(번져서 밝아진 외곽선)이 있으면 흰 머리카락 칸이 배경과 이어져 사라진다 → 틈을 닫은 뒤 속을 흰색으로 채운다. 틈 자리는 외곽선색(G)."""
    h = [r[:] for r in h]; Hh = len(h); Ww = len(h[0]); pad = 3
    m = np.zeros((Hh + 2 * pad, Ww + 2 * pad), bool)
    for r in range(Hh):
        for c in range(Ww): m[r + pad, c + pad] = h[r][c] != '.'
    closed = ndi.binary_closing(m, structure=np.ones((3, 3)), iterations=it); holes = ndi.binary_fill_holes(closed) & ~closed
    for r in range(Hh):
        for c in range(Ww):
            if h[r][c] == '.' and holes[r + pad, c + pad]: h[r][c] = 'W'
    return h

# ───────── 컷 조립: 머리(합의/정확한 큰 그림) + 몸(컷 자신의 읽기) ─────────
SPLIT = {0: 14, 1: 14, 2: 12, 3: 12}       # 머리로 쓰는 위쪽 줄 수(정면·후면: 후드 깃 시작 14줄 / 옆: 턱선 12줄)
def hair_level(L):      # 평균 밝기 → 머리카락 회색 단계(W/D/E/I/G)
    return 'W' if L >= 244 else 'D' if L >= 205 else 'E' if L >= 160 else 'I' if L >= 118 else 'G'
def relabel_hair(h, Ls, dxs, ci):
    """3컷의 같은 머리 칸 밝기를 평균 내어 머리카락 칸의 회색 단계를 다시 정한다(번진 JPG 의 칸별 오차를 줄이고 결/하이라이트를 살린다)."""
    h = [r[:] for r in h]
    for r in range(len(h)):
        for c in range(len(h[r])):
            if h[r][c] in 'WDEIG':
                cref = c - dxs[ci]; vals = []
                for i, L in enumerate(Ls):
                    cc = cref + dxs[i]
                    if 0 <= cc < L.shape[1] and r < L.shape[0]: vals.append(L[r, cc])
                if vals: h[r][c] = hair_level(float(np.mean(vals)))
    return h
def assemble(G, GH, LL):
    big = big_figure(); F = {}
    for ri in range(4):
        sp = SPLIT[ri]; heads, dxs = head_consensus([GH[(ri, c)] for c in range(3)], sp); Ls = [LL[(ri, c)] for c in range(3)]
        for ci in range(3):
            g = [list(r) for r in G[(ri, ci)]]
            if (ri, ci) == (0, 1): F[(ri, ci)] = [list(r) for r in big]; continue
            head = [list(r) for r in big[:sp]] if ri == 0 else relabel_hair(seal_fill(heads[ci], 1), Ls, dxs, ci)
            w = len(g[0]); out = [r[:] for r in g]
            for r in range(sp):
                row = (head[r] + ['.'] * w)[:w] if len(head[r]) < w else head[r][:w]
                if ri == 0: row = ['.'] * ((w - len(head[r])) // 2) + head[r] + ['.'] * w; row = row[:w]
                out[r] = row
            F[(ri, ci)] = out
    return F

# ───────── 몸 정리(JPG 번짐 잡티) ─────────
EYE = set('xuvyw'); LIGHT = set('DEWyx'); SKIN = set('oOshl')
def neighbors(g, r, c):
    H = len(g); W = len(g[0])
    return [g[rr][cc] for rr, cc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)) if 0 <= rr < H and 0 <= cc < W]
def majority_neighbor(g, r, c, banned):
    from collections import Counter
    cnt = Counter(ch for rr in (r - 1, r, r + 1) for cc in (c - 1, c, c + 1) if 0 <= rr < len(g) and 0 <= cc < len(g[0]) and (rr, cc) != (r, c) for ch in [g[rr][cc]] if ch not in banned and ch != '.')
    return cnt.most_common(1)[0][0] if cnt else '.'
def clean_body(g, sp, leg):
    """sp 아래(몸)만 손본다. leg = 다리 구역 시작 줄."""
    H = len(g); W = len(g[0]); g = [r[:] for r in g]
    for r in range(sp, H):
        for c in range(W):
            ch = g[r][c]
            if ch in EYE:                                                        # 몸에 눈 색은 없다 → 번진 잡티
                g[r][c] = majority_neighbor(g, r, c, EYE | set('UV'))
            elif ch in 'UV' and (r >= leg or not any(n in 'BC' for n in neighbors(g, r, c))):
                g[r][c] = 'B' if r >= leg else majority_neighbor(g, r, c, EYE | set('UV'))
    if sp > 0:                                                                   # 소매 표식(어두운 붉은색): 피부 근처가 아닌 곳의 갈색 칸 = 팔띠 → V
        base = [r[:] for r in g]
        for r in range(sp + 2, leg):
            for c in range(W):
                if base[r][c] in 'oO' and not any(base[rr][cc] in 'shl' for rr in range(max(r - 1, 0), min(r + 2, H)) for cc in range(max(c - 1, 0), min(c + 2, W))) \
                        and sum(base[rr][cc] in 'BCFUV' for rr in range(max(r - 1, 0), min(r + 2, H)) for cc in range(max(c - 1, 0), min(c + 2, W))) >= 3: g[r][c] = 'V'
    for r in range(sp, H):                                                       # 밝은 회색/흰색: 가장자리면 번진 배경 → 제거, 몸통 안쪽이면 겉옷 밝은색. 다리감개(leg 이하)는 유지
        for c in range(W):
            if g[r][c] in 'DEW' and r < leg:
                edge = c == 0 or c + 1 >= W or g[r][c - 1] == '.' or g[r][c + 1] == '.'
                g[r][c] = '.' if edge else 'K'
    for r in range(leg, H):                                                      # 폭 1칸짜리 세로 밝은 줄(다리감개가 아닌 번짐) 제거
        for c in range(W):
            if g[r][c] in 'DE' and (c == 0 or g[r][c - 1] not in 'DE') and (c + 1 >= W or g[r][c + 1] not in 'DE'): g[r][c] = '.'
    return g

def paint_mark(g, sp):
    """후면 등 표식: 읽힌 갈색 덩어리를 지우고, 원본 크기(6×5도트)·원본 색의 붉은 표식을 같은 중심에 다시 그린다."""
    H = len(g); W = len(g[0]); g = [r[:] for r in g]
    xs = [c for r in range(sp, sp + 6) for c in range(W) if g[r][c] != '.']; cx = (min(xs) + max(xs)) / 2
    pts = [(r, c) for r in range(sp + 2, sp + 16) for c in range(W) if g[r][c] in 'oOh' and abs(c - cx) <= 4.5]
    if not pts: return g
    mr = int(round(np.mean([p[0] for p in pts]))); mc = int(round(np.mean([p[1] for p in pts])))
    for r, c in pts: g[r][c] = majority_neighbor(g, r, c, SKIN | EYE | set('UVrRQ'))
    PAT = ['.rrrr.', 'rRRRRr', 'rRQQRr', 'rRRRRr', '.rrrr.']
    for dr, row in enumerate(PAT):
        for dc, ch in enumerate(row):
            if ch != '.': g[mr - 2 + dr][mc - 3 + dc] = ch      # 6칸 폭: 중심 열 mc 는 왼쪽 가운데
    return g

def pair_vote(A, B, sp):
    """정면/후면의 좌우 보폭 두 컷은 좌우반전 관계 → 몸(sp 줄 아래)을 칸별로 합쳐 번짐을 줄인다. A, B(=반전한 두 번째 컷)에 같은 결과를 돌려준다."""
    def at(g, r, c): return g[r][c] if 0 <= r < len(g) and 0 <= c < len(g[0]) else '.'
    def coherent(g, r, c): ch = at(g, r, c); return sum(1 for n in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)) if at(g, *n) == ch)
    norm = lambda ch: 'C' if ch in 'UV' else ch
    best = max(((dx, dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)), key=lambda d: (sum(1 for r in range(sp, len(A)) for c in range(len(A[0])) if A[r][c] != '.' and norm(A[r][c]) == norm(at(B, r + d[1], c + d[0]))), -abs(d[0]) - abs(d[1])))
    dx, dy = best; H = max(len(A), len(B) - dy); W = len(A[0])
    outA = [r[:] for r in A] + [['.'] * W for _ in range(H - len(A))]; outB = [['.'] * W for _ in range(len(B))]
    for r in range(sp, H):
        for c in range(W):
            a = norm(at(A, r, c)); b = norm(at(B, r + dy, c + dx))
            if a == b: v = a
            else:
                ca = coherent(A, r, c) + (2 if a != '.' else 0); cb = coherent(B, r + dy, c + dx) + (2 if b != '.' else 0)
                v = a if ca >= cb else b
                if v == '.' and (a != '.' or b != '.'): v = a if a != '.' else b if max(ca, cb) >= 3 else '.'
            own = at(A, r, c)
            outA[r][c] = own if own in 'UV' and v == 'C' else v
    return outA, dx, dy

def build_frames():
    G = {}; GH = {}; LL = {}
    for ri in range(4):
        for ci in range(3): G[(ri, ci)], GH[(ri, ci)], LL[(ri, ci)] = read_cell(ri, ci)
    F = assemble(G, GH, LL); H = {}
    for (ri, ci), g in F.items():
        sp = SPLIT[ri]; g = clean_body(g, sp, top_of(g) + 29)
        H[(ri, ci)] = paint_mark(g, sp) if ri == 1 else g
    for ri in (0, 1):                                      # 좌우 보폭 두 컷: 몸 합의
        sp = SPLIT[ri]; A = H[(ri, 0)]; B = mirror(H[(ri, 2)])
        outA, dx, dy = pair_vote(A, B, sp); C = H[(ri, 2)]; C2 = [r[:] for r in C]
        for r in range(sp, len(C2)): C2[r] = ['.'] * len(C2[r])
        for r in range(sp, len(outA)):
            for c in range(len(outA[0])):
                rr, cc = r + dy, c + dx
                if 0 <= rr < len(C2) and 0 <= cc < len(C2[0]): C2[rr][len(C2[0]) - 1 - cc] = outA[r][c]
        H[(ri, 0)] = outA; H[(ri, 2)] = C2
        if ri == 1: H[(ri, 0)] = paint_mark(H[(ri, 0)], sp) if any(ch in 'oOh' for r in H[(ri, 0)][sp:sp + 16] for ch in r) else H[(ri, 0)]
    for ci in (0, 2):                                      # 정면 보폭 컷의 소매 표식: 기본 자세와 같은 몸쪽(화면 오른쪽 소매 바깥 가장자리 2칸) — 원본 화소에도 같은 자리에 붉은 기운이 있음
        g = H[(0, ci)]; r = SPLIT[0] + 7; edge = max(c for c, ch in enumerate(g[r]) if ch != '.')
        if g[r][edge - 2] in 'BC' and g[r][edge - 1] in 'BC': g[r][edge - 2] = 'U'; g[r][edge - 1] = 'V'
    return H

def head_center(g):
    t = top_of(g); xs = [c for r in range(t + 2, t + 7) for c, ch in enumerate(g[r]) if ch != '.']
    return (min(xs) + max(xs)) / 2
def lowest(g): return max(i for i, r in enumerate(g) if any(ch != '.' for ch in r))

def place(H):
    """12컷을 CW×CH 셀에 놓는다: 머리 중심을 셀 가운데 열에, 가장 낮은 발바닥을 BASE 행에(한 행 3컷 모두 같은 기준선)."""
    cells = {}
    for k, g in H.items():
        c = np.zeros((CH, CW), dtype=object); c[:] = '.'
        x0 = int(round(CW / 2 - .5 - head_center(g))); y0 = BASE - lowest(g)
        for r, row in enumerate(g):
            for cc, ch in enumerate(row):
                if ch != '.':
                    X, Y = cc + x0, r + y0
                    assert 0 <= X < CW and 0 <= Y < CH, f'셀 밖으로 나감 {k} {X},{Y}'
                    c[Y, X] = ch
        cells[k] = [''.join(r) for r in c]
    return cells

def to_image(cells):
    img = Image.new('RGBA', (CW * 3, CH * 4), (0, 0, 0, 0)); px = img.load()
    for (ri, ci), g in cells.items():
        for y, row in enumerate(g):
            for x, ch in enumerate(row):
                if ch != '.': px[ci * CW + x, ri * CH + y] = tuple(COST[ch]) + (255,)
    return img

def qa(cells, img):
    """제출 전 검사(실패하면 예외). 결과를 출력한다."""
    a_ = np.array(img); ok = True; log = []
    def chk(name, cond, detail=''):
        nonlocal ok; ok &= bool(cond); log.append(('OK  ' if cond else 'FAIL') + ' ' + name + (' — ' + detail if detail else ''))
    chk('크기', img.size == (CW * 3, CH * 4) and img.mode == 'RGBA', f'{img.size}, 셀 {CW}×{CH}')
    chk('투명 배경 + 불투명 도트만(반투명 0)', set(np.unique(a_[..., 3])) <= {0, 255})
    for (ri, ci), g in sorted(cells.items()):
        m = np.array([[ch != '.' for ch in r] for r in g]); ys, xs = np.where(m)
        chk(f'셀({ri + 1}행,{ci + 1}열) 잘림 없음·여백≥2', ys.min() >= 2 and xs.min() >= 2 and CH - 1 - ys.max() >= 2 and CW - 1 - xs.max() >= 2, f'위{ys.min()} 아래{CH - 1 - ys.max()} 왼{xs.min()} 오른{CW - 1 - xs.max()}')
        hair = sum(g[r][c] in 'WDEIG' for r in range(ys.min(), ys.min() + 10) for c in range(CW))
        chk(f'셀({ri + 1}행,{ci + 1}열) 은발 있음', hair >= 25, f'머리 구역 회/흰 도트 {hair}')
        chk(f'셀({ri + 1}행,{ci + 1}열) 발바닥 기준선={BASE}', ys.max() == BASE, f'{ys.max()}')
    for ri in (2, 3):
        for ci in range(3):
            g = cells[(ri, ci)]; t = min(r for r, row in enumerate(g) if row.strip('.')); eye = [c for r in range(t + 5, t + 13) for c, ch in enumerate(g[r]) if ch in 'xuvyw']
            ctr = head_center(g); ex = np.mean(eye) if eye else None
            chk(f'셀({ri + 1}행,{ci + 1}열) {"화면 왼쪽" if ri == 2 else "화면 오른쪽"}을 봄(눈 위치 vs 머리 중심)', ex is not None and ((ex < ctr) if ri == 2 else (ex > ctr)), f'눈 {ex:.1f} / 머리 중심 {ctr:.1f}')
    # 비대칭 부위: 팔 표식(U/V)은 정면 기본 자세에서 화면 오른쪽 소매 → 같은 몸쪽을 유지
    g = cells[(0, 1)]; ux = [c for row in g for c, ch in enumerate(row) if ch in 'UV']
    chk('정면 기본 자세 소매 표식은 화면 오른쪽', ux and min(ux) > CW // 2, f'열 {min(ux) if ux else None}')
    print('\n'.join(log)); assert ok, 'QA 실패'
    return log

def previews(img, cells):
    S = 6; frames = []
    for t in (1, 0, 1, 2):          # 가운데 → 왼쪽 칸 → 가운데 → 오른쪽 칸
        W = Image.new('RGBA', (CW * S * 4, CH * S), (40, 46, 64, 255))
        for ri in range(4): W.alpha_composite(img.crop((t * CW, ri * CH, (t + 1) * CW, (ri + 1) * CH)).resize((CW * S, CH * S), Image.NEAREST), (ri * CW * S, 0))
        frames.append(W)
    frames[0].convert('P', palette=Image.ADAPTIVE).save(os.path.join(OUT, 'silver_walk_preview.gif'), save_all=True, append_images=[f.convert('P', palette=Image.ADAPTIVE) for f in frames[1:]], duration=220, loop=0, disposal=2)
    strip = Image.new('RGBA', (CW * S * 4, CH * S * 4), (40, 46, 64, 255))
    for t in range(4):
        pass
    sheet = Image.new('RGBA', (CW * S * 4, CH * S * 4), (40, 46, 64, 255))      # 4번의 재생 순서를 한 장에 (행=재생 단계)
    for step, t in enumerate((1, 0, 1, 2)):
        for ri in range(4): sheet.alpha_composite(img.crop((t * CW, ri * CH, (t + 1) * CW, (ri + 1) * CH)).resize((CW * S, CH * S), Image.NEAREST), (ri * CW * S, step * CH * S))
    sheet.save(os.path.join(OUT, 'silver_walk_preview_x6.png'))

if __name__ == '__main__':
    H = build_frames(); cells = place(H); img = to_image(cells)
    img.save(os.path.join(OUT, 'silver_walk_4x3.png')); img.resize((img.width * 8, img.height * 8), Image.NEAREST).save(os.path.join(OUT, 'silver_walk_4x3_x8.png'))
    qa(cells, img); previews(img, cells)
    print('saved', OUT)
