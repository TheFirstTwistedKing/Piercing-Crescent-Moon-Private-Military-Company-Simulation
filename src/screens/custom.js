// 캐릭터 커스터마이징: 외형(머리 스타일·색) / 무기 / 스탯 포인트 / 특성 뽑기 / 능력
import * as Audio from '../core/audio.js';
import { engine } from '../game/engine.js';
import { DEPTS, DEPT } from '../game/data.js';
import { HAIR_STYLES, HAIR_COLORS } from '../game/hair.js';
import { WEAPONS, WEAPON, WORKSHOPS, WORKSHOP_WEAPONS, weaponIcon } from '../game/weapons.js';
import { fmtCredits } from '../game/sim.js';
import { TRAITS, TRAIT, ABILITIES, ABILITY, RARITY, GACHA_ODDS, MAX_TRAITS, MAX_ABILITIES, fxLines } from '../game/traits.js';
import { CSTATS, STAT_MAX, sumAlloc } from '../game/rules.js';
import { drawPreview, OX } from '../game/sprites.js';
import { ITEM, ITEMS, STAT_ITEM_CAP } from '../game/shop.js';
import { h, icon, modal } from '../core/ui.js';

const TABS = [['name', '이름'], ['look', '외형'], ['weapon', '무기'], ['stats', '스탯'], ['gear', '장비'], ['trait', '특성'], ['ability', '능력']];
const fxList = (fx) => h('ul', { class: 'fxl' }, ...fxLines(fx).map((l) => h('li', { class: l.good ? 'good' : 'bad' }, l.t)));
const preview = (u, opts, w, hh, scale = 1) => { const cv = Object.assign(document.createElement('canvas'), { width: w, height: hh }); const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.translate(-OX, 0); drawPreview(c, u, opts); cv.className = 'px'; cv.style.width = w * scale + 'px'; cv.style.height = hh * scale + 'px'; return cv; };

export function mountCustom(root, ctx, arg) {
  const sim = engine.sim;
  let id = arg && sim.byId[arg] ? arg : sim.units[0].id, tab = 'name', wtab = 'base', gtab = sim.byId[id].gender, dir = 'down', walk = false, frame = 0, reveal = null, busy = false, saveT = 0;
  const U = () => sim.byId[id];
  const scheduleSave = () => { clearTimeout(saveT); saveT = setTimeout(() => engine.save(), 1500); };

  /* ── 좌측: 인원 선택 ── */
  const list = h('aside', { class: 'cu-list', 'aria-label': '인원 선택' });
  const sel = h('select', { class: 'cu-select', 'aria-label': '인원 선택', onchange: (e) => pick(e.target.value) });
  const paintList = () => { sel.replaceChildren(...sim.units.map((u) => h('option', { value: u.id }, `${u.name} · ${u.latin}`))); sel.value = id; list.replaceChildren(...DEPTS.map((d) => h('section', {}, h('h5', {}, h('i', { class: 'dot', style: `background:${d.color}` }), d.en), ...sim.units.filter((u) => u.dept === d.key).map((u) => h('button', { type: 'button', class: `ru ${u.id === id ? 'on' : ''}`, onclick: () => pick(u.id) }, h('b', {}, u.name, h('em', { class: 'lat' }, u.latin)), h('small', {}, u.role)))))); };
  const pick = (nid) => { id = nid; gtab = U().gender; reveal = null; Audio.sfx('select'); paintAll(); };

  /* ── 중앙: 미리보기 ── */
  const cv = Object.assign(document.createElement('canvas'), { width: 32, height: 24, className: 'px stage-cv', 'aria-label': '캐릭터 미리보기' });
  const sc = cv.getContext('2d'); sc.imageSmoothingEnabled = false;
  const drawStage = () => { sc.clearRect(0, 0, 32, 24); drawPreview(sc, U(), { dir, frame: walk ? [1, 0, 2, 0][frame % 4] : 0 }); };
  const stageInfo = h('div', { class: 'stage-info' });
  const dirs = h('div', { class: 'dirs' }, ...[['down', '앞'], ['left', '왼쪽'], ['right', '오른쪽'], ['up', '뒤']].map(([d, l]) => h('button', { type: 'button', class: 'seg-b', 'data-d': d, onclick: () => { dir = d; Audio.sfx('click'); paintDirs(); drawStage(); } }, l)),
    h('button', { type: 'button', class: 'seg-b', 'data-w': '1', onclick: () => { walk = !walk; Audio.sfx('click'); paintDirs(); } }, '걷기'));
  const paintDirs = () => dirs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.w ? walk : b.dataset.d === dir));
  const paintStage = () => {
    const u = U(), d = DEPT[u.dept];
    stageInfo.replaceChildren(h('h2', {}, u.name, h('em', { class: 'lat' }, u.latin)), h('p', { class: 'sub' }, `${d.no} ${d.en} · ${u.role}`),
      h('p', { class: 'chips' }, u.isLeader ? h('span', { class: 'chip l' }, '팀장') : null, h('span', { class: 'chip' }, WEAPON[u.weapon].name), ...u.eq.map((t) => h('span', { class: `chip ${TRAIT[t].rarity}` }, TRAIT[t].name)), ...u.ab.map((a) => h('span', { class: 'chip ab' }, ABILITY[a].name))),
      h('p', { class: 'sub' }, `스탯 포인트 ${sumAlloc(u.alloc)} / ${u.pool} · 특성 뽑기 ${sim.pullsLeft(u)}회 남음`));
    drawStage();
  };
  const anim = setInterval(() => { if (walk) { frame++; drawStage(); } }, 220);

  /* ── 우측: 탭 ── */
  const tabs = h('div', { class: 'cu-tabs', role: 'tablist' }, ...TABS.map(([k, l]) => h('button', { type: 'button', role: 'tab', 'data-k': k, onclick: () => { tab = k; Audio.sfx('click'); paintPanel(); paintTabs(); } }, l)));
  const paintTabs = () => tabs.querySelectorAll('button').forEach((b) => { const on = b.dataset.k === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
  const body = h('div', { class: 'cu-body' });
  const changed = () => { scheduleSave(); paintStage(); paintPanel(); };

  const nameTab = () => {
    const u = U(), err = h('p', { class: 'err', role: 'alert' });
    const nm = h('input', { id: 'cn', value: u.name, maxlength: 12, autocomplete: 'off', spellcheck: 'false' });
    const ln = h('input', { id: 'cl', value: u.latin, maxlength: 14, autocomplete: 'off', spellcheck: 'false', autocapitalize: 'words' });
    const done = (r, msg) => { if (!r.ok) { err.textContent = r.reason; Audio.sfx('error'); return; } Audio.sfx('confirm'); ctx.toast(msg, 'good'); paintList(); changed(); };
    const form = h('form', { class: 'form', novalidate: true, onsubmit: (e) => { e.preventDefault(); err.textContent = ''; const r = sim.setName(id, nm.value, ln.value); done(r, `이름을 ${U().name} (${U().latin}) 으로 바꿨습니다.`); } },
      h('label', { class: 'f', for: 'cn' }, h('span', { class: 'f-label' }, '이름'), nm, h('span', { class: 'f-hint' }, '1~12자. 다른 캐릭터와 같은 이름은 쓸 수 없습니다.')),
      h('label', { class: 'f', for: 'cl' }, h('span', { class: 'f-label' }, '라틴어 이름 (코드네임)'), ln, h('span', { class: 'f-hint' }, '영문 2~14자.')), err,
      h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'submit' }, '이름 저장'), h('button', { class: 'btn ghost', type: 'button', onclick: () => { err.textContent = ''; done(sim.resetName(id), '기본 이름으로 되돌렸습니다.'); } }, '기본 이름으로')));
    return h('div', {}, form, h('p', { class: 'hint' }, `기본 이름: ${u.baseName} · ${u.baseLatin}`));
  };

  const lookTab = () => {
    const u = U(), cur = u.look.hairStyle;
    const seg = h('div', { class: 'seg' }, ...[['m', `남성 ${HAIR_STYLES.filter((x) => x.g === 'm').length}`], ['f', `여성 ${HAIR_STYLES.filter((x) => x.g === 'f').length}`]].map(([g, l]) => h('button', { type: 'button', class: `seg-b ${gtab === g ? 'on' : ''}`, onclick: () => { gtab = g; Audio.sfx('click'); paintPanel(); } }, l)));
    const grid = h('div', { class: 'grid hs-grid' }, ...HAIR_STYLES.filter((s) => s.g === gtab).map((s) => h('button', { type: 'button', class: `card hs ${cur === s.id ? 'on' : ''}`, 'aria-pressed': String(cur === s.id), onclick: () => { sim.setHair(id, s.id, u.look.hair); Audio.sfx('select'); changed(); } }, preview(u, { hairStyle: s.id, dir: 'down', weapon: null }, 16, 12, 6), h('small', {}, s.name))));
    const color = h('input', { type: 'color', value: u.look.hair, 'aria-label': '머리색 직접 선택', oninput: (e) => { sim.setHair(id, u.look.hairStyle, e.target.value); scheduleSave(); paintStage(); } });
    color.addEventListener('change', () => paintPanel());
    const sw = h('div', { class: 'swatches' }, ...HAIR_COLORS.map((c) => h('button', { type: 'button', class: `sw ${u.look.hair.toLowerCase() === c ? 'on' : ''}`, style: `background:${c}`, 'aria-label': `머리색 ${c}`, onclick: () => { sim.setHair(id, u.look.hairStyle, c); Audio.sfx('click'); changed(); } })), color);
    const tipNow = (u.look.hair2 || '').toLowerCase();
    const tipColor = h('input', { type: 'color', value: tipNow || '#c0261c', 'aria-label': '머리 끝색 직접 선택', oninput: (e) => { sim.setHairTip(id, e.target.value); scheduleSave(); paintStage(); } });
    tipColor.addEventListener('change', () => paintPanel());
    const tipSw = h('div', { class: 'swatches' }, h('button', { type: 'button', class: `sw none ${tipNow ? '' : 'on'}`, 'aria-label': '끝색 없음(단색)', title: '끝색 없음', onclick: () => { sim.setHairTip(id, null); Audio.sfx('click'); changed(); } }, '×'),
      ...HAIR_COLORS.map((c) => h('button', { type: 'button', class: `sw ${tipNow === c ? 'on' : ''}`, style: `background:${c}`, 'aria-label': `머리 끝색 ${c}`, onclick: () => { sim.setHairTip(id, c); Audio.sfx('click'); changed(); } })), tipColor);
    return h('div', {}, h('p', { class: 'f-label' }, '머리 스타일'), seg, grid, h('p', { class: 'f-label', style: 'margin-top:20px' }, '머리색 (뿌리)'), sw, h('p', { class: 'f-label', style: 'margin-top:20px' }, '머리 끝색 (그라데이션)'), tipSw);
  };

  const wIcon = (wid) => { const c = weaponIcon(wid), n = Object.assign(document.createElement('canvas'), { width: 16, height: 20, className: 'px' }); n.getContext('2d').drawImage(c, 0, 0); n.style.width = '48px'; n.style.height = '60px'; return n; };
  const confirmEquip = (w) => {
    const u = U(); if (u.weapon === w.id) return; const left = sim.funds - w.fee, prev = WEAPON[u.weapon];
    modal({ title: `${w.name} 착용`, body: h('div', { class: 'wk-confirm' },
      h('p', {}, `착용자: ${u.name}`), h('p', {}, `무기: ${w.name} (${WORKSHOPS.find((x) => x.id === w.workshop).short} 공방)`),
      h('p', { class: 'wk-cost' }, `착용비 ${fmtCredits(w.fee)} — 지금 한 번 지불`), h('p', { class: 'wk-cost' }, `일일 유지비 ${fmtCredits(w.upkeep)} — 착용하는 동안 매일 운영비에 더해짐`),
      prev?.upkeep ? h('p', { class: 'wk-cost' }, `기존 ${prev.name}의 유지비 ${fmtCredits(prev.upkeep)}는 사라집니다.`) : null,
      h('p', { class: `wk-cost ${left < 0 ? 'bad' : ''}` }, left < 0 ? `자금이 부족합니다. (보유 ${fmtCredits(sim.funds)})` : `착용 후 자금 ${fmtCredits(left)}`)),
      actions: [{ label: '취소' }, { label: '착용', kind: 'primary', keep: true, onClick: (close) => { const r = sim.equipWorkshop(id, w.id); if (!r.ok) { Audio.sfx('error'); ctx.toast(r.reason, 'bad'); return; } Audio.sfx('select'); close(); changed(); } }] });
  };
  const weaponTab = () => {
    const u = U();
    const seg = h('div', { class: 'seg wk-seg', role: 'tablist', 'aria-label': '무기 분류' }, ...[['base', '기본 무기'], ...WORKSHOPS.map((x) => [x.id, x.short + ' 공방'])].map(([k, l]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(wtab === k), class: `seg-b ${wtab === k ? 'on' : ''}`, onclick: () => { wtab = k; Audio.sfx('click'); paintPanel(); } }, l)));
    if (wtab === 'base') return h('div', {}, seg, h('div', { class: 'grid wp-grid' }, ...WEAPONS.map((w) => h('button', { type: 'button', class: `card wp ${u.weapon === w.id ? 'on' : ''}`, 'aria-pressed': String(u.weapon === w.id), onclick: () => { sim.setWeapon(id, w.id); Audio.sfx('select'); changed(); } },
      wIcon(w.id), h('b', {}, w.name), h('small', {}, w.desc), fxList(w.fx), w.gun ? h('small', { class: 'gun-line' }, `습격 전투: 사거리 ${w.gun.range} · 공격 간격 ${w.gun.cd}초${w.gun.splash ? ` · 범위 피해 ${w.gun.splash}` : ''}`) : null))));
    const wk = WORKSHOPS.find((x) => x.id === wtab), list = WORKSHOP_WEAPONS.filter((w) => w.workshop === wtab);
    return h('div', {}, seg,
      h('div', { class: 'wk-head', style: `--wk:${wk.color}` }, h('b', {}, wk.name), h('small', {}, wk.desc), h('p', { class: 'wk-fund' }, `보유 자금 ${fmtCredits(sim.funds)} · 착용할 때 착용비를 내고, 착용하는 동안 매일 유지비가 듭니다.`)),
      h('div', { class: 'grid wp-grid' }, ...list.map((w) => { const on = u.weapon === w.id, poor = sim.funds < w.fee;
        return h('button', { type: 'button', class: `card wp wk ${on ? 'on' : ''} ${poor && !on ? 'poor' : ''}`, style: `--wk:${wk.color}`, 'aria-pressed': String(on), onclick: () => { if (on) return; Audio.sfx('click'); confirmEquip(w); } },
          wIcon(w.id), h('b', {}, w.name), h('small', {}, `${WEAPON[w.base].name} · ${wk.short}`), fxList(w.fx),
          h('p', { class: 'wk-price' }, h('span', {}, `착용비 ${fmtCredits(w.fee)}`), h('span', {}, `유지비 ${fmtCredits(w.upkeep)}/일`)), on ? h('i', { class: 'wk-on' }, '착용 중') : null); })));
  };

  const statsTab = () => {
    const u = U(), used = sumAlloc(u.alloc), left = u.pool - used;
    const rows = CSTATS.map(({ k, ko, desc }) => {
      const v = u.alloc[k], fin = u.cs[k], bonus = fin - v;
      return h('div', { class: 'srow' }, h('div', { class: 'sname' }, h('b', {}, ko), h('small', {}, desc)),
        h('div', { class: 'seg10', role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': STAT_MAX, 'aria-valuenow': v, 'aria-label': ko }, ...Array.from({ length: STAT_MAX }, (_, i) => h('i', { class: i < v ? 'on' : '' }))),
        h('div', { class: 'sctl' }, h('button', { class: 'icon-btn', type: 'button', 'aria-label': `${ko} 감소`, disabled: v <= 0, html: icon('minus', 16), onclick: () => { sim.setStat(id, k, v - 1); Audio.sfx('click'); changed(); } }),
          h('output', {}, String(v)), h('button', { class: 'icon-btn', type: 'button', 'aria-label': `${ko} 증가`, disabled: v >= STAT_MAX || left <= 0, html: icon('plus', 16), onclick: () => { sim.setStat(id, k, v + 1); Audio.sfx('click'); changed(); } })),
        h('small', { class: `sfin ${bonus > 0 ? 'good' : bonus < 0 ? 'bad' : ''}` }, bonus ? `최종 ${fin} (${bonus > 0 ? '+' : ''}${bonus})` : `최종 ${fin}`));
    });
    const dv = u.dv, base = u.stats;
    return h('div', {}, h('div', { class: 'pool' }, h('b', {}, String(left)), h('span', {}, `남은 포인트 / 전체 ${u.pool}`)),
      h('div', { class: 'srows' }, ...rows),
      h('div', { class: 'row', style: 'margin:16px 0' }, h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { sim.autoStats(id); Audio.sfx('confirm'); changed(); } }, '추천 배분'), h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { sim.resetStats(id); Audio.sfx('click'); changed(); } }, '초기화')),
      h('p', { class: 'f-label' }, '임무 능력치 (기본 + 보정)'), h('p', { class: 'derived' }, ...[['cmb', '전투'], ['def', '방어'], ['mob', '기동'], ['med', '의료'], ['int', '정보']].map(([k, l]) => h('span', {}, l, h('b', {}, String(Math.round(dv[k]))), h('small', {}, `(${Math.round(dv[k] - base[k]) >= 0 ? '+' : ''}${Math.round(dv[k] - base[k])})`)))));
  };

  const gearTab = () => {
    const u = U(), have = (cat) => ITEMS.filter((i) => i.cat === cat && sim.owned(i.id) > 0);
    const act = (fn, msg) => () => { const r = fn(); if (!r.ok) { Audio.sfx('error'); ctx.toast(r.reason, 'bad'); return; } Audio.sfx('confirm'); if (msg) ctx.toast(msg, 'good'); changed(); };
    const slot = (key, label) => { const id = u.gear[key]; return h('li', { class: `own ${id ? 'on' : ''}`, style: '--rc:#7fc8ff' }, h('div', {}, h('span', { class: 'badge' }, label), h('b', {}, id ? ITEM[id].name : '비어 있음'), id ? fxList(ITEM[id].fx) : h('small', {}, '아래 보유 장비에서 장착하세요.')), id ? h('button', { class: 'btn ghost sm', type: 'button', onclick: act(() => sim.unequipGear(id && u.id, key)) }, '해제') : null); };
    const gears = have('equip'), stats = have('stat'), cons = have('consume');
    return h('div', {}, h('p', { class: 'f-label' }, '장착 중'), h('ul', { class: 'owns' }, slot('armor', '방어구'), slot('acc', '장신구')),
      h('p', { class: 'f-label', style: 'margin-top:20px' }, '보유 장비'), gears.length ? h('ul', { class: 'owns' }, ...gears.map((it) => h('li', { class: 'own', style: '--rc:#7fc8ff' }, h('div', {}, h('span', { class: 'badge' }, it.slot === 'armor' ? '방어구' : '장신구'), h('b', {}, `${it.name} ×${sim.owned(it.id)}`), fxList(it.fx)), h('button', { class: 'btn primary sm', type: 'button', onclick: act(() => sim.equipGear(u.id, it.id)) }, '장착')))) : h('p', { class: 'hint' }, '보유한 장비가 없습니다. 상점에서 구매하세요.'),
      h('p', { class: 'f-label', style: 'margin-top:20px' }, `능력치 증표 (스탯당 최대 +${STAT_ITEM_CAP})`), h('ul', { class: 'owns' }, ...CSTATS.map(({ k, ko }) => { const it = ITEM['st_' + k], n = sim.owned(it.id); return h('li', { class: 'own' }, h('div', {}, h('b', {}, ko), h('small', {}, `현재 보너스 +${u.bonus[k]} / ${STAT_ITEM_CAP} · 보유 ${n}개`)), h('button', { class: 'btn ghost sm', type: 'button', disabled: n < 1 || u.bonus[k] >= STAT_ITEM_CAP, onclick: act(() => sim.useStatItem(u.id, it.id), `${ko} +1`) }, '사용')); })),
      h('p', { class: 'f-label', style: 'margin-top:20px' }, '소모품'), cons.length ? h('ul', { class: 'owns' }, ...cons.map((it) => h('li', { class: 'own' }, h('div', {}, h('b', {}, `${it.name} ×${sim.owned(it.id)}`), h('small', {}, it.desc)), h('button', { class: 'btn ghost sm', type: 'button', onclick: act(() => sim.useConsumable(u.id, it.id), `${it.name} 사용`) }, '사용')))) : h('p', { class: 'hint' }, '보유한 소모품이 없습니다.'));
  };

  const traitTab = () => {
    const u = U(), left = sim.pullsLeft(u), total = 10 + sim.research.pulls;
    const odds = h('p', { class: 'odds' }, ...['c', 'r', 'l'].map((r) => h('span', { style: `color:${RARITY[r].color}` }, `${RARITY[r].ko} ${Math.round(GACHA_ODDS[r] * 100)}%`)));
    const btn = h('button', { class: 'btn primary', type: 'button', disabled: left <= 0 || busy, onclick: async () => {
      busy = true; btn.disabled = true; btn.textContent = '뽑는 중…'; Audio.sfx('send'); await new Promise((r) => setTimeout(r, 650));
      const res = sim.pullTrait(id); busy = false;
      if (!res.ok) { Audio.sfx('error'); ctx.toast(res.reason, 'bad'); paintPanel(); return; }
      reveal = res.trait; Audio.sfx(res.trait.rarity === 'l' ? 'report' : res.trait.rarity === 'r' ? 'confirm' : 'select'); changed();
    } }, left > 0 ? '특성 뽑기' : '기회 소진');
    const rv = reveal ? h('div', { class: `reveal ${reveal.rarity}`, style: `--rc:${RARITY[reveal.rarity].color}`, role: 'status' }, h('small', {}, `${RARITY[reveal.rarity].ko} 등급`), h('b', {}, reveal.name), h('p', {}, reveal.desc), fxList(reveal.fx)) : h('div', { class: 'reveal none' }, h('p', {}, '뽑기를 눌러 특성을 얻으세요. 전설이라고 항상 좋은 것은 아닙니다.'));
    const owned = u.traits.map((tid) => { const t = TRAIT[tid], on = u.eq.includes(tid); return h('li', { class: `own ${t.rarity} ${on ? 'on' : ''}`, style: `--rc:${RARITY[t.rarity].color}` }, h('div', {}, h('span', { class: 'badge' }, RARITY[t.rarity].ko), h('b', {}, t.name), t.bad ? h('span', { class: 'badge bad' }, '불리') : null, h('small', {}, t.desc), fxList(t.fx)),
      h('button', { class: `btn ${on ? 'primary' : 'ghost'} sm`, type: 'button', 'aria-pressed': String(on), onclick: () => { const r = sim.toggleTrait(id, tid); if (!r.ok) { Audio.sfx('error'); ctx.toast(r.reason, 'bad'); return; } Audio.sfx('click'); changed(); } }, on ? '해제' : '장착')); });
    return h('div', {}, h('div', { class: 'gacha' }, h('div', {}, h('p', { class: 'f-label' }, '남은 기회'), h('p', { class: 'big' }, h('b', {}, String(left)), ` / ${total}`), odds), btn), rv,
      h('p', { class: 'f-label', style: 'margin-top:20px' }, `보유 특성 ${u.traits.length}개 · 장착 ${u.eq.length}/${MAX_TRAITS}`), owned.length ? h('ul', { class: 'owns' }, ...owned) : h('p', { class: 'hint' }, '아직 보유한 특성이 없습니다.'));
  };

  const abilityTab = () => {
    const u = U(), have = sim.research.abilities;
    return h('div', {}, h('p', { class: 'hint', style: 'margin-bottom:12px' }, `능력은 연구로 해금하며, 캐릭터당 최대 ${MAX_ABILITIES}개까지 장착합니다. (장착 ${u.ab.length}/${MAX_ABILITIES})`),
      h('ul', { class: 'owns' }, ...ABILITIES.map((a) => { const ok = have.includes(a.id), on = u.ab.includes(a.id);
        return h('li', { class: `own ab ${on ? 'on' : ''}`, style: '--rc:#ffb23e' }, h('div', {}, h('b', {}, a.name), h('small', {}, a.desc), fxList(a.fx)),
          ok ? h('button', { class: `btn ${on ? 'primary' : 'ghost'} sm`, type: 'button', 'aria-pressed': String(on), onclick: () => { const r = sim.toggleAbility(id, a.id); if (!r.ok) { Audio.sfx('error'); ctx.toast(r.reason, 'bad'); return; } Audio.sfx('click'); changed(); } }, on ? '해제' : '장착')
            : h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { Audio.sfx('select'); ctx.go('#/panel/research'); } }, '연구 필요 (10pt)')); })));
  };

  const paintPanel = () => { body.replaceChildren(({ name: nameTab, look: lookTab, weapon: weaponTab, stats: statsTab, gear: gearTab, trait: traitTab, ability: abilityTab })[tab]()); };
  const paintAll = () => { paintList(); paintStage(); paintTabs(); paintDirs(); paintPanel(); };

  root.append(h('div', { class: 'cust screen' },
    h('header', { class: 'bar' }, h('button', { class: 'back', type: 'button', onclick: () => { Audio.sfx('select'); ctx.go('#/panel'); }, html: `${icon('back', 18)}<span>메인 패널</span>` }), h('div', { class: 'bar-title' }, h('b', {}, '캐릭터 커스터마이징'), h('small', {}, 'CUSTOMIZE')), h('span', { class: 'grow' }),
      h('button', { class: 'btn ghost sm', type: 'button', onclick: () => ctx.go('#/panel/research') }, `연구 포인트 ${sim.research.points}`)),
    h('div', { class: 'cust-body' }, list, h('section', { class: 'cu-stage' }, sel, h('div', { class: 'stage-box' }, cv), dirs, stageInfo), h('section', { class: 'cu-panel' }, tabs, body))));
  paintAll();
  return () => { clearInterval(anim); clearTimeout(saveT); engine.save(); };
}
