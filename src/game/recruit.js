// 용병 모집: 부서별 후보를 매일 새로 뽑고, 면접으로 정확한 능력치·특성을 확인한 뒤 고용한다. (순수 로직 — DOM 없음, 난수는 seed 로 결정)
// 지금은 Rager(공격팀)만 모집한다. 다른 부서는 RECRUIT 에 항목을 추가하면 같은 방식으로 확장된다.
import { TRAITS, TRAIT } from './traits.js';
import { HAIR_STYLES, HAIR } from './hair.js';
import { WEAPONS } from './weapons.js';
import { OUTFITS, OUTFIT } from './outfits.js';
import { mulberry } from './raid.js';

export const RECRUIT = {
  rager: { cap: 6, count: 4, roles: ['돌격수', '근접 용병', '중장갑병', '도끼수', '창잡이', '파쇄병'], weapons: ['shortsword', 'longsword', 'greatsword', 'spear', 'hammer', 'greathammer', 'handaxe', 'battleaxe', 'gauntlet', 'dagger'],
    coats: [['#4d2f2a', '#331f1c'], ['#503a33', '#32241f'], ['#43342c', '#2a201b'], ['#5a3228', '#3a211b']],
    // 능력치 범위: 전투 중심(기존 Rager 팀과 같은 성향)
    stat: { cmb: [0, 1], def: [-18, -2], mob: [-14, 2], med: [-58, -42], int: [-52, -32] } },
};
export const RECRUIT_DEPTS = Object.keys(RECRUIT);
export const INTERVIEW_COST = 800, REROLL_COST = 1000, MAX_REROLLS = 3;
export const GRADES = {
  rookie: { ko: '신입', cmb: [62, 74], fee: [2500, 4000], wage: [120, 200] },
  veteran: { ko: '숙련', cmb: [74, 86], fee: [7000, 11000], wage: [260, 380] },
  elite: { ko: '정예', cmb: [86, 97], fee: [16000, 24000], wage: [520, 720] },
};
const SURNAME = ['강', '고', '권', '김', '남', '노', '도', '류', '문', '민', '박', '배', '서', '손', '신', '안', '양', '오', '우', '장', '전', '조', '진', '차', '최', '한', '허', '황'];
const GIVEN_M = ['건우', '도윤', '민재', '성훈', '시우', '재혁', '태성', '현우', '준서', '동혁', '무진', '석호', '철민', '규빈', '해성'];
const GIVEN_F = ['가온', '나연', '다인', '서현', '수아', '여진', '예린', '유빈', '지안', '채원', '하윤', '은서', '세린', '보라', '미소'];
const LATIN = ['Ferrum', 'Pugnus', 'Bellum', 'Furor', 'Hasta', 'Securis', 'Lancea', 'Tonitrus', 'Sanguis', 'Ira', 'Vulnus', 'Tempestas', 'Aries', 'Draco', 'Lupus', 'Ursus', 'Taurus', 'Bellator', 'Pugil', 'Cruor', 'Rabies', 'Fortis', 'Ardor', 'Aquilo', 'Saxum', 'Procella', 'Cassis', 'Mucro', 'Ictus', 'Fragor'];
const SKINS = ['#e3b894', '#d8a982', '#c68e69', '#cf9c76', '#e7c3ab', '#c99a76', '#dcb18c', '#b9835f', '#ecc9b0'];
const HAIRC = ['#1c1a1f', '#3a2418', '#6b4a2b', '#8a5a34', '#2a1a14', '#0e0e10', '#8a8a92', '#a5382a', '#3b3b4f'];
const HEAVY = new Set(['greatsword', 'greathammer', 'battleaxe']);
const pick = (rng, a) => a[Math.floor(rng() * a.length)];
const ri = (rng, [lo, hi]) => lo + Math.floor(rng() * (hi - lo + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** 후보 count 명을 만든다. taken: { names:Set, latins:Set } 에 있는 이름은 피한다. */
export function makeCandidates({ seed, day = 1, dept = 'rager', count, taken = { names: new Set(), latins: new Set() }, startN = 0 }) {
  const cfg = RECRUIT[dept]; if (!cfg) return []; const rng = mulberry(seed), out = [], names = new Set(taken.names), latins = new Set(taken.latins);
  const eliteP = Math.min(0.2, 0.06 + day * 0.006), vetP = 0.3 + Math.min(0.12, day * 0.004);
  for (let i = 0; i < (count || cfg.count); i++) {
    const r = rng(), grade = r < eliteP ? 'elite' : r < eliteP + vetP ? 'veteran' : 'rookie', G = GRADES[grade], gender = rng() < 0.5 ? 'm' : 'f';
    let name, g = 0; do { name = pick(rng, SURNAME) + pick(rng, gender === 'm' ? GIVEN_M : GIVEN_F); } while (names.has(name) && g++ < 60); names.add(name);
    let latin, g2 = 0; do { latin = pick(rng, LATIN); } while (latins.has(latin) && g2++ < 60); latins.add(latin);
    const cmb = ri(rng, G.cmb), st = { cmb }; for (const k of ['def', 'mob', 'med', 'int']) st[k] = clamp(cmb + ri(rng, cfg.stat[k].map((x) => x)) + ri(rng, [-4, 4]), 15, 99);
    const styles = HAIR_STYLES, look = { skin: pick(rng, SKINS), hair: pick(rng, HAIRC), hairStyle: pick(rng, styles).id, hat: pick(rng, ['none', 'none', 'helm', 'goggles', 'cap']), extra: pick(rng, ['none', 'none', 'vest', 'scarf', 'mask']), pants: pick(rng, ['#222222', '#1f1d1d', '#201f1f']) };
    [look.coat, look.coat2] = pick(rng, cfg.coats);
    { const pool = OUTFITS.filter((o) => o.g === gender); let hsh = 0; for (const ch of name + latin) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0; look.outfit = pool[hsh % pool.length].id; }   // 이름으로 정하는 복장(난수 소비 없음)
    const heavy = grade === 'elite' ? cfg.weapons.filter((w) => HEAVY.has(w)) : cfg.weapons; const weapon = pick(rng, rng() < 0.5 ? heavy : cfg.weapons);
    const q = rng(), pool = TRAITS.filter((t) => t.rarity !== 'l'), good = pool.filter((t) => !t.bad), bad = pool.filter((t) => t.bad), trait = q < 0.45 ? pick(rng, good).id : q < 0.6 && bad.length ? pick(rng, bad).id : null;
    const fee = Math.round(ri(rng, G.fee) / 100) * 100, wage = Math.round(ri(rng, G.wage) / 10) * 10;
    out.push({ id: `k${startN + i + 1}`, name, latin, gender, dept, grade, role: pick(rng, cfg.roles), stats: st, look, weapon, trait, fee: trait && TRAIT[trait].bad ? Math.round(fee * 0.8 / 100) * 100 : fee, wage, interviewed: false, ab: [] });
  }
  return out;
}

const HEX = /^#[0-9a-fA-F]{6}$/;
/** 저장된/외부 데이터를 검증해 안전한 후보·용병 정의로 정리한다. 올바르지 않으면 null. */
export function cleanDef(d, withId = true) {
  if (!d || typeof d !== 'object' || !RECRUIT[d.dept] || !GRADES[d.grade]) return null;
  if (withId && !/^[kr]\d{1,4}$/.test(String(d.id))) return null;
  const nm = String(d.name ?? '').trim(), lt = String(d.latin ?? '').trim(); if (nm.length < 1 || nm.length > 12 || /[<>\u0000-\u001f]/.test(nm) || !/^[A-Za-z][A-Za-z '\-]{1,13}$/.test(lt)) return null;
  const L = d.look || {}; if (!HEX.test(L.skin || '') || !HEX.test(L.hair || '') || !HEX.test(L.coat || '') || !HEX.test(L.coat2 || '') || !HEX.test(L.pants || '') || !HAIR[L.hairStyle]) return null;
  const hats = ['none', 'cap', 'beret', 'helm', 'hood', 'headset', 'goggles'], extras = ['none', 'scarf', 'mask', 'vest', 'glasses'];
  const weapon = WEAPONS.some((w) => w.id === d.weapon && w.id !== 'frostblade') ? d.weapon : null; if (!weapon) return null;
  const st = {}; for (const k of ['cmb', 'def', 'mob', 'med', 'int']) { const v = Number(d.stats?.[k]); if (!Number.isFinite(v)) return null; st[k] = clamp(Math.round(v), 10, 100); }
  return { id: String(d.id), name: nm, latin: lt, gender: d.gender === 'f' ? 'f' : 'm', dept: d.dept, grade: d.grade, role: String(d.role ?? '용병').slice(0, 16), stats: st,
    look: { skin: L.skin.toLowerCase(), hair: L.hair.toLowerCase(), coat: L.coat.toLowerCase(), coat2: L.coat2.toLowerCase(), pants: L.pants.toLowerCase(), hairStyle: L.hairStyle, ...(OUTFIT[L.outfit] ? { outfit: L.outfit } : {}), hat: hats.includes(L.hat) ? L.hat : 'none', extra: extras.includes(L.extra) ? L.extra : 'none' },
    weapon, trait: TRAIT[d.trait] ? d.trait : null, fee: clamp(Math.round(Number(d.fee) || 0), 0, 99999), wage: clamp(Math.round(Number(d.wage) || 0), 0, 9999), interviewed: !!d.interviewed, ab: [] };
}

/** 화면에 보여 줄 후보 정보: 면접 전에는 능력치를 10단위 범위로, 특성은 숨긴다. */
export function candidateView(c) {
  const band = (v) => { const lo = Math.floor(v / 10) * 10; return `${lo}~${lo + 9}`; };
  return { id: c.id, name: c.name, latin: c.latin, gender: c.gender, dept: c.dept, grade: c.grade, gradeKo: GRADES[c.grade].ko, role: c.role, weapon: c.weapon, fee: c.fee, wage: c.wage, interviewed: c.interviewed, look: c.look, ab: [],
    stats: Object.fromEntries(Object.entries(c.stats).map(([k, v]) => [k, c.interviewed ? { exact: v } : { band: band(v), mid: Math.floor(v / 10) * 10 + 5 }])),
    trait: c.interviewed ? (c.trait ? TRAIT[c.trait] : { none: true }) : null };
}
