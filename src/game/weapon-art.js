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
  magma: { B: '#8e7571', D: '#5a4745', H: '#dcc2b8', K: '#4e3d3e', T: '#e0642a', E: '#ff8a3a', F: '#ffe08a', W: '#8a5a3e', L: '#52331f' },
  arc: { B: '#b9c9d8', D: '#6f8499', H: '#eaf6ff', K: '#4a5a6e', T: '#4fd8ff', E: '#4fd8ff', F: '#e6fbff', W: '#3a5a78', L: '#1f2c3a' },
  wad: { B: '#9aa4af', D: '#66717d', H: '#dfe5eb', K: '#4c5662', T: '#d8b64e', E: '#d8b64e', F: '#fff1b0', W: '#5e6b78', L: '#2a323a' },
};

/** 총기(옆모습, 총구가 오른쪽): 개머리판·몸체·핸드가드·총열·총구·손잡이·탄창·조준경·양각대·발광 장식을 조합한다.
    반환 좌표는 손잡이(손) 기준: +x 총구 방향, +y 아래. 전체 길이는 16칸 이내. tube 가 있으면 로켓/박격포 같은 발사관형. */
export const gunPixels = (s) => gunBuild(s).px;
export const gunArt = (s, hand) => { const b = gunBuild(s); return { kind: 'gun', px: b.px, px2: hand || b.px2 }; };   // hand: 손그림 2배 도안(없으면 사양에서 자동 생성)
export function gunBuild(s) {
  const o = { stock: 'none', sl: 3, body: 5, bh: 3, bar: 4, bt: 1, hg: 0, mz: 'none', grip: 'pistol', gp: 2, fore: 0, mag: 'none', mp: 1, top: 'iron', bipod: 0, glow: '', fins: 0, tube: null, ...s };
  const px = new Map(), put = (x, y, c) => px.set(`${x},${y}`, [x, y, c]), hl = (x, y, n, c) => { for (let i = 0; i < n; i++) put(x + i, y, c); }, vl = (x, y, n, c) => { for (let i = 0; i < n; i++) put(x, y + i, c); };
  let ax, ay;   // 손(손잡이) 위치
  const LY = {};   // 2배 해상도 디테일용 배치 정보
  if (o.tube) {
    const T = { len: 10, th: 3, flare: 'both', head: 'none', plate: 0, bipod: 0, grip: 2, pad: 0, sight: 0, ...o.tube }, x0 = T.pad ? 2 : 0, th = T.th;
    for (let i = 0; i < T.len; i++) for (let y = 0; y < th; y++) put(x0 + i, y, y === 0 ? 'H' : y === th - 1 ? 'D' : 'O');
    const ring = (x) => { put(x, -1, 'K'); put(x, th, 'K'); for (let y = 0; y < th; y++) put(x, y, 'K'); };
    if (T.flare === 'both' || T.flare === 'rear') ring(x0); if (T.flare === 'both') ring(x0 + T.len - 1);
    if (T.pad) { vl(0, -1, th + 3, 'K'); vl(1, 0, th + 1, 'W'); }
    const xe = x0 + T.len;
    if (T.head === 'rocket') { vl(xe, 0, th, 'R'); vl(xe + 1, 1, th - 2 > 0 ? th - 2 : 1, 'R'); put(xe + 2, Math.floor(th / 2), 'T'); }
    if (T.head === 'shell') { vl(xe, 1, th - 1, 'T'); put(xe + 1, 1 + Math.floor((th - 1) / 2), 'T'); }
    const gx = x0 + Math.floor(T.len / 2) + 1; ax = gx; ay = th + 1; Object.assign(LY, { tube: T, x0, th, xe, gx });
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
    const gx = xs + o.gp; ax = gx; ay = bh + 1; Object.assign(LY, { xs, bh, bt, xend, gx, mx: xs + o.mp, hx: xs + o.body, bx: xs + o.body + o.hg });
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
  return { px: [...px.values()].map(([x, y, c]) => [x - ax, y - ay, c]), px2: gunFine(o, LY, px, ax, ay) };
}

/** 총기 2배 해상도 도안: 1칸 도트를 2×2 로 쪼갠 뒤(반 칸 단위) 격발장치·탄창 리브·가늠자·핸드가드 슬릿·조준경 렌즈·그립 체커링 같은 세부를 얹는다.
    좌표는 반 칸 단위이며 gunBuild().px(1칸 도안)와 같은 손 위치 기준이다. 실루엣 검증은 1칸 도안으로, 그리기는 이 도안으로 한다. */
function gunFine(o, LY, px, ax, ay) {
  const m = new Map(), key = (x, y) => `${x},${y}`, put = (x, y, c) => m.set(key(x, y), [x, y, c]), del = (x, y) => m.delete(key(x, y)), has = (x, y) => m.has(key(x, y));
  const hl = (x, y, n, c) => { for (let i = 0; i < n; i++) put(x + i, y, c); }, vl = (x, y, n, c) => { for (let i = 0; i < n; i++) put(x, y + i, c); };
  for (const [x, y, c] of px.values()) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) put(2 * x + dx, 2 * y + dy, c === 'E' && !dx && !dy ? 'F' : c === 'T' ? (!dx && !dy ? 'Tl' : dx && dy ? 'Td' : 'T') : c);
  const ogive = (x2, H, len, mid, fill, tip) => { for (let k = 0; k < len; k++) { const hh = Math.max(1, Math.round(H * Math.sqrt(1 - Math.pow((k + 0.5) / (len + 0.5), 2)))), top = mid - Math.ceil(hh / 2); for (let j = 0; j < hh; j++) put(x2 + k, top + j, k === len - 1 ? tip : fill); } };
  if (LY.tube) {
    const { tube: T, x0, th, xe, gx } = LY, X0 = 2 * x0, len2 = 2 * T.len;
    for (let i = 2; i < len2 - 2; i += 3) put(X0 + i, 0, 'Y');                        // 관 위쪽 반사광
    if (T.len >= 7) { v2(X0 + Math.round(len2 * 0.28), 1, 2 * th - 2, 'D'); v2(X0 + Math.round(len2 * 0.72), 1, 2 * th - 2, 'D'); }
    function v2(x, y, n, c) { vl(x, y, n, c); }
    if (T.head === 'rocket') { for (const k of [...m.keys()]) if (m.get(k)[0] >= 2 * xe) m.delete(k); ogive(2 * xe, 2 * th, 6, th, 'R', 'Tl'); vl(2 * xe + 1, th - 2, 4, 'Y'); }
    if (T.head === 'shell') { for (const k of [...m.keys()]) if (m.get(k)[0] >= 2 * xe) m.delete(k); ogive(2 * xe, 2 * (th - 1), 4, 1 + th - 1 + 0, 'T', 'Tl'); vl(2 * xe, 3, 2, 'Tl'); }
    if (T.plate) { put(1, 0, 'Y'); put(1, 2 * (th + 2), 'Y'); }
    if (T.grip) { for (let i = 0; i <= T.grip; i++) { put(2 * gx, 2 * th + 1 + 2 * i, 'Wd'); put(2 * gx + 1, 2 * th + 2 + 2 * i, 'Wd'); } put(2 * gx + 3, 2 * th + 1, 'Tl'); }
    if (T.sight) { put(2 * (x0 + Math.floor(T.len / 2)), -4, 'Y'); }
  } else {
    const { xs, bh, bt, xend, gx, mx, hx, bx } = LY, X0 = 2 * xs, bw = 2 * o.body, bH = 2 * bh, be = bx + o.bar, scoped = ['scope', 'bigscope', 'carry'].includes(o.top);
    if (o.body >= 4 && bh >= 2) { hl(X0 + bw - 6, 1, 3, 'L'); put(X0 + bw - 3, 1, 'D'); }       // 탄피 배출구
    if (o.body >= 3 && !scoped) { put(X0 + bw - 3, -1, 'K'); put(X0 + bw - 2, -1, 'D'); }       // 장전 손잡이
    put(X0 + 1, 1, 'Y'); if (bw >= 8) put(X0 + bw - 2, bH - 2, 'Y');                             // 나사 반사광
    for (let i = 1; i < 2 * o.hg - 1; i += 3) { put(2 * hx + i, 1, 'L'); put(2 * hx + i, 2, 'L'); }   // 핸드가드 통풍 슬릿
    if (o.bar >= 2) { v2(2 * be - 3, 0, 2 * bt, 'D'); }                                          // 총구 쪽 링
    if (o.mz === 'none' && o.bar >= 1) put(2 * be - 1, 2 * bt - 1, 'L');                         // 총열 구멍
    if (o.mz === 'brake') { put(2 * be + 1, 0, 'L'); put(2 * be + 1, 2, 'L'); put(2 * be + 3, 1, 'L'); }
    if (o.mz === 'supp') { v2(2 * be + 2, 0, 2 * bt + 2, 'D'); v2(2 * be + 4, 0, 2 * bt + 2, 'D'); put(2 * be + 5, 2 * bt - 1, 'L'); }
    if (o.mz === 'flash') { put(2 * be, 0, 'L'); put(2 * be + 1, 1, 'L'); }
    if (o.top === 'iron') { del(2 * (xend - 1), -2); del(2 * (xend - 1), -1); put(2 * (xend - 1) + 1, -2, 'K'); put(2 * (xend - 1) + 1, -1, 'K'); put(2 * (xs + 1), -2, 'K'); del(2 * (xs + 1) + 1, -2); }   // 앞 가늠쇠는 반 칸 폭 기둥, 뒤 가늠자는 홈이 파인 모양
    // 손잡이: 미끄럼 방지 체커링 + 방아쇠울 + 방아쇠
    if (o.grip === 'pistol') {
      const gy = bH; for (let i = 0; i < 3; i++) { put(2 * gx, gy + 1 + 2 * i, 'Wd'); put(2 * gx + 1, gy + 2 + 2 * i, 'Wd'); } put(2 * gx, gy, 'Wh');
      del(2 * gx, gy + 5); put(2 * gx + 2, gy + 4, 'Wd'); put(2 * gx + 2, gy + 5, 'Wd');
      for (let yy = gy; yy < gy + 4; yy++) { del(2 * gx + 2, yy); del(2 * gx + 3, yy); }   // 1칸 도안의 옆면 조각을 지우고 방아쇠울을 다시 그린다
      vl(2 * gx + 2, gy, 1, 'K'); hl(2 * gx + 2, gy + 3, 4, 'K'); vl(2 * gx + 5, gy, 4, 'K'); put(2 * gx + 3, gy + 1, 'Tl'); put(2 * gx + 3, gy + 2, 'Td');
    }
    // 탄창: 가로 리브 + 밑판
    const ribs = (rows, w = 4) => { for (const r of rows) { for (let i = 0; i < w; i++) if (has(2 * mx + i, r)) put(2 * mx + i, r, i < 2 ? 'L' : 'K'); } };
    if (o.mag === 'box') { ribs([bH + 2, bH + 4]); put(2 * mx - 1, bH + 5, 'K'); put(2 * mx + 4, bH + 5, 'K'); }
    else if (o.mag === 'long') { ribs([bH + 2, bH + 4, bH + 6]); put(2 * mx - 1, bH + 7, 'K'); put(2 * mx + 4, bH + 7, 'K'); }
    else if (o.mag === 'curve') ribs([bH + 1, bH + 6]);
    else if (o.mag === 'drum') { del(2 * mx - 2, bH + 2); del(2 * mx + 7, bH + 2); del(2 * mx - 2, bH + 3); del(2 * mx + 7, bH + 3); put(2 * mx + 2, bH + 2, 'L'); put(2 * mx + 4, bH + 3, 'L'); put(2 * mx + 3, bH + 2, 'Y'); }
    else if (o.mag === 'belt') { for (let i = 1; i < 6; i += 2) put(2 * mx + i, bH, 'L'); }
    // 조준경: 렌즈 반사 + 거치 링
    if (o.top === 'scope') { for (let x = X0 + 1; x <= X0 + bw; x++) { put(x, -2, 'D'); put(x, -1, 'K'); } put(X0 + 4, -2, 'Y'); put(X0 + 5, -2, 'Y'); put(X0 + 2, -1, 'L'); put(X0 + bw - 3, -1, 'L'); put(X0 + 4, -3, 'K'); put(X0 + 5, -3, 'D'); }
    if (o.top === 'bigscope') { for (let x = X0 + 1; x <= X0 + bw + 2; x++) { put(x, -4, 'D'); put(x, -3, 'K'); } for (let x = X0 + 3; x <= X0 + bw; x++) { put(x, -2, 'K'); put(x, -1, 'D'); } for (const x of [X0 + 3, X0 + 4, X0 + 8, X0 + 9, X0 + 14]) if (has(x, -4)) put(x, -4, 'Y'); put(X0 + bw + 2, -5, 'K'); put(X0 + bw + 3, -5, 'K'); put(X0 + 6, -5, 'K'); put(X0 + 7, -5, 'D'); put(X0 + 4, -2, 'L'); put(X0 + bw - 2, -2, 'L'); }
    if (o.top === 'carry') { for (let x = X0 + 3; x <= X0 + bw - 4; x++) put(x, -4, 'D'); }
    if (o.top === 'rail') for (let i = 0; i < bw; i++) { del(X0 + i, -2); put(X0 + i, -1, i % 4 === 3 ? 'L' : 'D'); }   // 피카티니 레일: 얇은 띠 + 홈
    // 개머리판
    if (o.stock === 'full') { for (let i = 1; i < 2 * o.sl; i++) { put(i, 1 + (i % 3), 'Wd'); } v2(0, 1, bH - 1, 'L'); put(1, -1, 'Wh'); }
    if (o.stock === 'fold') { for (let i = 0; i < 2 * o.sl; i++) del(i, 2); v2(0, 1, 4, 'K'); put(2 * o.sl - 1, 3, 'Y'); }
    if (o.stock === 'skel') { put(0, 1, 'L'); put(1, 0, 'Y'); }
    if (o.stock === 'bulk') { v2(0, 1, bH, 'L'); }
    function v2(x, y, n, c) { vl(x, y, n, c); }
  }
  // 모서리 음영: 위가 비어 있으면 한 단계 밝게, 아래가 비어 있으면 한 단계 어둡게
  const TOP = { B: 'H', D: 'B', K: 'D', W: 'Wh', O: 'B' }, BOT = { B: 'D', H: 'B', D: 'K', W: 'Wd', O: 'D' };
  const snap = [...m.values()];
  for (const [x, y, c] of snap) {
    if (!has(x, y - 1) && TOP[c]) put(x, y, TOP[c]); else if (!has(x, y + 1) && BOT[c]) put(x, y, BOT[c]);
    if (c === 'H' && !has(x, y - 1) && (x >> 1) % 3 === 0) put(x, y, 'Y');
  }
  return [...m.values()].map(([x, y, c]) => [x - 2 * ax, y - 2 * ay, c]);
}

/** 총기 도트는 공방/종류별로 색 역할 → 색 팔레트를 쓴다 */
export const GUN_PALETTES = {
  gun: { B: '#707a86', D: '#555d68', H: '#aeb8c4', K: '#3a4048', T: '#d4ac4e', E: '#7fb0e8', F: '#cfe6ff', W: '#8c6238', L: '#14171a', R: '#c0443a', O: '#6a7f50', G: '#7fb0e8' },
  magma: { B: '#85696c', D: '#52413f', H: '#cfb2b4', K: '#443436', T: '#e0642a', E: '#ff8a3a', F: '#ffe08a', W: '#855640', L: '#150d0c', R: '#c0443a', O: '#a06c52', G: '#ffab4a' },
  arc: { B: '#a9b9c9', D: '#667b92', H: '#e6f4ff', K: '#44546a', T: '#4fd8ff', E: '#4fd8ff', F: '#e6fbff', W: '#33506a', L: '#12181f', R: '#b46bff', O: '#3a5a78', G: '#b46bff' },
  wad: { B: '#8f98a3', D: '#606b77', H: '#d9dfe6', K: '#444d57', T: '#d8b64e', E: '#d8b64e', F: '#fff1b0', W: '#5a4a38', L: '#16191d', R: '#a5382a', O: '#56604a', G: '#7fc8ff' },
};

// 2배 해상도 도안에서 쓰는 보조 역할 색(밝기 변형): Y 반사광 · Wh/Wd 나무 밝게/어둡게 · Tl/Td 장식 밝게/어둡게
const mixHex = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
for (const p of Object.values(GUN_PALETTES)) { p.Y = mixHex(p.H, '#ffffff', 0.55); p.Wh = mixHex(p.W, '#ffffff', 0.3); p.Wd = mixHex(p.W, '#000000', 0.4); p.Tl = mixHex(p.T, '#ffffff', 0.5); p.Td = mixHex(p.T, '#000000', 0.4); }
