// 계정 관리 창: 비밀번호 변경 · 계정 삭제. 둘 다 현재 비밀번호로 다시 확인한다.
import { backend, koError } from '../core/backend.js';
import * as Audio from '../core/audio.js';
import { h, modal, toast } from '../core/ui.js';

const DELETE_WORD = '삭제';
// 재인증 실패는 '이메일 또는 비밀번호' 대신 이 창에 맞는 문구로
const pwError = (e) => (['auth/invalid-credential', 'auth/wrong-password'].includes(e?.code) ? '비밀번호가 올바르지 않습니다.' : koError(e));

const pw = (id, label, autocomplete, hint) => h('label', { class: 'f', for: id },
  h('span', { class: 'f-label' }, label),
  h('input', { id, name: id, type: 'password', autocomplete, required: true }),
  hint && h('span', { class: 'f-hint' }, hint));

export function openAccountManager(ctx) {
  const err1 = h('p', { class: 'err', role: 'alert' });
  const save = h('button', { class: 'btn primary', type: 'submit' }, '비밀번호 변경');
  const pwForm = h('form', { class: 'form', novalidate: true },
    pw('cur', '현재 비밀번호', 'current-password'),
    pw('next', '새 비밀번호', 'new-password', '8자 이상'),
    pw('next2', '새 비밀번호 확인', 'new-password'),
    err1, h('div', { class: 'row' }, save));
  pwForm.addEventListener('submit', async (e) => {
    e.preventDefault(); err1.className = 'err'; err1.textContent = '';
    const current = pwForm.cur.value, next = pwForm.next.value;
    const bad = !current ? '현재 비밀번호를 입력하세요.' : next.length < 8 ? '새 비밀번호는 8자 이상이어야 합니다.'
      : next !== pwForm.next2.value ? '새 비밀번호 확인이 일치하지 않습니다.' : next === current ? '현재 비밀번호와 다른 비밀번호를 입력하세요.' : '';
    if (bad) { err1.textContent = bad; Audio.sfx('error'); return; }
    save.disabled = true; save.textContent = '변경 중…';
    try { await backend.changePassword({ current, next }); pwForm.reset(); err1.className = 'err ok'; err1.textContent = '비밀번호를 변경했습니다.'; Audio.sfx('confirm'); }
    catch (ex) { err1.textContent = pwError(ex); Audio.sfx('error'); }
    save.disabled = false; save.textContent = '비밀번호 변경';
  });

  const err2 = h('p', { class: 'err', role: 'alert' });
  const del = h('button', { class: 'btn danger', type: 'submit' }, '계정 영구 삭제');
  const delForm = h('form', { class: 'form', novalidate: true },
    h('p', { class: 'hint' }, '게임 진행, 보고서, 등록 기기, 보안 PIN이 모두 지워지고 콜사인도 해제됩니다. 되돌릴 수 없습니다.'),
    pw('delpw', '비밀번호', 'current-password'),
    h('label', { class: 'f', for: 'delword' }, h('span', { class: 'f-label' }, `확인을 위해 “${DELETE_WORD}” 입력`),
      h('input', { id: 'delword', name: 'delword', autocomplete: 'off', spellcheck: 'false', required: true })),
    err2, h('div', { class: 'row' }, del));
  delForm.addEventListener('submit', async (e) => {
    e.preventDefault(); err2.textContent = '';
    const password = delForm.delpw.value;
    if (delForm.delword.value.trim() !== DELETE_WORD) { err2.textContent = `“${DELETE_WORD}”를 정확히 입력하세요.`; Audio.sfx('error'); return; }
    if (!password) { err2.textContent = '비밀번호를 입력하세요.'; Audio.sfx('error'); return; }
    del.disabled = true; del.textContent = '삭제 중…';
    try { await ctx.deleteAccount(password); box.close(); toast('계정을 삭제했습니다.', 'alert'); }
    catch (ex) { err2.textContent = pwError(ex); Audio.sfx('error'); del.disabled = false; del.textContent = '계정 영구 삭제'; }
  });

  const box = modal({
    title: '계정 관리',
    body: h('div', { class: 'account' },
      h('p', { class: 'hint' }, `${ctx.user.nick} · ${ctx.user.email}`),
      h('h4', { class: 'acct-h' }, '비밀번호 변경'), pwForm,
      h('details', { class: 'more acct-danger' }, h('summary', {}, '계정 삭제'), delForm)),
    actions: [{ label: '닫기', kind: 'primary' }],
  });
  if (backend.mode === 'local') pwForm.prepend(h('p', { class: 'hint' }, '로컬 시험 모드: 이 기기에 저장된 계정의 비밀번호만 바뀝니다.'));
}
