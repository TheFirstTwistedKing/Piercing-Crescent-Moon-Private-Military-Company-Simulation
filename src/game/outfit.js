// 복장(옷) 엔진 — 몸 프레임(body-frames.js)의 부위(몸통·소매·팔·다리·신발)를 찾아 복장 설계(spec)대로 다시 칠한다.
// 사람(남/여)·방향(정면/후면/옆)·걸음(3프레임)마다 같은 규칙으로 칠하므로 보폭·팔 흔들림은 몸 프레임 그대로이고, 코트 자락·바지 폭·신발만 규칙대로 바뀐다.
// 글자(재질 3단계: 기본 · 밝음 · 어두움/외곽선): 겉옷 a b d / 안감 e / 셔츠 f i g / 조끼 j k n / 바지 m p N / 신발 q t z / 포인트 A J L / 장갑 X Y / 벨트 P / 금속 S T / 넥타이 ⊤(=타이는 포인트 A)
import { BODY_FRAMES } from './body-frames.js';

const W = 32;
const SKIN = 'oOshlxuvyw', isSkin = (c) => SKIN.includes(c), isJ = (c) => 'FHKIGrRQ'.includes(c), isS = (c) => 'BCUV'.includes(c);
const OUT = { a: 'd', b: 'd', d: 'd', e: 'd', f: 'g', i: 'g', g: 'g', j: 'n', k: 'n', n: 'n', m: 'N', p: 'N', N: 'N', q: 'z', t: 'z', z: 'z', A: 'L', J: 'L', L: 'L', X: 'X', Y: 'X', P: 'P', S: 'T', T: 'T' };
const CLOTH = new Set(Object.keys(OUT));

function ctxOf(g, fd, dir) {
  const H = g.length, sp = fd.sp, leg = fd.leg, front = dir === 'down', back = dir === 'up', side = !front && !back;
  let bottom = H - 1; while (bottom > 0 && !g[bottom].some((c) => c !== '.')) bottom--;
  const jext = (r) => { let a = -1, b = -1; for (let x = 0; x < W; x++) if (isJ(g[r][x])) { if (a < 0) a = x; b = x; } return [a, b]; };
  let a = 99, b = -1; for (let r = leg - 6; r <= leg - 2; r++) { const [x0, x1] = jext(r); if (x0 >= 0) { a = Math.min(a, x0); b = Math.max(b, x1); } }
  const wraps = []; for (let r = leg + 1; r <= bottom; r++) if (g[r].some((c) => c === 'E' || c === 'D')) wraps.push(r);
  const shoeTop = wraps.length ? Math.max(...wraps) + 1 : bottom - 3;
  return { H, sp, leg, front, back, side, bottom, jext, cx: (a + b) / 2, tx0: a, tx1: b, n: leg - sp, wraps, shoeTop };
}
const put = (g, x, y, ch) => { if (y >= 0 && y < g.length && x >= 0 && x < W) g[y][x] = ch; };
const at = (g, x, y) => (y >= 0 && y < g.length && x >= 0 && x < W ? g[y][x] : '.');

// ───────── 몸통 ─────────
function torso(g, c, S, dir) {
  const { sp, leg, n, cx } = c, co = S.coat, inner = S.inner || 'shirt';
  for (let r = sp; r <= leg; r++) {
    const [x0, x1] = c.jext(r); if (x0 < 0) continue; const ry = r - sp;
    for (let x = x0; x <= x1; x++) {
      if (!isJ(g[r][x])) continue;
      const dx = x - cx, ad = Math.abs(dx); let ch;
      if (c.front) ch = frontPix(S, co, inner, ry, dx, ad, n, x === x0 || x === x1);
      else if (c.back) ch = backPix(S, co, inner, ry, dx, ad, n, x === x0 || x === x1);
      else ch = sidePix(S, co, inner, ry, x, x0, x1, n);
      g[r][x] = ch;
    }
  }
  // 목 감싸는 것(터틀넥·스카프·높은 깃): 목 피부(턱 아래)를 덮는다
  const neck = S.neck;
  if (neck) for (let r = sp; r <= sp + 3; r++) for (let x = 0; x < W; x++) if (isSkin(g[r][x]) && Math.abs(x - cx) <= (c.side ? 4 : 3) && !(c.back)) g[r][x] = neck === 'scarf' ? (r === sp ? 'A' : 'L') : (r === sp ? 'i' : 'f');
  if (neck && c.back) for (let r = sp - 1; r <= sp + 1; r++) for (let x = 0; x < W; x++) if (isSkin(g[r][x]) && Math.abs(x - cx) <= 3 && r >= sp) g[r][x] = neck === 'scarf' ? 'A' : 'f';
  // 넥타이/리본: 정면은 가운데, 옆은 앞가슴
  if (S.tie && !c.back) {
    const tx = c.front ? Math.round(cx) : c.tx1 - 2, len = Math.min(n - 4, S.tieLen || 8);
    for (let ry = 1; ry <= len; ry++) { const ch = ry === 1 ? 'L' : 'A'; put(g, tx, sp + ry + (c.front ? 1 : 1), ch); if (c.front && ry >= len - 1 && ry <= len) put(g, tx + 1, sp + ry + 1, 'L'); }
    if (c.front) put(g, tx - 1, sp + 2, 'L');
  }
}
function frontPix(S, co, inner, ry, dx, ad, n, edge) {
  const belt = S.belt && ry === n - 2, buckle = belt && ad <= 1;
  if (belt) return buckle ? 'S' : 'P';
  if (!co) return innerPix(S, inner, ry, dx, ad, n, edge);
  const ow = co.open === false ? -1 : ry < 3 ? 2 : ry < 9 ? 3 : 2;      // 코트 앞트임 반폭
  if (ad < ow || (ad === ow && ry < 2)) return innerPix(S, inner, ry, dx, ad, n, edge, true);
  if (ad === ow) return co.lapel === false ? 'd' : 'b';
  if (ry <= 1 && co.collar) return co.collar === 'hood' ? 'b' : (ad >= 5 ? 'd' : 'b');
  if (co.zip && ad === 0) return 'S';
  if (S.straps && S.straps === 'x' && Math.abs(Math.abs(dx) - (ry - 2)) <= 0 && ry >= 3 && ry < n - 2) return S.strapCol || 'A';
  if (S.pockets && ry === n - 5 && ad >= 3 && ad <= 5) return 'd';
  if (edge || ad >= 7) return 'd';
  return ((ry + ad) % 5 === 0 && co.tex) ? 'b' : 'a';
}
function innerPix(S, inner, ry, dx, ad, n, edge, underCoat) {
  if (inner === 'vest') { if (ry < 3) return ad <= 1 ? 'i' : 'f'; return (ad === 0 && ry % 3 === 0) ? 'k' : (ad >= 2 ? 'n' : 'j'); }
  if (inner === 'turtle') return ad >= 5 ? 'g' : (ad === 1 && ry % 2 === 0) ? 'i' : 'f';
  if (inner === 'tank') return ad >= 5 ? 'g' : ry < 2 ? 'g' : 'f';
  if (inner === 'zipvest') return ad === 0 ? (ry % 2 ? 'S' : 'T') : ad >= 5 ? 'g' : 'f';
  return ad >= 5 ? 'g' : ry < 3 ? 'i' : (ad === 0 && ry % 3 === 1 ? 'g' : 'f');
}
function backPix(S, co, inner, ry, dx, ad, n, edge) {
  if (S.belt && ry === n - 2) return 'P';
  if (!co) return ad >= 5 ? 'g' : ry % 4 === 3 ? 'g' : 'f';
  if (ry <= 1 && co.collar) return ad >= 5 ? 'd' : 'b';
  if (ad === 0 && ry >= 4 && ry < n - 2) return 'd';
  if (S.backMark && ry >= 4 && ry < 8 && ad <= 2) return S.backMark;
  if (edge || ad >= 7) return 'd';
  return ((ry + ad) % 5 === 0 && co.tex) ? 'b' : 'a';
}
function sidePix(S, co, inner, ry, x, x0, x1, n) {
  if (S.belt && ry === n - 2) return 'P';
  const front = x1 - x;                                    // 오른쪽을 보는 프레임: 앞 = 큰 x
  if (!co) return front <= 1 ? 'f' : ry % 4 === 3 ? 'g' : 'f';
  if (co.open !== false && ry >= 2 && front <= 1) return innerPix(S, inner, ry, 0, front === 0 ? 0 : 1, n, false, true);
  if (co.open !== false && ry >= 2 && front === 2) return co.lapel === false ? 'd' : 'b';
  if (ry <= 1 && co.collar) return 'b';
  if (x === x0) return 'd';
  return 'a';
}

// ───────── 소매 · 팔 ─────────
function sleeves(g, c, S) {
  const { sp, leg, cx } = c, sl = S.sleeve || 'long', col = S.sleeveLetter || (S.coat ? 'a' : 'f'), cuff = S.cuff;
  // 소매 천(B,C,U,V): 몸통 높이의 어두운 팔 부분
  for (let r = sp; r < leg - 1; r++) for (let x = 0; x < W; x++) {
    const ch = g[r][x]; if (!isS(ch)) continue;
    if (sl === 'none') g[r][x] = (c.side && Math.abs(x - c.tx0) < 3) ? ch : 's';
    else g[r][x] = (S.sleeveCol && col) ? col : (ch === 'C' || ch === 'B') && S.coat ? 'a' : S.coat ? 'a' : 'f';
  }
  // 팔뚝 피부 → 긴 소매 연장, 마지막 3~4줄은 손
  const seen = new Set();
  for (let r = sp + 8; r <= c.bottom; r++) for (let x = 0; x < W; x++) {
    if (!isSkin(g[r][x]) || seen.has(r * W + x) || r >= leg + 3) continue;
    if (c.front && Math.abs(x - cx) <= 4) continue; if (c.back && Math.abs(x - cx) <= 4) continue;
    const comp = []; const st = [[x, r]]; seen.add(r * W + x);
    while (st.length) { const [px, py] = st.pop(); comp.push([px, py]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = px + dx, ny = py + dy; if (nx >= 0 && nx < W && ny >= sp + 8 && ny < leg + 3 && isSkin(g[ny][nx]) && !seen.has(ny * W + nx)) { seen.add(ny * W + nx); st.push([nx, ny]); } } }
    const maxR = Math.max(...comp.map((p) => p[1])), minR = Math.min(...comp.map((p) => p[1])), handTop = maxR - (S.handRows || 3);
    for (const [px, py] of comp) {
      if (py < handTop && (sl === 'long' || S.guard)) g[py][px] = S.guard ? 'X' : (py === handTop - 1 && cuff) ? cuff : col;
      else if (py >= handTop && S.glove) g[py][px] = S.glove === 'full' || py >= handTop + 1 ? (g[py][px] === 'l' || g[py][px] === 's' ? 'Y' : 'X') : g[py][px];
    }
  }
}

// ───────── 다리 · 신발 · 코트 자락 ─────────
function legs(g, c, S) {
  const { leg, bottom, shoeTop } = c, P = S.pants || {}, style = P.style || 'slim';
  const rows = []; for (let r = leg + 1; r <= bottom; r++) rows.push(r);
  // 바지 폭: 넓은 바지/플레어는 가로로 넓힌다
  if (P.wide && !c.side) for (const r of rows) { if (r >= shoeTop - 1) continue; const f = Math.min(P.wide, 1 + Math.floor((r - leg) / 4)); const row = g[r].slice(); for (let x = 0; x < W; x++) if (g[r][x] !== '.' && !isSkin(g[r][x])) { for (let k = 1; k <= f; k++) { if (g[r][x - k] === '.' && !row[x - k] !== '.') row[x - k] = row[x - k] === '.' ? g[r][x] : row[x - k]; if (g[r][x + k] === '.') row[x + k] = row[x + k] === '.' ? g[r][x] : row[x + k]; } } g[r] = row; }
  // 칠하기: 줄마다 다리 조각(연속 구간)
  const hem = style === 'shorts' ? leg + (P.hem || 4) : style === 'skirt' ? leg + (P.hem || 4) : null;
  const lowSkin = P.stocking ? 'Z' : 's';
  for (const r of rows) {
    const row = g[r]; let x = 0;
    while (x < W) {
      if (row[x] === '.') { x++; continue; } let e = x; while (e + 1 < W && row[e + 1] !== '.') e++;
      const ry = r - leg;
      for (let i = x; i <= e; i++) {
        const ch = row[i], skin = isSkin(ch); if (skin && r >= shoeTop) continue;     // 샌들 발가락은 신발 단계에서
        let nc;
        if (r >= shoeTop) continue;
        if (hem && r > hem) { nc = (r < shoeTop - (S.boot?.tall || 0)) ? (P.stocking ? (i === x || i === e ? 'N' : 'Z') : (i === x || i === e ? 'h' : (i === x + 1 ? 'h' : 's'))) : null; if (nc) { row[i] = nc; continue; } }
        if (style === 'robe') { row[i] = (i === x || i === e) ? 'n' : (r === shoeTop - 1 ? 'k' : (i === Math.round((x + e) / 2) && P.seam) ? 'k' : 'j'); continue; }
        const wrap = 'ED'.includes(ch) && S.boot?.tall; if (wrap) continue;
        if (i === x || i === e) nc = 'N'; else if (i === x + 1 && e - x > 3) nc = 'm'; else if ((i - x) === Math.round((e - x) / 3)) nc = 'p'; else nc = 'm';
        if (P.stripe && (i - x) % 3 === 1 && nc === 'm') nc = 'p';
        if (P.pocket && ry >= 2 && ry <= 5 && ((c.front || c.back) && (i === x + 1 || i === e - 1) )) nc = 'N';
        row[i] = (hem && r <= hem && style === 'skirt') ? (S.skirtLetter || 'a') : nc;
      }
      x = e + 1;
    }
  }
}
const MAT = { a: ['a', 'b', 'd'], j: ['j', 'k', 'n'], m: ['m', 'p', 'N'], f: ['f', 'i', 'g'] };
function coatSkirt(g, c, S) {
  const co = S.coat && S.coat.len ? S.coat : S.pants?.style === 'skirt' ? { len: S.pants.hem || 4, open: false, flare: 1, flareRate: 0.35, sway: 1, mat: S.skirtMat || 'j', trim: true } : null; if (!co) return;
  const [M, Lt, Dk] = MAT[co.mat || 'a'], { leg, shoeTop } = c, hemRow = Math.min(leg + co.len, shoeTop - 1), fl0 = co.flare ?? 1;
  // 자락은 몸통 폭 기준(다리를 벌려도 천막처럼 퍼지지 않게), 걸음에 따라 다리 쪽으로 조금 쏠린다
  let sx = 0, sn = 0; for (let r = leg + 3; r < shoeTop; r++) for (let x = 0; x < W; x++) if (g[r][x] !== '.') { sx += x; sn++; }
  const shift = sn ? Math.round(((sx / sn) - (c.tx0 + c.tx1) / 2) * 0.4) : 0, a0 = c.tx0, b0 = c.tx1;
  for (let r = leg + 1; r <= hemRow; r++) {
    const t = r - leg, f = c.side ? 1 : fl0 + Math.floor(t * (co.flareRate ?? 0.3)), back = c.side ? Math.min(3, (co.sway ?? 1) + Math.floor(t / 4)) : 0;
    const xa = a0 - f - back + (c.side ? Math.min(0, shift) : 0), xb = b0 + (c.side ? 0 : f) + (c.side ? Math.max(0, shift) : 0);
    for (let x = xa; x <= xb; x++) {
      let ch = r === hemRow ? (co.trim ? Lt : Dk) : M;
      if (x === xa || x === xb) ch = Dk;
      if (co.open !== false && c.front && Math.abs(x - c.cx) < 1 && r < hemRow) ch = co.lining ? 'e' : Dk;
      if (co.open !== false && c.front && Math.abs(x - c.cx) === 1 && r < hemRow && t > 1) ch = Lt;
      if (c.side && co.open !== false && x >= xb - 1 && r < hemRow) ch = co.lining ? 'e' : Lt;
      put(g, x, r, ch);
    }
  }
}
function feet(g, c, S) {
  const { bottom, shoeTop, leg } = c, B = S.boot || {}, tall = B.tall || 0;
  for (let r = shoeTop; r <= bottom; r++) for (let x = 0; x < W; x++) {
    const ch = g[r][x]; if (ch === '.') continue;
    const sole = r === bottom;
    g[r][x] = sole ? (B.sole || 'z') : (isSkin(ch) || ch === 'W') ? (B.toe || 't') : B.light && r === shoeTop ? 't' : 'q';
  }
  // 발목(다리감개 자리)
  for (const r of c.wraps) for (let x = 0; x < W; x++) if ('ED'.includes(g[r][x])) g[r][x] = tall ? 'q' : (B.sock || 'm');
  // 긴 부츠: 신발 위 정강이를 신발색으로 + 윗단 끈
  if (tall) for (let r = Math.max(leg + 1, shoeTop - tall); r < shoeTop; r++) for (let x = 0; x < W; x++) if (g[r][x] !== '.' && !isSkin(g[r][x]) && !(S.pants?.style === 'shorts' && r <= leg + (S.pants.hem || 4))) g[r][x] = (r === Math.max(leg + 1, shoeTop - tall) && B.band) ? (B.band) : (x % 3 === 0 && B.lace ? 't' : g[r][x] === 'N' ? 'z' : 'q');
  if (B.ankleStrap) for (let x = 0; x < W; x++) if (g[shoeTop - 1][x] !== '.') g[shoeTop - 1][x] = 'A';
}

function details(g, c, S) {
  const { sp, leg, n, cx } = c, cloth = (ch) => CLOTH.has(ch) || isJ(ch);
  const dot = (x, y, ch) => { const o = at(g, x, y); if (cloth(o) && !isSkin(o)) put(g, x, y, ch); };
  if (S.straps && !c.side) for (let ry = 1; ry < n - 2; ry++) { const x = Math.round(cx - 4 + (ry - 1) * (7 / (n - 4))); dot(x, sp + ry, S.straps); if (S.straps2) dot(Math.round(cx + 4 - (ry - 1) * (7 / (n - 4))), sp + ry, S.straps2); }
  if (S.straps && c.side) for (let ry = 2; ry < n - 2; ry++) dot(Math.round(c.tx1 - 5 + ry * 0.45), sp + ry, S.straps);
  if (S.buttons && c.front) for (let ry = 4; ry < n - 2; ry += 3) { dot(Math.round(cx) - 3, sp + ry, 'J'); dot(Math.round(cx) + 3, sp + ry, 'J'); }
  if (S.zip && !c.back) for (let ry = 2; ry < n - 2; ry++) if (ry % 2 === 0) dot(c.front ? Math.round(cx) : c.tx1 - 1, sp + ry, 'S');
  if (S.pauldron) for (let ry = 0; ry <= 3; ry++) for (let x = 0; x < W; x++) { if (!isJ(g[sp + ry]?.[x] || '.') && !CLOTH.has(g[sp + ry]?.[x] || '.')) continue; const ad = Math.abs(x - cx); if ((c.front || c.back) && ad >= 6 - (ry === 0 ? 1 : 0) && ad <= 8) put(g, x, sp + ry, ry === 0 || ad === 8 ? 'b' : S.pauldron === true ? 'b' : S.pauldron); }
  if (S.chain && c.front) for (let ry = n - 2; ry < n + 4; ry++) { const x = Math.round(cx) + 5 + (ry > n - 1 ? 1 : 0); if ((ry + sp) % 2 === 0) put(g, x, sp + ry, 'S'); }
  if (S.blood) for (const [dx, dy] of S.blood) dot(Math.round(cx) + dx * (c.back ? -1 : 1), sp + dy, 'A');
  if (S.hip && !c.back) { const hx = c.front ? Math.round(cx) - 5 : c.tx1 - 3; for (let ry = n - 3; ry <= n + 1; ry++) dot(hx, sp + ry, ry === n - 3 ? 'S' : 'T'); dot(hx + 1, sp + n - 1, 'T'); }
  if (S.thigh && !c.side) for (const sgn of [-1, 1]) { const y = leg + (S.thigh.row || 4); for (let x = 0; x < W; x++) if (g[y][x] !== '.' && Math.sign(x - cx) === sgn) put(g, x, y, S.thigh.letter || 'P'); }
}

function outlinePass(g) {
  const H = g.length, out = g.map((r) => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = g[y][x]; if (!CLOTH.has(ch)) continue;
    if (!OUT[ch] || OUT[ch] === ch) continue;
    const e = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(g, x + dx, y + dy) === '.');
    if (e) out[y][x] = OUT[ch];
  }
  return out;
}

export function buildOutfit(dir, frame, S) {
  const fd = BODY_FRAMES[dir][frame], g = fd.rows.map((r) => r.split('')), c = ctxOf(g, fd, dir);
  legs(g, c, S); coatSkirt(g, c, S); feet(g, c, S); sleeves(g, c, S); torso(g, c, S, dir); details(g, c, S);
  return outlinePass(g).map((r) => r.join(''));
}

// ───────── 팔레트 ─────────
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hexOf = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const adj = (h, d) => hexOf(rgb(h).map((v) => v + d));
/** 복장 색(coat, lining, shirt, vest, pants, boot, accent, glove, belt, metal) → 재질 글자별 색 */
export function outfitPalette(P) {
  const tri = (c, l = 28, d = -44) => [c, adj(c, l), adj(c, d)];
  const [a, b, d] = tri(P.coat || '#444444'), [f, i, g] = tri(P.shirt || '#dddddd', 18, -50), [j, k, n] = tri(P.vest || '#222222', 26, -26), [m, p, N] = tri(P.pants || '#222222', 24, -28);
  const [q, t, z] = tri(P.boot || '#161616', 30, -14), [A, J, L] = tri(P.accent || '#aa2222', 40, -60), [X, Y] = tri(P.glove || '#161616', 28);
  return { a, b, d, e: P.lining || adj(P.coat || '#444444', -20), f, i, g, j, k, n, m, p, N, q, t, z, A, J, L, X, Y, Z: P.stocking || '#2a2a30', P: P.belt || '#121212', S: P.metal || '#b8bcc4', T: adj(P.metal || '#b8bcc4', -80) };
}
