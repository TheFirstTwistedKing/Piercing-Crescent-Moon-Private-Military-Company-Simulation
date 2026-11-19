"""로고 가공: 원본의 회색 배경과 'LIGHT' 글자를 제거하고 투명 PNG로 변환한다.
밝은 영역(검 날/광휘)은 흰색+알파, 어두운 영역(검자루)은 강철색+알파로 매핑해
검은 배경과 홀로그램 그리드 위 어디에 얹어도 자연스럽게 보이게 한다.
사용: python3 -I scripts/make-assets.py
"""
from PIL import Image, ImageFilter
import numpy as np, os

SRC = "assets/source/logo-original.png"
CROP_BOTTOM = 1340          # 'LIGHT' 글자는 y=1381~1411 이므로 그 위에서 자른다
BG = 108.0                  # 원본 배경 회색 (코너 104 ~ 하단 110)

im = Image.open(SRC).convert("L")
w, h = im.size
a = np.asarray(im.crop((0, 0, w, CROP_BOTTOM))).astype(np.float32)

bright = np.clip((a - (BG + 4)) / (255 - (BG + 4)), 0, 1) ** 0.85
# 원본 배경의 미세한 명암 편차(104~110)가 알파에 남아 사각형 잔상이 생기지 않도록 데드존(96 이상은 투명)을 둔다
dark = np.clip((96 - a) / (96 - 30), 0, 1)

alpha = np.maximum(bright, dark * 0.92)
rgb = np.zeros(a.shape + (3,), np.float32)
white = np.array([236, 242, 250], np.float32)
steel = np.array([104, 114, 128], np.float32)
m = (bright >= dark * 0.92)[..., None]
rgb[:] = np.where(m, white, steel)

out = np.dstack([rgb, alpha[..., None] * 255]).astype(np.uint8)
logo = Image.fromarray(out, "RGBA")
# 가장자리 투명 영역 트리밍(여백 약간 남김)
bbox = logo.getchannel("A").point(lambda v: 255 if v > 6 else 0).getbbox()
pad = 24
bbox = (max(bbox[0]-pad,0), max(bbox[1]-pad,0), min(bbox[2]+pad,logo.width), min(bbox[3]+pad,logo.height))
logo = logo.crop(bbox)
target_h = 900
logo = logo.resize((round(logo.width*target_h/logo.height), target_h), Image.LANCZOS)
os.makedirs("assets", exist_ok=True)
logo.save("assets/logo.png", optimize=True)
print("logo", logo.size)

# 앱 아이콘: 검은 배경 정사각형
S = 1024
icon = Image.new("RGBA", (S, S), (0, 0, 0, 255))
fit = logo.copy()
fit.thumbnail((int(S*0.82), int(S*0.82)), Image.LANCZOS)
icon.alpha_composite(fit, ((S-fit.width)//2, (S-fit.height)//2))
icon.convert("RGB").save("assets/icon-1024.png", optimize=True)
print("icon ok")
