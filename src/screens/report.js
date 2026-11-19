// 오늘의 보고서: 미리보기 → 제출(하루 마감) → 다음 날 개시. 제출된 보고서는 백엔드(Firestore)에 저장된다.
import * as Audio from '../core/audio.js';
import { backend } from '../core/backend.js';
import { engine } from '../game/engine.js';
import { assertHolder } from '../core/session.js';
import { clockInfo, fmtCredits } from '../game/sim.js';
import { DEPT } from '../game/data.js';
import { h, icon, modal, pad } from '../core/ui.js';

const RES = { success: ['성공', 'good'], partial: ['부분 성공', 'mid'], fail: ['실패', 'bad'] };

export function mountReport(root, ctx) {
  const sim = engine.sim; sim.setSpeed(0);
  let submitted = null;
  const wrap = h('div', { class: 'rpt screen' });
  const past = h('div', { class: 'past' });

  const section = (no, title, ...kids) => h('section', { class: 'rsec' }, h('h3', {}, h('b', {}, no), title), ...kids);
  const table = (heads, rows) => h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, heads.map((x) => h('th', {}, x)))), h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => (c && c.nodeType ? c : h('td', {}, String(c))))))));
  const td = (...k) => h('td', {}, ...k);

  const paint = () => {
    const r = submitted || sim.buildReport(true);
    const c = clockInfo(r.clockEnd), live = !submitted && sim.units.filter((u) => u.mode === 'mission' || u.mode === 'patrol').length;
    const delta = r.fundsEnd - r.fundsStart;
    const head = h('header', { class: 'bar' }, h('button', { class: 'back', type: 'button', onclick: () => { Audio.sfx('select'); ctx.go('#/panel'); }, html: `${icon('back', 18)}<span>메인 패널</span>` }), h('div', { class: 'bar-title' }, h('b', {}, '오늘의 보고서'), h('small', {}, 'DAILY REPORT')));
    const doc = h('article', { class: 'doc' },
      h('p', { class: 'eyebrow' }, submitted ? 'SUBMITTED' : 'DRAFT'), h('h1', {}, `DAY ${pad(r.day)}`),
      h('p', { class: 'lede' }, `${c.text} 기준 · ${r.summary}`),
      h('dl', { class: 'kv wide' }, h('div', {}, h('dt', {}, '수입'), h('dd', {}, fmtCredits(r.income))), h('div', {}, h('dt', {}, '운영비'), h('dd', {}, fmtCredits(-r.upkeep))), h('div', {}, h('dt', {}, '자금 변동'), h('dd', { class: delta < 0 ? 'neg' : 'pos' }, `${delta >= 0 ? '+' : ''}${fmtCredits(delta)}`)), h('div', {}, h('dt', {}, '평판'), h('dd', {}, String(r.rep)))),
      live ? h('p', { class: 'note' }, `진행 중인 임무·순찰 ${live}건은 제출하는 순간 마감 정산됩니다.`) : null,
      section('01', '부서별 실적', table(['부서', '인원', '임무 (성/부/실)', '순찰', '수입', '평균 HP'], r.depts.map((d) => [td(h('i', { class: 'dot', style: `background:${DEPT[d.key].color}` }), d.en, h('small', {}, ` ${d.ko}`)), d.members, `${d.missions} (${d.success}/${d.partial}/${d.fail})`, d.patrols, fmtCredits(d.income), d.avgHp]))),
      section('02', '임무 기록', r.missions.length ? table(['시각', '담당', '임무', '결과', '보상'], r.missions.map((m) => [clockInfo(m.clock).text, m.who, m.name, h('td', { class: RES[m.result][1] }, RES[m.result][0] + (m.loss ? ` (부상 -${m.loss})` : '')), m.reward ? fmtCredits(m.reward) : '—'])) : h('p', { class: 'hint' }, '오늘 완료된 임무가 없습니다.')),
      section('03', '순찰 · 특이 보고', r.patrols.length ? h('ul', { class: 'plist' }, ...r.patrols.map((p) => h('li', {}, h('b', {}, `${clockInfo(p.clock).text} ${p.who} — ${p.route}`), h('ul', {}, ...(p.events.length ? p.events.map((e) => h('li', { class: e.kind }, e.text)) : [h('li', {}, '보고 없음')]))))) : h('p', { class: 'hint' }, '오늘 완료된 순찰이 없습니다.')),
      section('04', '엿들은 혼잣말', r.overheard.length ? h('ul', { class: 'quotes' }, ...r.overheard.map((q) => h('li', {}, h('b', {}, q.who), h('span', {}, `“${q.text}”`)))) : h('p', { class: 'hint' }, '기록 없음. 현장 지휘에서 캐릭터를 눌러 “대화 엿듣기”를 사용해 보세요.')),
      section('05', '부상자', r.injured.length ? h('p', {}, r.injured.map((i) => `${i.name} (HP ${i.hp})`).join(', ')) : h('p', { class: 'hint' }, '없음')));
    const side = h('aside', { class: 'rside' },
      submitted
        ? h('div', { class: 'done' }, h('p', { class: 'eyebrow' }, 'DONE'), h('h2', {}, '제출 완료'), h('p', {}, `DAY ${pad(sim.day)} 가 개시되었습니다. 시간은 정지 상태입니다.`), h('p', { class: 'note' }, `연구 포인트 +1 (보유 ${sim.research.points})`), h('button', { class: 'btn primary', type: 'button', onclick: () => ctx.go('#/panel') }, '메인 패널로'))
        : h('div', {}, h('p', { class: 'eyebrow' }, 'SUBMIT'), h('h2', {}, '하루를 마감합니다'), h('p', { class: 'lede' }, '제출하면 오늘의 기록이 저장되고, 모든 인원이 각자의 방으로 복귀하며 다음 날이 시작됩니다. 연구 포인트 +1을 얻습니다.'),
          h('button', { class: 'btn primary lg', type: 'button', onclick: submit }, '오늘의 보고서 올리기')),
      h('div', { class: 'past-wrap' }, h('h4', {}, '지난 보고서'), past));
    wrap.replaceChildren(head, h('div', { class: 'report-body' }, doc, side));
  };

  const submit = () => modal({ title: '오늘의 보고서를 올릴까요?', body: '하루가 종료되고 진행 중인 임무·순찰은 즉시 정산됩니다. 되돌릴 수 없습니다.', actions: [{ label: '취소' }, { label: '제출', kind: 'primary', keep: true, onClick: async (close) => {
    try {
      await assertHolder(); const rep = sim.buildReport(false); await backend.submitReport(ctx.user.uid, rep); sim.nextDay(rep); submitted = rep; await engine.save();
      Audio.sfx('report'); close(); paint(); loadPast();
    } catch (e) { Audio.sfx('error'); ctx.toast('제출 실패: ' + (e.userMessage || e.message), 'bad'); }
  } }] });

  const loadPast = async () => {
    try {
      const list = await backend.listReports(ctx.user.uid, 10);
      past.replaceChildren(...(list.length ? list.map((x) => h('details', {}, h('summary', {}, h('b', {}, `DAY ${pad(x.day)}`), h('span', {}, new Date(x.createdAt).toLocaleDateString('ko-KR'))), h('p', {}, x.summary))) : [h('p', { class: 'hint' }, '아직 제출한 보고서가 없습니다.')]));
    } catch (e) { past.replaceChildren(h('p', { class: 'hint' }, '불러오기 실패: ' + (e.userMessage || e.message))); }
  };

  root.append(wrap); paint(); loadPast();
  const t = setInterval(() => { if (!submitted && !document.querySelector('.modal-back')) paint(); }, 4000);
  return () => clearInterval(t);
}
