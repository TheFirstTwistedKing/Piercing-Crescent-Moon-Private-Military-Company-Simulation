// 복장 설계 목록 — 참고 자료 15벌 × 남/여 = 30종. 설계 필드는 outfit.js 머리말 참고(coat 겉옷 · inner 안에 입은 것 · pants 바지/치마 · boot 신발 · pal 색).
// 남성용 = 자료의 옷을 그대로, 여성용 = 같은 옷을 여성 재단(짧은 기장 · 허리 벨트 · 치마/반바지 + 스타킹 · 리본)으로 바꾼 것.
const slim = { style: 'slim' };
const merge = (m, p) => ({ ...m, ...p, pal: { ...m.pal, ...(p.pal || {}) }, coat: p.coat === null ? undefined : p.coat ? { ...m.coat, ...p.coat } : m.coat, pants: p.pants ?? m.pants, boot: p.boot ?? m.boot });
const M = {
  o1m: { // 베이지 트렌치 + 검은 조끼 + 흰 니트 + 검은 스카프, 레이스업 부츠
    pal: { coat: '#c9bfa6', lining: '#8b7a5a', shirt: '#e4e2dc', vest: '#1d1d22', pants: '#1c1c20', boot: '#121214', accent: '#b0a07a', glove: '#111113', belt: '#101010', metal: '#c9ccd2' },
    coat: { len: 6, open: true, lapel: true, collar: 'notch', lining: true, flare: 1, flareRate: 0.25, sway: 1 }, inner: 'vest', neck: 'scarf', sleeve: 'long', cuff: 'i', glove: 'full', pants: slim, boot: { tall: 3, lace: true, band: 't' } },
  o2m: { // 청회색 긴 코트 + 핀스트라이프 조끼 + 타이 + 권총집
    pal: { coat: '#2d3d42', lining: '#17222a', shirt: '#b7bfc2', vest: '#1c2733', pants: '#141a20', boot: '#0d0d10', accent: '#b5834a', glove: '#111111', belt: '#0e0e10', metal: '#9aa3a6' },
    coat: { len: 8, open: true, lapel: true, collar: 'notch', lining: true, flare: 1, flareRate: 0.3, sway: 1, tex: true }, inner: 'vest', tie: true, buttons: true, hip: true, belt: true, sleeve: 'long', cuff: 'i', pants: { style: 'slim', stripe: true }, boot: { sock: 'm' } },
  o3m: { // 검은 오버사이즈 수트 + 뱀무늬 셔츠 + 스카프 + 로퍼
    pal: { coat: '#2b2e30', lining: '#101012', shirt: '#4a4a44', vest: '#222222', pants: '#30363a', boot: '#0b0b0d', accent: '#c2a35a', glove: '#111111', belt: '#0c0c0e', metal: '#b8b8b8' },
    coat: { len: 3, open: true, lapel: true, collar: 'notch', lining: true, flare: 1, flareRate: 0.2, sway: 1 }, inner: 'shirt', neck: 'scarf', belt: true, sleeve: 'long', cuff: 'i', pants: { style: 'slim', wide: 1 }, boot: { toe: 'q', light: true } },
  o4m: { // 검정 반팔 터틀넥 + 주황 카고 + 흰 스플릿토 부츠
    pal: { coat: '#0e0e10', shirt: '#0e0e10', vest: '#111111', pants: '#16161a', boot: '#e9e9ec', accent: '#ff6a13', glove: '#111111', belt: '#ff6a13', metal: '#444444' },
    inner: 'turtle', neck: 'turtle', sleeve: 'short', belt: true, pocket: true, pants: { style: 'slim', wide: 1, pocket: true }, boot: { tall: 0, toe: 't', sole: 'z' }, thigh: { row: 4, letter: 'A' } },
  o5am: { // 회색 탱크 + 검은 오버 재킷 + 붉은 스트랩
    pal: { coat: '#0f0f12', lining: '#2a2a2e', shirt: '#8b8b90', vest: '#111111', pants: '#39393d', boot: '#0c0c0e', accent: '#c8202a', glove: '#111111', belt: '#0c0c0c', metal: '#a8a8ae' },
    coat: { len: 2, open: true, lapel: false, collar: 'band', flare: 2, sway: 1 }, inner: 'tank', straps: 'A', straps2: 'A', chain: true, belt: true, sleeve: 'long', pants: { style: 'slim', wide: 1, pocket: true }, boot: { tall: 4, lace: true, sole: 'A' } },
  o5bm: { // 흰 티 + 검은 재킷 + 파란 포인트
    pal: { coat: '#0b0b0e', lining: '#1a1a22', shirt: '#eeeeee', vest: '#111111', pants: '#101014', boot: '#0b0b0e', accent: '#2c4fe0', glove: '#111111', belt: '#0c0c0c', metal: '#9aa0b0' },
    coat: { len: 2, open: true, lapel: false, collar: 'band', flare: 2, sway: 1 }, inner: 'shirt', straps: 'A', belt: true, chain: true, sleeve: 'long', pants: { style: 'slim', wide: 1 }, boot: { tall: 3, lace: true, sole: 'A' } },
  o6m: { // 흰 롱코트 + 파란 스트랩 + 검은 긴 튜닉
    pal: { coat: '#e9eaee', lining: '#2849c8', shirt: '#2a3fb0', vest: '#15171c', pants: '#15171c', boot: '#0e0e12', accent: '#2f55e6', glove: '#111111', belt: '#2a45c8', metal: '#cfd3dc' },
    coat: { len: 8, open: true, lapel: true, collar: 'notch', lining: true, flare: 1, flareRate: 0.25, sway: 1 }, inner: 'vest', tie: true, straps: 'A', pauldron: true, belt: true, sleeve: 'long', cuff: 'i', pants: { style: 'robe', wide: 1, seam: true }, boot: {} },
  o7m: { // 검은 광택 후드 코트 + 터틀넥
    pal: { coat: '#16171a', lining: '#0c0c0e', shirt: '#101012', vest: '#101012', pants: '#1c1f24', boot: '#0c0c0e', accent: '#aab0ba', glove: '#0c0c0e', belt: '#0a0a0a', metal: '#b8bcc4' },
    coat: { len: 8, open: true, lapel: false, collar: 'hood', lining: false, flare: 1, flareRate: 0.3, sway: 1, tex: true }, inner: 'turtle', neck: 'turtle', belt: true, sleeve: 'long', glove: 'full', pants: slim, boot: { tall: 1 } },
  o8m: { // 검은 터틀넥 + 회색 트렌치 + 버클 롱부츠
    pal: { coat: '#5b5e68', lining: '#2a2c33', shirt: '#0f0f12', vest: '#0f0f12', pants: '#0d0d11', boot: '#0b0b0e', accent: '#c8ccd4', glove: '#111111', belt: '#0b0b0b', metal: '#c8ccd4' },
    coat: { len: 8, open: true, lapel: true, collar: 'notch', lining: true, flare: 1, flareRate: 0.3, sway: 2 }, inner: 'turtle', neck: 'turtle', belt: true, sleeve: 'long', glove: 'full', pants: slim, boot: { tall: 6, lace: true, band: 'S' } },
  o9m: { // 흰 크롭 재킷 + 청록 하네스 + 회색 바지 + 흰 스니커즈
    pal: { coat: '#eef2f6', lining: '#27c0d6', shirt: '#16181c', vest: '#16181c', pants: '#4a4e56', boot: '#e8eef4', accent: '#27c0d6', glove: '#16181c', belt: '#16181c', metal: '#99aabb' },
    coat: { len: 0, open: true, lapel: true, collar: 'band', flare: 1, lining: true }, inner: 'turtle', neck: 'turtle', straps: 'A', straps2: 'A', belt: true, sleeve: 'long', cuff: 'A', pants: { style: 'slim' }, boot: { toe: 't', sole: 'A', light: true } },
  o10m: { // 검은 롱코트 + 지퍼/체인
    pal: { coat: '#14151a', lining: '#0b0b0e', shirt: '#101114', vest: '#101114', pants: '#111216', boot: '#0b0b0e', accent: '#9aa0aa', glove: '#0c0c0e', belt: '#0a0a0a', metal: '#b0b5bd' },
    coat: { len: 9, open: true, lapel: true, collar: 'notch', lining: true, flare: 1, flareRate: 0.3, sway: 2, trim: true }, inner: 'zipvest', zip: true, chain: true, belt: true, sleeve: 'long', glove: 'full', pants: slim, boot: { ankleStrap: true } },
  o11m: { // 검정 하이넥 반팔 + 흰 반바지 + 롱 플랫폼 부츠
    pal: { coat: '#101013', shirt: '#101013', vest: '#101013', pants: '#f0f0f3', boot: '#0b0b0d', accent: '#d9d9de', glove: '#101013', belt: '#0b0b0b', metal: '#c8c8cc', stocking: '#e8c9a7' },
    inner: 'turtle', neck: 'turtle', sleeve: 'short', guard: true, belt: true, pants: { style: 'shorts', hem: 4 }, boot: { tall: 6, lace: true, band: 'P' }, thigh: { row: 6, letter: 'P' } },
  o12m: { // 민소매 지퍼 탑 + 와이드 레이어드 팬츠 + 플랫폼 슈즈
    pal: { coat: '#0d0d10', shirt: '#0d0d10', vest: '#0d0d10', pants: '#121316', boot: '#0b0b0d', accent: '#9ca0a8', glove: '#0d0d10', belt: '#0b0b0b', metal: '#c8ccd2' },
    inner: 'zipvest', zip: true, neck: 'turtle', sleeve: 'none', guard: true, belt: true, pants: { style: 'slim', wide: 2, stripe: true, pocket: true }, boot: { sole: 'z' } },
  o13m: { // 검은 롱코트 + 흰 셔츠 + 타이 + 조끼 + 하네스
    pal: { coat: '#15151a', lining: '#0c0c10', shirt: '#eeeeee', vest: '#2a2a30', pants: '#18181c', boot: '#0b0b0d', accent: '#c9c9ce', glove: '#111111', belt: '#0b0b0b', metal: '#8a8e96' },
    coat: { len: 8, open: true, lapel: true, collar: 'notch', lining: true, flare: 1, flareRate: 0.3, sway: 1, trim: true }, inner: 'vest', tie: true, straps: 'P', belt: true, sleeve: 'long', cuff: 'i', pants: slim, boot: { ankleStrap: true } },
  o14m: { // 흰 롱코트(붉은 얼룩/스트랩) + 검은 조끼 + 핀스트라이프
    pal: { coat: '#e6e6ea', lining: '#d8d8de', shirt: '#eeeeee', vest: '#101012', pants: '#17171b', boot: '#0b0b0d', accent: '#b01e24', glove: '#111111', belt: '#0b0b0b', metal: '#b8b8c0' },
    coat: { len: 9, open: true, lapel: true, collar: 'notch', lining: true, flare: 1, flareRate: 0.25, sway: 1 }, inner: 'vest', tie: true, chain: true, blood: [[-4, 3], [-3, 4], [-5, 5], [4, 9], [3, 6], [5, 2]], sleeve: 'long', cuff: 'i', pants: { style: 'slim', stripe: true }, boot: {} },
};
const F = {
  o1f: merge(M.o1m, { coat: { len: 5 }, belt: true, tie: false, pants: { style: 'shorts', hem: 3, stocking: true }, pal: { stocking: '#4a4a52', belt: '#8b7a5a' }, boot: { tall: 3, lace: true, band: 't' } }),
  o2f: merge(M.o2m, { coat: { len: 4 }, pants: { style: 'skirt', hem: 4, stocking: true }, skirtMat: 'a', pal: { stocking: '#4a5a64' }, boot: { tall: 3 }, hip: false }),
  o3f: merge(M.o3m, { coat: { len: 2 }, pants: { style: 'shorts', hem: 3, stocking: true }, pal: { stocking: '#6a7074' }, boot: { tall: 3, toe: 'q' } }),
  o4f: merge(M.o4m, { pants: { style: 'shorts', hem: 4, pocket: true }, thigh: { row: 4, letter: 'A' }, boot: { tall: 2, toe: 't', sole: 'z' } }),
  o5af: merge(M.o5am, { coat: { len: 1 }, pants: { style: 'skirt', hem: 3, stocking: true }, skirtMat: 'm', pal: { stocking: '#55555c', pants: '#6a6a70' }, boot: { tall: 4, lace: true, sole: 'A' } }),
  o5bf: merge(M.o5bm, { coat: { len: 1 }, pants: { style: 'shorts', hem: 3, stocking: true }, pal: { stocking: '#3a3a46' }, boot: { tall: 4, lace: true, sole: 'A' } }),
  o6f: merge(M.o6m, { coat: { len: 7 }, pants: { style: 'robe', wide: 1, seam: true } }),
  o7f: merge(M.o7m, { coat: { len: 6 }, pants: { style: 'shorts', hem: 3, stocking: true }, pal: { stocking: '#4a4d54' }, boot: { tall: 3 } }),
  o8f: merge(M.o8m, { coat: { len: 6 }, pants: { style: 'skirt', hem: 4, stocking: true }, skirtMat: 'a', pal: { stocking: '#3a3a44' }, boot: { tall: 4, lace: true, band: 'S' } }),
  o9f: merge(M.o9m, { pants: { style: 'shorts', hem: 4, stocking: true }, pal: { stocking: '#7a7e86', pants: '#4a4e56' } }),
  o10f: merge(M.o10m, { coat: { len: 7 }, pants: { style: 'skirt', hem: 5, stocking: true }, skirtMat: 'a', pal: { stocking: '#4a4c54' } }),
  o11f: merge(M.o11m, { pants: { style: 'skirt', hem: 4, stocking: true }, skirtMat: 'm', pal: { stocking: '#e8c9a7' }, boot: { tall: 4, lace: true, band: 'P' } }),
  o12f: merge(M.o12m, { pants: { style: 'skirt', hem: 7, stocking: true }, skirtMat: 'm', pal: { stocking: '#3a3c44', pants: '#2a2c32' } }),
  o13f: merge(M.o13m, { coat: { len: 4 }, pants: { style: 'skirt', hem: 4, stocking: true }, skirtMat: 'a', pal: { stocking: '#6a6a72' } }),
  o14f: merge(M.o14m, { coat: { len: 8 }, pants: { style: 'skirt', hem: 4, stocking: true }, skirtMat: 'a', pal: { stocking: '#2a2a30' } }),
};
const NAME = { o1: '트렌치 코트', o2: '스트라이프 롱코트', o3: '오버핏 수트', o4: '카고 스트리트', o5a: '레드 스트랩 재킷', o5b: '블루 트림 재킷', o6: '화이트 블루 롱코트', o7: '후디드 코트', o8: '그레이 트렌치', o9: '화이트 크롭 재킷', o10: '체인 롱코트', o11: '하이넥 하프 팬츠', o12: '레이어드 와이드', o13: '블랙 테일러드', o14: '화이트 롱코트' };
export const OUTFITS = [];
for (const k of Object.keys(NAME)) for (const g of ['m', 'f']) OUTFITS.push({ id: k + g, g, name: NAME[k] + (g === 'f' ? ' (여)' : ' (남)'), spec: (g === 'm' ? M : F)[k + g] });
export const OUTFIT = Object.fromEntries(OUTFITS.map((o) => [o.id, o]));
