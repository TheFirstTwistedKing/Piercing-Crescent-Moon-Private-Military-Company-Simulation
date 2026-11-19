import * as Audio from './audio.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) { if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(kid)); }
  return el;
}

const P = {
  back: '<path d="M15 5l-7 7 7 7"/>', play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>', pause: '<path d="M8 5v14M16 5v14"/>',
  fast3: '<path d="M2 5v14l6-7zM8 5v14l6-7zM14 5v14l6-7z" fill="currentColor" stroke="none"/>',
  user: '<path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3M8 15h8"/>',
  fast: '<path d="M4 5v14l8-7zM12 5v14l8-7z" fill="currentColor" stroke="none"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M9 12h10"/>',
  vol: '<path d="M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/>', mute: '<path d="M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6"/>',
  cam: '<path d="M3 8h13v9H3zM16 11l5-3v9l-5-3"/>', map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>', doc: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', check: '<path d="M5 12l5 5 9-10"/>',
  device: '<path d="M3 5h14v10H3zM7 19h6M10 15v4M19 9h2v10h-4V9z"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z"/>',
};
export const icon = (name, size = 18) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${P[name] || ''}</svg>`;

/* 토스트 */
export function toast(text, kind = 'info', ms = 4200) {
  let box = $('#toasts'); if (!box) { box = h('div', { id: 'toasts', 'aria-live': 'polite' }); document.body.append(box); }
  const el = h('div', { class: `toast ${kind}` }, text);
  box.append(el); while (box.children.length > 4) box.firstChild.remove();
  Audio.sfx(kind === 'bad' || kind === 'alert' ? 'error' : kind === 'good' || kind === 'order' ? 'confirm' : 'notify');
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 360); }, ms);
}

/* 모달 */
export function modal({ title, body, actions = [], dismiss = true }) {
  const back = h('div', { class: 'modal-back' });
  const box = h('div', { class: 'modal frame', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
  const close = () => { back.classList.add('out'); setTimeout(() => back.remove(), 200); };
  box.append(h('h3', {}, title));
  if (typeof body === 'string') box.append(h('p', {}, body)); else if (body) box.append(body);
  const row = h('div', { class: 'modal-actions' });
  for (const a of actions) row.append(h('button', { class: `btn ${a.kind || 'ghost'}`, type: 'button', onclick: async () => { Audio.sfx('click'); if (a.onClick) await a.onClick(close); if (!a.keep) close(); } }, a.label));
  box.append(row); back.append(box);
  if (dismiss) back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
  document.body.append(back);
  setTimeout(() => $('.btn', box)?.focus(), 30);
  return { close };
}

export const pad = (n, w = 3) => String(n).padStart(w, '0');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
