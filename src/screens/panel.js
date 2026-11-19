// 메인 패널(허브): 기능 3개(CCTV / 현장 지휘 / 오늘의 보고서) + 부서 현황. 사운드 끄기 버튼은 이 화면에만 있다.
import * as Audio from '../core/audio.js';
import { engine } from '../game/engine.js';
import { DEPTS } from '../game/data.js';
import { WEATHERS } from '../game/weather.js';
import { clockInfo, fmtCredits, DAY_REAL_SECONDS } from '../game/sim.js';
import { h, icon, pad } from '../core/ui.js';
import { openDeviceManager } from './device.js';

export function mountPanel(root, ctx) {
  const sim = engine.sim;
  const snd = h('button', { class: 'icon-btn', type: 'button', 'aria-label': '사운드 켜기/끄기', onclick: () => { const m = Audio.setMuted(!Audio.isMuted()); paintSnd(); if (!m) Audio.sfx('select'); } });
  const paintSnd = () => { snd.innerHTML = icon(Audio.isMuted() ? 'mute' : 'vol', 20); snd.setAttribute('aria-pressed', String(Audio.isMuted())); snd.title = Audio.isMuted() ? '사운드 꺼짐' : '사운드 켜짐'; };
  paintSnd();

  const go = (hash) => () => { Audio.sfx('select'); ctx.go(hash); };
  const row = (no, title, sub, hash, extra = '') => h('button', { class: `mod ${extra}`, type: 'button', onclick: go(hash) },
    h('span', { class: 'mod-no' }, no), h('span', { class: 'mod-body' }, h('b', {}, title), h('small', {}, sub)), h('span', { class: 'mod-go', html: icon('arrow', 22) }));
  const reportRow = row('07', '오늘의 보고서 올리기', '하루를 마감하고 보고서를 제출합니다 · 연구 포인트 +1', '#/panel/report', 'report');

  const day = h('span', { class: 'bignum' }), clock = h('span', { class: 'clockline' }), funds = h('b'), rep = h('b'), injured = h('b'), away = h('b');
  const envToday = h('b'), envNext = h('b'), envDesc = h('small'), snowFill = h('i'), snowTxt = h('span');
  const env = h('div', { class: 'env' }, h('p', { class: 'eyebrow' }, 'ENVIRONMENT'), h('div', { class: 'env-row' }, h('div', {}, h('small', {}, '오늘'), envToday), h('div', {}, h('small', {}, '내일 예보'), envNext)), envDesc, h('div', { class: 'snowbar', role: 'meter', 'aria-label': '적설' }, snowFill), snowTxt);
  const depBody = h('tbody');
  const dep = h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, '부서'), h('th', {}, '인원'), h('th', {}, '활동'), h('th', {}, '상태'))), depBody);
  const paint = () => {
    const c = clockInfo(sim.clock);
    day.textContent = pad(sim.day);
    clock.textContent = `${c.text} · ${c.phase} · ${sim.ended ? '하루 종료' : sim.speed === 0 ? '정지' : `진행 ${sim.speed}x`}`;
    funds.textContent = fmtCredits(sim.funds); rep.textContent = String(sim.rep);
    injured.textContent = String(sim.units.filter((u) => u.hp < 25).length); away.textContent = String(sim.units.filter((u) => u.mode === 'mission').length);
    const w = WEATHERS[sim.weather.today]; envToday.textContent = w.ko; envNext.textContent = WEATHERS[sim.weather.next].ko; envDesc.textContent = w.desc; snowFill.style.width = `${Math.round(sim.snow)}%`; snowTxt.textContent = `적설 ${Math.round(sim.snow)}%`;
    reportRow.classList.toggle('due', sim.ended);
    const rsub = root.querySelector('.mods .mod:nth-child(4) small'); if (rsub) rsub.textContent = `연구 포인트 ${sim.research.points} 보유 · 능력 해금 · 3배속 · 수입 증가`;
    depBody.replaceChildren(...DEPTS.map((d) => {
      const m = sim.units.filter((u) => u.dept === d.key);
      const act = m.filter((u) => u.mode === 'mission' || u.mode === 'patrol').length, hp = Math.round(m.reduce((a, u) => a + u.hp, 0) / m.length);
      return h('tr', {}, h('td', {}, h('i', { class: 'dot', style: `background:${d.color}` }), h('span', { class: 'dn' }, d.en), h('small', {}, d.ko)), h('td', {}, String(m.length)), h('td', {}, act ? `${act}명 출동` : '—'),
        h('td', {}, h('span', { class: 'hpbar', title: `평균 HP ${hp}` }, h('i', { style: `width:${hp}%` }))));
    }));
  };
  paint(); const timer = setInterval(paint, 500);

  root.append(h('div', { class: 'panel screen' },
    h('header', { class: 'bar' }, h('img', { class: 'bar-mark', src: 'img/logo.png', alt: '' }), h('div', { class: 'bar-title' }, h('b', {}, '천공월아민간군사기업 관리 패널'), h('small', {}, 'PIERCING CRESCENT MOON PMC')), h('span', { class: 'grow' }),
      h('span', { class: 'who' }, ctx.user.nick, h('small', {}, ctx.backendLabel)), snd, h('button', { class: 'icon-btn', type: 'button', 'aria-label': '등록된 기기', title: '등록된 기기', html: icon('device', 20), onclick: () => openDeviceManager(ctx) }), h('button', { class: 'icon-btn', type: 'button', 'aria-label': '로그아웃', title: '로그아웃', html: icon('logout', 20), onclick: () => ctx.logout() })),
    h('main', { class: 'hub' },
      h('section', { class: 'hub-main' },
        h('p', { class: 'eyebrow' }, 'DAY'), h('h1', { class: 'bigday' }, day), clock,
        h('p', { class: 'daynote' }, `하루는 아침 12시간 + 밤 9시간(게임 내 21시간), 1배속 기준 실제 ${DAY_REAL_SECONDS / 60}분입니다.`),
        h('nav', { class: 'mods', 'aria-label': '주요 기능' },
          row('01', 'CCTV 캠', '기지 10개 채널 실시간 감시', '#/panel/cctv'),
          row('02', '현장 지휘', '지도 이동 · 방 배치 · 임무 · 순찰 · 대화 엿듣기', '#/panel/field'),
          row('03', '커스터마이징', '머리·무기·스탯·특성 뽑기·능력', '#/panel/custom'),
          row('04', '연구', '능력 해금 · 3배속 · 수입 증가', '#/panel/research'),
          row('05', '상점', '능력치 아이템 · 장비 · 소모품 · 가구 40종', '#/panel/shop'),
          row('06', '팀장 면담', '8개 부서 팀장과 대화 · 격려 · 지원', '#/panel/leader'),
          reportRow)),
      h('aside', { class: 'hub-side' },
        env,
        h('dl', { class: 'kv' }, h('div', {}, h('dt', {}, '자금'), h('dd', {}, funds)), h('div', {}, h('dt', {}, '평판'), h('dd', {}, rep)), h('div', {}, h('dt', {}, '출동 중'), h('dd', {}, away)), h('div', {}, h('dt', {}, '부상자'), h('dd', {}, injured))),
        dep))));

  Audio.startAmbient();
  return () => { clearInterval(timer); Audio.stopAmbient(); };
}
