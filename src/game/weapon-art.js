// 공방 무기 도트 생성기(순수 함수, DOM 없음).
// 반환 좌표는 손 위치(0,0) 기준(위쪽이 -dy). 역할 글자: B 날 · H 날 밝은 모서리 · D 날 어두운 모서리 · K 어두운 금속 · T 장식 · E 발광 · F 발광 중심 · W 자루 · L 자루 감김
// 손에 드는 무기는 위로 최대 15칸, 아래로 3칸 안에 들어온다. (스프라이트 셀 32×24 / 아이콘 16×20 에서 잘리지 않는 범위)

const half = (n) => (n - 1) >> 1;

/** 검류(단검·쇼트소드·롱소드·그레이트소드·레이피어): 날 모양·곡선·톱니·구멍·가드·자루·장식을 매개변수로 조합 */
export function swordPixels(s) {
  const o = { L: 8, w: 2, tp: 'taper', cv: 0, ed: '', fl: '', holes: [], sp: 0, g: 'cross', gw: 3, grip: 2, gr: 'wrap', pm: 'ball', acc: '', ...s };
  const px = new Map(), put = (x, y, c) => px.set(`${x},${y}`, [x, y, c]), del = (x, y) => px.delete(`${x},${y}`);
  const gh = ['wing', 'disc', 'spike', 'crown', 'gear'].includes(o.g) ? 2 : 1, L = Math.min(o.L, 15 - gh), base = -(gh + 1);
  for (let r = 0; r < L; r++) {
    const f = L > 1 ? r / (L - 1) : 0, rem = L - 1 - r; let wd;
    switch (o.tp) {
      case 'straight': wd = rem === 0 ? 1 : rem === 1 ? Math.max(1, Math.ceil(o.w / 2)) : o.w; break;
      case 'leaf': wd = rem === 0 ? 1 : Math.max(1, Math.round(o.w * (0.55 + 0.6 * Math.sin(Math.PI * (0.15 + 0.85 * f))))); break;
      case 'cleaver': wd = rem === 0 ? Math.max(1, o.w - 1) : o.w; break;
      case 'needle': wd = 1; break;
      case 'flame': wd = rem === 0 ? 1 : Math.max(1, o.w + (r % 3 === 1 ? 1 : 0) - (rem < 2 ? 1 : 0)); break;
      default: wd = Math.max(1, Math.round(o.w * (1 - 0.85 * Math.pow(f, 1.4))));
    }
    const left = -half(wd) + Math.round(o.cv * f * f), y = base - r, rx = left + wd - 1, cx = left + (wd >> 1);
    for (let i = 0; i < wd; i++) put(left + i, y, wd >= 2 && i === 0 ? 'H' : wd >= 3 && i === wd - 1 ? 'D' : 'B');
    if (o.fl && wd >= 3 && r >= 1 && r <= L - 3) put(cx, y, o.fl === 'E' ? 'E' : 'D');
    if (o.holes.includes(r) && wd >= 3) del(cx, y);
    if (o.acc === 'crack' && wd >= 2 && r > 0 && (r * 2 + 1) % 5 === 0) put(cx, y, 'E');
    if (o.acc === 'zig' && wd >= 2 && r >= 1 && rem > 0) put(left + (r % 2 ? wd - 1 : 0), y, 'E');
    if (o.acc === 'rivet' && wd >= 3 && r % 3 === 1) put(left, y, 'T');
    if (o.ed === 'serr' && r > 1 && rem > 0 && r % 2 === 1 && wd >= 2) del(rx, y);
    if (o.ed === 'bites' && rem > 1 && r > 2 && wd >= 3) { if (r % 5 === 2) del(rx, y); if (r % 5 === 3) { del(rx, y); del(rx - 1, y); } }
    if (o.ed === 'zig' && r > 0 && rem > 0 && r % 2 === 0) put(rx + 1, y, 'D');
    if (o.sp && r >= 1 && rem >= 1) put(left - 1, y, 'K');
  }
  const gw = o.gw, h = half(gw), row = (dy, w2, c) => { const hh = half(w2); for (let x = -hh; x <= w2 - 1 - hh; x++) put(x, dy, c); };
  switch (o.g) {
    case 'wing': row(-1, gw, 'K'); put(-h, -2, 'K'); put(gw - 1 - h, -2, 'K'); put(0, -1, 'T'); break;
    case 'drop': row(-1, gw, 'K'); put(-h, 0, 'K'); put(gw - 1 - h, 0, 'K'); put(0, -1, 'T'); break;
    case 'disc': row(-1, gw, 'K'); row(-2, Math.max(1, gw - 2), 'K'); put(0, -1, 'E'); break;
    case 'gear': for (let x = -h; x <= gw - 1 - h; x++) put(x, -1, (x + h) % 2 ? 'T' : 'K'); row(-2, Math.max(1, gw - 2), 'K'); break;
    case 'spike': row(-1, gw, 'K'); put(-h, -2, 'K'); put(gw - 1 - h, -2, 'K'); put(-h, 0, 'K'); put(gw - 1 - h, 0, 'K'); break;
    case 'crown': row(-1, gw, 'K'); for (let x = -h; x <= gw - 1 - h; x += 2) put(x, -2, 'T'); break;
    case 'bar': row(-1, gw, 'K'); put(-h, -1, 'T'); put(gw - 1 - h, -1, 'T'); put(0, -1, 'E'); break;
    default: row(-1, gw, 'K'); put(0, -1, 'T');
  }
  for (let y = 0; y < o.grip; y++) put(0, y, o.gr === 'plain' || y % 2 === 0 ? 'W' : 'L');
  const g = o.grip;
  if (o.pm === 'ball') put(0, g, 'T');
  else if (o.pm === 'spike') { put(0, g, 'K'); put(0, g + 1, 'D'); }
  else if (o.pm === 'ring') { put(-1, g, 'K'); put(1, g, 'K'); put(0, g + 1, 'K'); }
  else if (o.pm === 'cap') row(g, 3, 'K');
  else if (o.pm === 'orb') { put(0, g, 'E'); put(0, g + 1, 'K'); }
  return [...px.values()];
}

/** 아스키 머리 + 자루: 창·망치·두손 망치·손도끼·배틀엑스. rows 의 ox 번째 칸이 자루 위치, top 은 첫 줄의 dy. 머리 아래로 자루가 손 아래까지 이어진다. */
export function headPixels({ rows, ox, top, butt = 'cap' }) {
  const px = []; rows.forEach((line, i) => [...line].forEach((ch, j) => { if (ch !== '.') px.push([j - ox, top + i, ch]); }));
  const bottom = top + rows.length;
  for (let dy = bottom; dy <= 2; dy++) px.push([0, dy, (dy - bottom) % 4 === 3 ? 'L' : 'W']);
  if (butt === 'cap') px.push([0, 3, 'K']); else if (butt === 'spike') { px.push([0, 3, 'K']); }
  return px;
}

/** 방패/건틀렛: 아스키 격자 → [x, y, 역할] (격자 좌표) */
export function gridPixels(rows) { const px = []; rows.forEach((line, y) => [...line].forEach((ch, x) => { if (ch !== '.') px.push([x, y, ch]); })); return px; }

/** 같은 줄에서 같은 역할이 이어지면 한 사각형으로 합친다: [x, y, w, 1, 역할] */
export function toRects(px) {
  const rows = new Map(); for (const [x, y, c] of px) { if (!rows.has(y)) rows.set(y, []); rows.get(y).push([x, c]); }
  const out = [];
  for (const [y, list] of rows) { list.sort((a, b) => a[0] - b[0]); let i = 0; while (i < list.length) { let j = i; while (j + 1 < list.length && list[j + 1][0] === list[j][0] + 1 && list[j + 1][1] === list[i][1]) j++; out.push([list[i][0], y, j - i + 1, 1, list[i][1]]); i = j + 1; } }
  return out;
}

/** 공방별 색 팔레트(역할 → 색) */
export const PALETTES = {
  magma: { B: '#76615f', D: '#3a2d30', H: '#c2a8a2', K: '#241c1f', T: '#c0502a', E: '#ff7a2a', F: '#ffd27a', W: '#6a4030', L: '#3a2218' },
  arc: { B: '#b9c9d8', D: '#6f8499', H: '#eaf6ff', K: '#3a4656', T: '#4fd8ff', E: '#4fd8ff', F: '#e6fbff', W: '#3a5a78', L: '#1f2c3a' },
  wad: { B: '#9aa4af', D: '#5f6a76', H: '#dfe5eb', K: '#3d454e', T: '#d8b64e', E: '#d8b64e', F: '#fff1b0', W: '#5e6b78', L: '#2a323a' },
};
