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

/** 총기(옆모습, 총구가 오른쪽): 개머리판·몸체·핸드가드·총열·총구·손잡이·탄창·조준경·양각대·발광 장식을 조합한다.
    반환 좌표는 손잡이(손) 기준: +x 총구 방향, +y 아래. 전체 길이는 16칸 이내. tube 가 있으면 로켓/박격포 같은 발사관형. */
export function gunPixels(s) {
  const o = { stock: 'none', sl: 3, body: 5, bh: 3, bar: 4, bt: 1, hg: 0, mz: 'none', grip: 'pistol', gp: 2, fore: 0, mag: 'none', mp: 1, top: 'iron', bipod: 0, glow: '', fins: 0, tube: null, ...s };
  const px = new Map(), put = (x, y, c) => px.set(`${x},${y}`, [x, y, c]), hl = (x, y, n, c) => { for (let i = 0; i < n; i++) put(x + i, y, c); }, vl = (x, y, n, c) => { for (let i = 0; i < n; i++) put(x, y + i, c); };
  let ax, ay;   // 손(손잡이) 위치
  if (o.tube) {
    const T = { len: 10, th: 3, flare: 'both', head: 'none', plate: 0, bipod: 0, grip: 2, pad: 0, sight: 0, ...o.tube }, x0 = T.pad ? 2 : 0, th = T.th;
    for (let i = 0; i < T.len; i++) for (let y = 0; y < th; y++) put(x0 + i, y, y === 0 ? 'H' : y === th - 1 ? 'D' : 'O');
    const ring = (x) => { put(x, -1, 'K'); put(x, th, 'K'); for (let y = 0; y < th; y++) put(x, y, 'K'); };
    if (T.flare === 'both' || T.flare === 'rear') ring(x0); if (T.flare === 'both') ring(x0 + T.len - 1);
    if (T.pad) { vl(0, -1, th + 3, 'K'); vl(1, 0, th + 1, 'W'); }
    const xe = x0 + T.len;
    if (T.head === 'rocket') { vl(xe, 0, th, 'R'); vl(xe + 1, 1, th - 2 > 0 ? th - 2 : 1, 'R'); put(xe + 2, Math.floor(th / 2), 'T'); }
    if (T.head === 'shell') { vl(xe, 1, th - 1, 'T'); put(xe + 1, 1 + Math.floor((th - 1) / 2), 'T'); }
    const gx = x0 + Math.floor(T.len / 2) + 1; ax = gx; ay = th + 1;
    if (T.grip) { vl(gx, th, T.grip + 1, 'W'); put(gx + 1, th, 'K'); }
    if (T.sight) { put(x0 + Math.floor(T.len / 2), -1, 'K'); put(x0 + Math.floor(T.len / 2), -2, 'G'); }
    if (T.plate) { vl(0, -1, th + 4, 'D'); vl(1, -1, th + 4, 'K'); put(0, th + 3, 'K'); }
    if (T.bipod) { const bx = xe - 3; put(bx, th + 1, 'K'); put(bx - 1, th + 2, 'K'); put(bx - 2, th + 3, 'K'); put(bx + 2, th + 1, 'K'); put(bx + 3, th + 2, 'K'); put(bx + 4, th + 3, 'K'); }
    if (o.glow === 'cells') for (let i = 2; i < T.len - 1; i += 2) put(x0 + i, 1, 'E');
    if (o.glow === 'line') for (let i = 1; i < T.len - 1; i++) put(x0 + i, 1, 'E');
  } else {
    const xs = o.stock === 'none' ? 0 : o.sl, bh = o.bh, bt = o.bt;
    // 개머리판
    if (o.stock === 'full') { for (let i = 0; i < o.sl; i++) vl(i, 0, bh, 'W'); vl(0, -1 + 0, bh + 1, 'K'); }
    else if (o.stock === 'skel') { hl(0, 0, o.sl, 'K'); hl(0, bh, o.sl, 'K'); vl(0, 0, bh + 1, 'K'); }
    else if (o.stock === 'fold') hl(0, 1, o.sl, 'K');
    else if (o.stock === 'bulk') { for (let i = 0; i < o.sl; i++) vl(i, 0, bh + 1, i % 2 ? 'K' : 'D'); put(0, 0, 'T'); }
    else if (o.stock === 'pad') { vl(xs - 1, -0, bh + 1, 'K'); }
    // 몸체
    for (let i = 0; i < o.body; i++) for (let y = 0; y < bh; y++) put(xs + i, y, y === 0 ? 'H' : y === bh - 1 ? 'D' : 'B');
    if (bh >= 2) put(xs + 1, 1, 'L');
    // 핸드가드 → 총열 → 총구
    let x = xs + o.body;
    for (let i = 0; i < o.hg; i++) for (let y = 0; y <= bt; y++) put(x + i, y, y === 0 ? (i % 2 ? 'H' : 'D') : 'B'); x += o.hg;
    for (let i = 0; i < o.bar; i++) { for (let y = 0; y < bt; y++) put(x + i, y, y === 0 ? 'H' : 'K'); if (o.fins && i % 2 === 0 && i > 0) { put(x + i, -1, 'D'); put(x + i, bt, 'D'); } } x += o.bar;
    if (o.mz === 'brake') { vl(x, -1, bt + 2, 'D'); vl(x + 1, -1, bt + 2, 'K'); x += 2; }
    else if (o.mz === 'supp') { for (let i = 0; i < 3; i++) for (let y = 0; y <= bt + 1; y++) put(x + i, y - (bt > 1 ? 0 : 0), y === 0 ? 'H' : 'K'); x += 3; }
    else if (o.mz === 'flash') { put(x, -1, 'K'); put(x, bt, 'K'); put(x, 0, 'D'); x += 1; }
    else if (o.mz === 'cone') { vl(x, 0, bt, 'D'); vl(x + 1, -1, bt + 2, 'K'); x += 2; }
    const xend = x;
    // 손잡이 · 앞손잡이
    const gx = xs + o.gp; ax = gx; ay = bh + 1;
    if (o.grip === 'pistol') { vl(gx, bh, 3, 'W'); put(gx + 1, bh, 'K'); put(gx + 1, bh + 1, 'L'); }
    if (o.fore && o.hg) vl(xs + o.body + 1, bt + 1, o.fore, 'W');
    // 탄창
    const mx = xs + o.mp;
    if (o.mag === 'box') { vl(mx, bh, 3, 'K'); vl(mx + 1, bh, 3, 'D'); }
    else if (o.mag === 'long') { vl(mx, bh, 4, 'K'); vl(mx + 1, bh, 4, 'D'); }
    else if (o.mag === 'curve') { vl(mx, bh, 2, 'K'); vl(mx + 1, bh, 2, 'D'); vl(mx + 1, bh + 2, 2, 'K'); vl(mx + 2, bh + 2, 2, 'D'); }
    else if (o.mag === 'drum') { hl(mx, bh, 3, 'D'); hl(mx - 1, bh + 1, 5, 'K'); put(mx + 1, bh + 1, 'T'); hl(mx, bh + 2, 3, 'D'); }
    else if (o.mag === 'belt') { hl(mx, bh, 3, 'O'); hl(mx, bh + 1, 3, 'K'); put(mx + 3, bh + 1, 'T'); put(mx + 3, bh + 2, 'T'); put(mx + 2, bh + 3, 'T'); }
    // 조준기
    if (o.top === 'iron') { put(xend - 1, -1, 'K'); put(xs + 1, -1, 'K'); }
    else if (o.top === 'dot') { hl(xs + 1, -1, 2, 'K'); put(xs + 2, -1, 'E'); }
    else if (o.top === 'scope') { hl(xs, -1, o.body + 1, 'K'); put(xs + o.body, -1, 'G'); put(xs, -1, 'G'); }
    else if (o.top === 'bigscope') { hl(xs, -2, o.body + 2, 'K'); hl(xs + 1, -1, o.body, 'D'); put(xs + o.body + 1, -2, 'G'); put(xs, -2, 'G'); }
    else if (o.top === 'carry') { put(xs + 1, -1, 'K'); put(xs + o.body - 2, -1, 'K'); hl(xs + 1, -2, o.body - 2, 'K'); }
    else if (o.top === 'rail') for (let i = 0; i < o.body; i += 2) put(xs + i, -1, 'D');
    // 양각대
    if (o.bipod) { const bx = xend - 3; put(bx, bt + 1, 'K'); put(bx - 1, bt + 2, 'K'); put(bx + 1, bt + 1, 'K'); put(bx + 2, bt + 2, 'K'); }
    // 발광 장식
    if (o.glow === 'cells') for (let i = 1; i < o.body - 1; i += 2) put(xs + i, Math.min(1, bh - 1), 'E');
    if (o.glow === 'line') for (let i = 0; i < o.bar; i++) if (i % 2 === 0) put(xs + o.body + o.hg + i, 0, 'E');
    if (o.glow === 'core') { put(xs + o.body - 1, Math.min(1, bh - 1), 'F'); put(xs + o.body - 2, Math.min(1, bh - 1), 'E'); put(xend - 1, 0, 'E'); }
  }
  return [...px.values()].map(([x, y, c]) => [x - ax, y - ay, c]);
}

/** 총기 도트는 공방/종류별로 색 역할 → 색 팔레트를 쓴다 */
export const GUN_PALETTES = {
  gun: { B: '#59616b', D: '#3a3f46', H: '#8b95a1', K: '#1c1f24', T: '#c9a24a', E: '#7fb0e8', F: '#cfe6ff', W: '#6a4a2a', L: '#0e1013', R: '#a5382a', O: '#4a5a3a', G: '#7fb0e8' },
  magma: { B: '#6a5558', D: '#2e2326', H: '#b09294', K: '#17100f', T: '#c0502a', E: '#ff7a2a', F: '#ffd27a', W: '#5a3626', L: '#0b0606', R: '#a5382a', O: '#5a3a2a', G: '#ff9b3a' },
  arc: { B: '#a9b9c9', D: '#5f748a', H: '#e6f4ff', K: '#2b3644', T: '#4fd8ff', E: '#4fd8ff', F: '#e6fbff', W: '#33506a', L: '#12181f', R: '#b46bff', O: '#3a5a78', G: '#b46bff' },
  wad: { B: '#8f98a3', D: '#555f6b', H: '#d9dfe6', K: '#2e353d', T: '#d8b64e', E: '#d8b64e', F: '#fff1b0', W: '#5a4a38', L: '#16191d', R: '#a5382a', O: '#56604a', G: '#7fc8ff' },
};
