// 로그인 / 회원가입 — 서로 다른 화면(경로)으로 분리.
import { backend, getBackend, koError } from '../core/backend.js';
import * as Audio from '../core/audio.js';
import { h, esc } from '../core/ui.js';
import { nickProblem } from '../core/nick.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function shell({ kicker, title, sub, form, foot }) {
  const b = getBackend();
  const local = b.mode === 'local';
  return h('main', { class: 'auth screen' },
    h('section', { class: 'auth-aside' },
      h('img', { class: 'auth-mark', src: 'img/logo.png', alt: '' }),
      h('dl', { class: 'readout' },
        h('div', {}, h('dt', {}, 'NODE'), h('dd', {}, 'PCM-PMC / 01')),
        h('div', {}, h('dt', {}, 'LINK'), h('dd', { class: local ? 'warn' : '' }, b.label)),
        h('div', {}, h('dt', {}, 'ACCESS'), h('dd', {}, '인가된 인원 한정')),
      ),
      local && h('p', { class: 'localnote', role: 'note' }, 'Firebase 설정이 비어 있어 로컬 시험 모드로 동작 중입니다. 계정은 이 기기 안에만 저장되며 다른 기기에서 로그인할 수 없습니다. src/config/firebase-config.js 를 채우면 Firebase 로 전환됩니다.'),
    ),
    h('section', { class: 'auth-main' }, h('div', { class: 'auth-head' }, h('p', { class: 'eyebrow' }, kicker), h('h2', {}, title), h('p', { class: 'lede' }, sub)), form, foot));
}

function field({ id, label, type = 'text', autocomplete, inputmode, maxlength, placeholder, hint }) {
  return h('label', { class: 'f', for: id },
    h('span', { class: 'f-label' }, label),
    h('input', { id, name: id, type, autocomplete, inputmode, maxlength, placeholder, spellcheck: 'false', autocapitalize: 'off', required: true }),
    hint && h('span', { class: 'f-hint' }, hint));
}

export function mountLogin(root, ctx) {
  const err = h('p', { class: 'err', role: 'alert' });
  const submit = h('button', { class: 'btn primary', type: 'submit' }, '접속');
  const form = h('form', { class: 'form', novalidate: true },
    field({ id: 'email', label: '이메일', type: 'email', autocomplete: 'username', inputmode: 'email' }),
    field({ id: 'password', label: '비밀번호', type: 'password', autocomplete: 'current-password' }),
    err,
    h('div', { class: 'row' }, submit, h('button', { class: 'link', type: 'button', onclick: () => ctx.go('#/signup') }, '계정이 없나요? 회원가입')),
    h('button', { class: 'link sub', type: 'button', onclick: async () => {
      const email = form.email.value.trim();
      if (!EMAIL_RE.test(email)) { err.textContent = '비밀번호를 재설정할 이메일을 먼저 입력하세요.'; return; }
      try { await backend.resetPassword(email); err.className = 'err ok'; err.textContent = '재설정 메일을 보냈습니다. 메일함을 확인하세요.'; } catch (e) { err.className = 'err'; err.textContent = koError(e); }
    } }, '비밀번호를 잊었어요'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); err.className = 'err'; err.textContent = '';
    const email = form.email.value.trim(), password = form.password.value;
    if (!EMAIL_RE.test(email)) { err.textContent = '이메일 형식이 올바르지 않습니다.'; Audio.sfx('error'); return; }
    if (!password) { err.textContent = '비밀번호를 입력하세요.'; Audio.sfx('error'); return; }
    submit.disabled = true; submit.textContent = '확인 중…';
    try { await ctx.signedIn(await backend.signIn({ email, password })); Audio.sfx('confirm'); }
    catch (ex) { err.textContent = koError(ex); Audio.sfx('error'); submit.disabled = false; submit.textContent = '접속'; }
  });
  root.append(shell({ kicker: 'ACCESS / 01', title: '로그인', sub: '관리 패널에 접속합니다. 로그인 후 2차 보안 확인이 한 번 더 진행됩니다.', form }));
  setTimeout(() => form.email.focus(), 60);
}

export function mountSignup(root, ctx) {
  const err = h('p', { class: 'err', role: 'alert' });
  const submit = h('button', { class: 'btn primary', type: 'submit' }, '계정 생성');
  const form = h('form', { class: 'form', novalidate: true },
    field({ id: 'nick', label: '콜사인(닉네임)', autocomplete: 'nickname', maxlength: 12, hint: '2~12자. 다른 사람과 같은 이름은 쓸 수 없습니다.' }),
    field({ id: 'email', label: '이메일', type: 'email', autocomplete: 'email', inputmode: 'email' }),
    field({ id: 'password', label: '비밀번호', type: 'password', autocomplete: 'new-password', hint: '8자 이상' }),
    field({ id: 'password2', label: '비밀번호 확인', type: 'password', autocomplete: 'new-password' }),
    err,
    h('div', { class: 'row' }, submit, h('button', { class: 'link', type: 'button', onclick: () => ctx.go('#/login') }, '이미 계정이 있나요? 로그인')));
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); err.className = 'err'; err.textContent = '';
    const nick = form.nick.value.trim(), email = form.email.value.trim(), pw = form.password.value;
    const bad = nickProblem(nick) ? nickProblem(nick) : !EMAIL_RE.test(email) ? '이메일 형식이 올바르지 않습니다.' : pw.length < 8 ? '비밀번호는 8자 이상이어야 합니다.' : pw !== form.password2.value ? '비밀번호 확인이 일치하지 않습니다.' : '';
    if (bad) { err.textContent = bad; Audio.sfx('error'); return; }
    submit.disabled = true; submit.textContent = '생성 중…';
    try { await ctx.signedUp(await backend.signUp({ email, password: pw, nick })); Audio.sfx('confirm'); }
    catch (ex) { err.textContent = koError(ex); Audio.sfx('error'); submit.disabled = false; submit.textContent = '계정 생성'; }
  });
  const nickEl = form.nick, nickHint = nickEl.parentElement.querySelector('.f-hint'); let nickSeq = 0;
  nickEl.addEventListener('change', async () => {
    const v = nickEl.value.trim(), mine = ++nickSeq; const p = nickProblem(v);
    if (p) { nickHint.textContent = p; nickHint.style.color = 'var(--red)'; return; }
    try { const ok = await backend.nickAvailable(v); if (mine !== nickSeq) return; nickHint.textContent = ok ? '사용할 수 있는 콜사인입니다.' : '이미 사용 중인 콜사인입니다.'; nickHint.style.color = ok ? 'var(--green)' : 'var(--red)'; } catch { /* 확인 실패 시 가입 단계에서 다시 검사 */ }
  });
  root.append(shell({ kicker: 'ACCESS / 02', title: '회원가입', sub: '계정을 만들면 이어서 2차 보안(인증 앱 + PIN)을 설정합니다.', form }));
  setTimeout(() => form.nick.focus(), 60);
}
export { esc };
