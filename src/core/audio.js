// 전부 WebAudio 합성 — 외부 음원 파일 없음. 청감 검증은 이 환경에서 불가하므로 값은 보수적으로(작게) 잡았다.
let ctx = null, master = null, muted = false, ambient = null;
try { muted = localStorage.getItem('pcm.muted') === '1'; } catch { /* ignore */ }

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.8;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 6;
  master.connect(comp); comp.connect(ctx.destination);
  return ctx;
}

export function canAutoplay() { ensure(); return !!ctx && ctx.state === 'running'; }
export async function unlock() {
  ensure();
  if (ctx && ctx.state !== 'running') { try { await ctx.resume(); } catch { /* ignore */ } }
  return !!ctx && ctx.state === 'running';
}
export const isMuted = () => muted;
export function setMuted(m) {
  muted = !!m;
  try { localStorage.setItem('pcm.muted', muted ? '1' : '0'); } catch { /* ignore */ }
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.05);
  return muted;
}

const now = () => ctx.currentTime;
function env(g, t, a, peak, d, end = 0.0001) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(end, t + a + d);
}
function pan(p) {
  if (ctx.createStereoPanner) { const n = ctx.createStereoPanner(); n.pan.value = p; return n; }
  return ctx.createGain();
}
function noiseBuf(sec = 1) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function click(t, gain = 0.25) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf(0.05);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 1.2;
  const g = ctx.createGain(); env(g, t, 0.001, gain, 0.03);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.06);
}
function tone(type, f0, f1, t, dur, peak, panVal = 0) {
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); env(g, t, Math.min(0.02, dur / 4), peak, dur);
  const p = pan(panVal); o.connect(g); g.connect(p); p.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

/** 전력 활성화: 서브 쿵 → 릴레이 클릭 → 전압 상승 허밍/휘파람(우→좌 패닝, 스캔과 동기) → 정상 가동 종소리 */
export function powerUp(sweepStart = 0.6, sweepDur = 3.8) {
  if (!ensure() || ctx.state !== 'running') return;
  const t0 = now() + 0.05;
  tone('sine', 52, 28, t0, 1.1, 0.5);
  click(t0 + 0.04, 0.3); click(t0 + 0.34, 0.22); click(t0 + 0.52, 0.16);
  // 허밍: 톱니파 + 로우패스가 열리며 상승
  const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 55;
  const hum2 = ctx.createOscillator(); hum2.type = 'sawtooth'; hum2.frequency.value = 55.7;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 4;
  lp.frequency.setValueAtTime(70, t0 + 0.2); lp.frequency.exponentialRampToValueAtTime(1100, t0 + sweepStart + sweepDur);
  const hg = ctx.createGain();
  hg.gain.setValueAtTime(0.0001, t0 + 0.2);
  hg.gain.exponentialRampToValueAtTime(0.11, t0 + sweepStart + sweepDur * 0.7);
  hg.gain.exponentialRampToValueAtTime(0.03, t0 + sweepStart + sweepDur + 1.1);
  hum.connect(lp); hum2.connect(lp); lp.connect(hg); hg.connect(master);
  const end = t0 + sweepStart + sweepDur + 1.6;
  hum.start(t0 + 0.2); hum2.start(t0 + 0.2); hum.stop(end); hum2.stop(end);
  // 스캔 휘파람 (우→좌)
  const ss = t0 + sweepStart;
  const w = ctx.createOscillator(); w.type = 'sine';
  w.frequency.setValueAtTime(220, ss); w.frequency.exponentialRampToValueAtTime(1500, ss + sweepDur);
  const wg = ctx.createGain(); wg.gain.setValueAtTime(0.0001, ss);
  wg.gain.exponentialRampToValueAtTime(0.035, ss + 0.4); wg.gain.exponentialRampToValueAtTime(0.0001, ss + sweepDur + 0.2);
  const wp = pan(1);
  w.connect(wg); wg.connect(wp); wp.connect(master); w.start(ss); w.stop(ss + sweepDur + 0.3);
  if (wp.pan) { wp.pan.setValueAtTime(1, ss); wp.pan.linearRampToValueAtTime(-1, ss + sweepDur); }
  // 정상 가동 종소리
  const te = ss + sweepDur + 0.15;
  tone('sine', 740, 740, te, 0.7, 0.06); tone('sine', 1110, 1110, te + 0.12, 0.8, 0.045);
}

let lastBlip = 0;
export function blip(panVal = 0) {
  if (!ensure() || ctx.state !== 'running') return;
  const t = now(); if (t - lastBlip < 0.05) return; lastBlip = t;
  tone('square', 1500 + Math.random() * 1400, 900, t, 0.035, 0.018, panVal);
}

export function sfx(name) {
  if (!ensure() || ctx.state !== 'running') return;
  const t = now();
  switch (name) {
    case 'click': tone('square', 1500, 1100, t, 0.04, 0.05); break;
    case 'select': tone('triangle', 660, 990, t, 0.09, 0.08); break;
    case 'confirm': tone('triangle', 660, 660, t, 0.08, 0.08); tone('triangle', 990, 990, t + 0.08, 0.14, 0.08); break;
    case 'error': tone('sawtooth', 150, 110, t, 0.22, 0.09); break;
    case 'notify': tone('sine', 880, 880, t, 0.25, 0.07); tone('sine', 1320, 1320, t + 0.09, 0.3, 0.05); break;
    case 'send': click(t, 0.2); tone('triangle', 440, 880, t + 0.02, 0.16, 0.07); break;
    case 'type': tone('square', 900 + Math.random() * 300, 700, t, 0.02, 0.012); break;
    case 'report': tone('triangle', 523, 523, t, 0.12, 0.07); tone('triangle', 659, 659, t + 0.1, 0.12, 0.07); tone('triangle', 784, 784, t + 0.2, 0.3, 0.07); break;
    default: break;
  }
}

/** 메인 패널 배경음: 아주 낮은 전원 허밍 + 갈색 소음. 메인 화면에서만 켜진다. */
export function startAmbient() {
  if (!ensure() || ctx.state !== 'running' || ambient) return;
  const t = now();
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 2);
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 50;
  const og = ctx.createGain(); og.gain.value = 0.5; o.connect(og); og.connect(g);
  const n = ctx.createBufferSource(); n.buffer = noiseBuf(2); n.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
  const ng = ctx.createGain(); ng.gain.value = 0.25; n.connect(lp); lp.connect(ng); ng.connect(g);
  g.connect(master); o.start(); n.start();
  ambient = { g, stop() { const t2 = now(); g.gain.cancelScheduledValues(t2); g.gain.setTargetAtTime(0.0001, t2, 0.25); setTimeout(() => { try { o.stop(); n.stop(); g.disconnect(); } catch { /* ignore */ } }, 1200); } };
}
export function stopAmbient() { if (ambient) { ambient.stop(); ambient = null; } }
