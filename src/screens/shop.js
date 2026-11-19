// 상점: 능력치 아이템 / 장비 / 소모품 / 가구 구매, 그리고 방마다 가구 배치(4칸).
import * as Audio from '../core/audio.js';
import { engine } from '../game/engine.js';
import { CATS, ITEM, ITEMS, FURNITURE, FURN_SLOTS, ROOM_KEYS } from '../game/shop.js';
import { ROOM_LABEL } from '../game/data.js';
import { fxLines } from '../game/traits.js';
import { fmtCredits } from '../game/sim.js';
import { drawFurnitureIcon } from '../game/furniture-art.js';
import { h, icon } from '../core/ui.js';

const lines = (fx) => h('ul', { class: 'fxl' }, ...fxLines(fx).map((l) => h('li', { class: l.good ? 'good' : 'bad' }, l.t)));
const furnIcon = (item, scale = 4) => { const cv = Object.assign(document.createElement('canvas'), { width: 16, height: 16, className: 'px' }); drawFurnitureIcon(cv.getContext('2d'), item, 0, 0); cv.style.width = cv.style.height = 16 * scale + 'px'; return cv; };

export function mountShop(root, ctx) {
  const sim = engine.sim;
  let tab = 'stat', sub = '전체', room = 'operation', saveT = 0;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => engine.save(), 1500); };
  const funds = h('b', { class: 'shop-funds' });
  const body = h('div', { class: 'shop-body' });
  const tabs = h('div', { class: 'cu-tabs', role: 'tablist' }, ...[...CATS, ['place', '가구 배치']].map(([k, l]) => h('button', { type: 'button', role: 'tab', 'data-k': k, onclick: () => { tab = k; Audio.sfx('click'); paint(); } }, l)));
  const repaintTop = () => { funds.textContent = fmtCredits(sim.funds); tabs.querySelectorAll('button').forEach((b) => { const on = b.dataset.k === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); }); };

  const buy = (id) => { const r = sim.buy(id); if (!r.ok) { Audio.sfx('error'); ctx.toast(r.reason, 'bad'); return; } Audio.sfx('confirm'); save(); paint(); };
  const card = (it) => {
    const owned = sim.owned(it.id), can = sim.funds >= it.price;
    const extra = it.cat === 'furniture' ? [h('small', {}, `${it.sub}${it.fav.length ? ` · 선호: ${it.fav.map((k) => ROOM_LABEL[k]).join(', ')} (효과 ×1.5)` : ''}`), lines(it.fx)] : it.cat === 'equip' ? [h('small', {}, `${it.slot === 'armor' ? '방어구' : '장신구'} — ${it.desc}`), lines(it.fx)] : [h('small', {}, it.desc)];
    return h('li', { class: 'item' }, it.cat === 'furniture' ? furnIcon(it) : null, h('div', { class: 'item-main' }, h('b', {}, it.name), ...extra, owned ? h('span', { class: 'owned' }, `보유 ${owned}`) : null),
      h('div', { class: 'item-buy' }, h('span', { class: 'price' }, fmtCredits(it.price)), h('button', { class: `btn ${can ? 'primary' : 'ghost'} sm`, type: 'button', onclick: () => buy(it.id), 'aria-label': `${it.name} 구매` }, '구매')));
  };

  const buyTab = () => {
    let list = ITEMS.filter((i) => i.cat === tab); const subs = tab === 'furniture' ? ['전체', ...new Set(FURNITURE.map((f) => f.sub))] : null;
    if (subs && sub !== '전체') list = list.filter((i) => i.sub === sub);
    return h('div', {}, subs ? h('div', { class: 'seg wrapseg' }, ...subs.map((s) => h('button', { type: 'button', class: `seg-b ${sub === s ? 'on' : ''}`, onclick: () => { sub = s; Audio.sfx('click'); paint(); } }, s))) : null,
      tab === 'stat' ? h('p', { class: 'hint', style: 'margin-bottom:12px' }, '증표는 구매 후 “커스터마이징 → 장비” 탭에서 캐릭터에게 사용합니다.') : null, h('ul', { class: 'items' }, ...list.map(card)));
  };

  const placeTab = () => {
    const slots = sim.placed[room], total = sim.roomFx(room), upkeep = slots.reduce((a, id) => a + (id ? ITEM[id].fx.upkeep || 0 : 0), 0);
    const own = FURNITURE.filter((f) => sim.owned(f.id) > 0);
    const roomSel = h('select', { class: 'cu-select show', 'aria-label': '방 선택', onchange: (e) => { room = e.target.value; Audio.sfx('click'); paint(); } }, ...ROOM_KEYS.map((k) => h('option', { value: k, selected: k === room }, `${ROOM_LABEL[k]} (${sim.placed[k].filter(Boolean).length}/${FURN_SLOTS})`)));
    const slotEls = slots.map((id, i) => {
      if (id) { const it = ITEM[id], fav = it.fav.includes(room); return h('li', { class: 'slot full' }, furnIcon(it, 5), h('div', {}, h('b', {}, it.name), h('small', {}, fav ? '이 방 선호 — 효과 ×1.5' : it.sub), lines(it.fx)), h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { sim.removeFurniture(room, i); Audio.sfx('click'); save(); paint(); } }, '회수')); }
      const pick = h('select', { 'aria-label': `${i + 1}번 자리에 놓을 가구` }, h('option', { value: '' }, own.length ? '가구 선택…' : '보유한 가구 없음'), ...own.map((f) => h('option', { value: f.id }, `${f.name} (${sim.owned(f.id)})${f.fav.includes(room) ? ' ★' : ''}`)));
      return h('li', { class: 'slot' }, h('div', { class: 'slot-empty' }, `자리 ${i + 1}`), pick, h('button', { class: 'btn primary sm', type: 'button', onclick: () => { if (!pick.value) return; const r = sim.placeFurniture(room, i, pick.value); if (!r.ok) { Audio.sfx('error'); ctx.toast(r.reason, 'bad'); return; } Audio.sfx('confirm'); save(); paint(); } }, '배치'));
    });
    return h('div', {}, roomSel, h('p', { class: 'hint', style: 'margin:8px 0 12px' }, '가구 효과는 이 방을 거처로 쓰는 인원 모두에게 적용됩니다. ★ 은 이 방에서 효과가 1.5배인 가구입니다. 유지비는 가구 1개당 한 번만 듭니다.'),
      h('ul', { class: 'slots' }, ...slotEls), h('p', { class: 'f-label', style: 'margin-top:16px' }, '이 방의 합계 효과'),
      Object.keys(total).length || upkeep ? h('div', {}, lines({ ...total, ...(upkeep ? { upkeep } : {}) })) : h('p', { class: 'hint' }, '아직 놓인 가구가 없습니다.'));
  };

  const paint = () => { repaintTop(); body.replaceChildren(tab === 'place' ? placeTab() : buyTab()); };
  root.append(h('div', { class: 'shop screen' },
    h('header', { class: 'bar' }, h('button', { class: 'back', type: 'button', onclick: () => { Audio.sfx('select'); ctx.go('#/panel'); }, html: `${icon('back', 18)}<span>메인 패널</span>` }), h('div', { class: 'bar-title' }, h('b', {}, '상점'), h('small', {}, 'SHOP')), h('span', { class: 'grow' }), h('span', { class: 'who' }, '보유 자금', funds)),
    h('main', { class: 'shop-main' }, tabs, body)));
  paint();
  return () => { clearTimeout(saveT); engine.save(); };
}
