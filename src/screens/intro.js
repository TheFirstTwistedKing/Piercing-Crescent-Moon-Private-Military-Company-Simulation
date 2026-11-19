// 인트로: 검은 화면에서 오른쪽 → 왼쪽으로 스캔 바가 지나가며 로고가 드러나고, 텍스트가 해독(암호문 → 글자)된다.
// 전력 활성화 효과음은 스캔과 동기화(좌우 패닝 우→좌). 재생 버튼/다시보기는 의도적으로 없다 — 앱을 나갔다 들어오면 다시 재생된다.
import * as Audio from '../core/audio.js';
import { h, sleep, clamp } from '../core/ui.js';

const TITLE = '천공월아민간군사기업 관리 패널';
const SUB = 'Piercing Crescent Moon Private Military Company Management Panel';
const SWEEP_START = 0.7, SWEEP_DUR = 3.9, HOLD = 1.0, FADE = 0.7;
const GLYPH_TITLE = [...new Set(TITLE.replace(/\s/g, ''))].join('') + '01▓▒░#@%&';
const GLYPH_SUB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@%&/\\<>=+';

function buildText(el, text, glyphs, cls) {
  const chars = [];
  text.split(' ').forEach((word, wi, arr) => {
    const w = h('span', { class: 'w' });
    for (const ch of word) { const s = h('span', { class: `ch ${cls}` }, ch); w.append(s); chars.push({ el: s, real: ch, glyphs, state: 'hidden', passed: 0, cx: 0 }); }
    el.append(w); if (wi < arr.length - 1) el.append(document.createTextNode(' '));
  });
  return chars;
}

export async function playIntro(root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const logo = h('img', { class: 'intro-logo', src: 'img/logo.png', alt: '', draggable: 'false' });
  const title = h('h1', { class: 'intro-title', 'aria-label': TITLE });
  const sub = h('p', { class: 'intro-sub', 'aria-label': SUB });
  const bar = h('div', { class: 'intro-scan' });
  const stage = h('div', { class: 'intro-stage' }, h('div', { class: 'intro-copy' }, title, sub), h('div', { class: 'intro-art' }, logo));
  const el = h('div', { id: 'intro' }, stage, bar);
  root.append(el);
  const tChars = buildText(title, TITLE, GLYPH_TITLE, 't');
  const sChars = buildText(sub, SUB, GLYPH_SUB, 's');
  const chars = [...tChars, ...sChars];
  el.querySelector('.intro-copy').style.visibility = 'hidden';

  await Promise.race([Promise.all([document.fonts.load('800 40px "Noto Sans KR Variable"', TITLE), document.fonts.load('400 14px "IBM Plex Mono"', SUB), logo.decode().catch(() => {})]), sleep(2500)]);
  el.querySelector('.intro-copy').style.visibility = '';

  // 오디오 잠금: 자동재생이 막힌 환경(일반 브라우저)에서는 '전원 투입' 입력을 한 번 받는다. (exe/apk 는 보통 바로 재생)
  if (!Audio.canAutoplay()) {
    const gate = h('button', { class: 'intro-gate', type: 'button' }, h('span', {}, '전원 투입'), h('small', {}, 'TOUCH OR PRESS ANY KEY'));
    el.append(gate);
    await new Promise((res) => {
      const go = () => { removeEventListener('keydown', go); gate.removeEventListener('pointerdown', go); res(); };
      addEventListener('keydown', go, { once: true }); gate.addEventListener('pointerdown', go, { once: true });
    });
    await Audio.unlock(); gate.remove();
  }

  // 레이아웃 고정: 각 글자 폭을 잠가 해독 중 글자가 바뀌어도 줄바꿈이 흔들리지 않게 한다.
  for (const c of chars) c.el.style.width = c.el.getBoundingClientRect().width + 'px';
  const W = innerWidth;
  for (const c of chars) { const r = c.el.getBoundingClientRect(); c.cx = r.left + r.width / 2; c.el.classList.add('off'); }
  const lr = logo.getBoundingClientRect();
  const rects = [lr, title.getBoundingClientRect(), sub.getBoundingClientRect()];
  const Lb = Math.min(...rects.map((r) => r.left)) - 18, Rb = Math.max(...rects.map((r) => r.right)) + 18;
  logo.style.clipPath = 'inset(0 0 0 100%)';

  const frontX = (p) => (p < 0.1 ? W + 8 + (Rb - W - 8) * (p / 0.1) : p < 0.9 ? Rb + (Lb - Rb) * ((p - 0.1) / 0.8) : Lb + (-8 - Lb) * ((p - 0.9) / 0.1));
  const dur = reduced ? 1.4 : SWEEP_DUR, start = reduced ? 0.2 : SWEEP_START;
  Audio.powerUp(start, dur);

  await new Promise((resolve) => {
    const t0 = performance.now(); let lastGlyph = 0;
    const tick = (now) => {
      const t = (now - t0) / 1000;
      const p = clamp((t - start) / dur, 0, 1);
      const x = t < start ? W + 20 : frontX(p);
      bar.style.transform = `translate3d(${x}px,0,0)`;
      bar.style.opacity = t < start || p >= 1 ? '0' : '1';
      logo.style.clipPath = `inset(0 0 0 ${clamp((x - lr.left) / lr.width, 0, 1) * 100}%)`;
      const doGlyph = now - lastGlyph > 80; if (doGlyph) lastGlyph = now;
      for (const c of chars) {
        if (c.state === 'done') continue;
        if (x <= c.cx) {
          if (c.state !== 'dec') { c.state = 'dec'; c.passed = t; c.el.classList.remove('off', 'pre'); c.el.classList.add('dec'); Audio.blip(clamp((x / W) * 2 - 1, -1, 1)); }
          if (reduced || t - c.passed > 0.24) { c.state = 'done'; c.el.textContent = c.real; c.el.classList.remove('dec'); c.el.classList.add('done'); }
          else if (doGlyph) c.el.textContent = c.real === ' ' ? ' ' : c.glyphs[(Math.random() * c.glyphs.length) | 0];
        } else if (!reduced && x - c.cx < 90) {
          if (c.state !== 'pre') { c.state = 'pre'; c.el.classList.remove('off'); c.el.classList.add('pre'); }
          if (doGlyph) c.el.textContent = c.glyphs[(Math.random() * c.glyphs.length) | 0];
        }
      }
      if (t < start + dur + HOLD) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
  el.classList.add('fade');
  await sleep(FADE * 1000);
  el.remove();
}
