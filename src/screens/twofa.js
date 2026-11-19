// 2차 보안: 6자리 PIN. 최초 로그인(또는 가입 직후) 설정 → 이후 접속마다 확인. 복구 코드 8개(1회용)는 PIN 재설정과 새 기기 등록에 쓴다.
// ⚠ 한계: 검증이 앱(클라이언트) 안에서 이뤄지고 PIN 해시가 사용자 본인의 Firestore 문서에 저장되므로,
//   비밀번호까지 탈취한 공격자가 Firestore 를 직접 조작할 수 있다면 우회될 수 있다. 6자리 숫자는 오프라인 대입에도 약하다.
import { backend } from '../core/backend.js';
import * as Audio from '../core/audio.js';
import { hashSecret, verifySecret, sha256Hex, makeRecoveryCodes, normalizeRecovery, lockState, lockFail, lockClear } from '../core/crypto.js';
import { h } from '../core/ui.js';

const digitsOnly = (el, n = 6) => el.addEventListener('input', () => { el.value = el.value.replace(/\D/g, '').slice(0, n); });
const pinInput = (id, label, hint) => {
  const input = h('input', { id, name: id, type: 'password', inputmode: 'numeric', autocomplete: 'off', maxlength: 6, pattern: '[0-9]*', placeholder: '••••••', class: 'code', required: true });
  digitsOnly(input);
  return h('label', { class: 'f', for: id }, h('span', { class: 'f-label' }, label), input, hint && h('span', { class: 'f-hint' }, hint));
};
export function pinProblem(a) {
  if (!/^\d{6}$/.test(a)) return 'PIN은 숫자 6자리여야 합니다.';
  if (/^(\d)\1{5}$/.test(a) || '0123456789012345'.includes(a) || '9876543210987654'.includes(a)) return '너무 쉬운 PIN입니다. 다른 숫자를 사용하세요.';
  return '';
}
export const frame = ({ kicker, title, sub, body, step }) => h('main', { class: 'auth screen twofa' },
  h('section', { class: 'auth-aside' }, h('img', { class: 'auth-mark', src: 'img/logo.png', alt: '' }),
    step && h('ol', { class: 'steps' }, ...step.list.map((s, i) => h('li', { class: i === step.at ? 'on' : i < step.at ? 'done' : '' }, h('b', {}, String(i + 1).padStart(2, '0')), s)))),
  h('section', { class: 'auth-main' }, h('div', { class: 'auth-head' }, h('p', { class: 'eyebrow' }, kicker), h('h2', {}, title), h('p', { class: 'lede' }, sub)), body));

/* ───────────── 최초 설정 ───────────── */
export function mountSetup(root, ctx) {
  const STEPS = ['보안 PIN', '복구 코드'];
  const st = { pin: null, recovery: makeRecoveryCodes(8) };
  const render = (fn) => { root.replaceChildren(fn()); };

  const stepPin = () => {
    const err = h('p', { class: 'err', role: 'alert' });
    const form = h('form', { class: 'form', novalidate: true },
      pinInput('pin', '6자리 PIN', '로그인할 때마다 입력합니다. 생일·연속 숫자는 피하세요.'), pinInput('pin2', 'PIN 확인'), err,
      h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'submit' }, '다음')));
    form.addEventListener('submit', (e) => {
      e.preventDefault(); const a = form.pin.value, b = form.pin2.value;
      const bad = pinProblem(a) || (a !== b ? 'PIN 확인이 일치하지 않습니다.' : '');
      if (bad) { err.textContent = bad; Audio.sfx('error'); return; }
      st.pin = a; Audio.sfx('confirm'); render(stepRecovery);
    });
    setTimeout(() => form.pin.focus(), 60);
    return frame({ kicker: 'SECURITY / 01', title: '보안 PIN 설정', sub: '계정 비밀번호와 별개로, 접속할 때 매번 확인하는 6자리 숫자입니다.', body: form, step: { list: STEPS, at: 0 } });
  };

  const stepRecovery = () => {
    const err = h('p', { class: 'err', role: 'alert' });
    const chk = h('input', { type: 'checkbox', id: 'saved' });
    const finish = h('button', { class: 'btn primary', type: 'button', disabled: true }, '설정 완료');
    chk.addEventListener('change', () => { finish.disabled = !chk.checked; });
    finish.addEventListener('click', async () => {
      finish.disabled = true; finish.textContent = '저장 중…';
      try {
        const mfa = { enabled: true, pin: await hashSecret(st.pin), recovery: await Promise.all(st.recovery.map((c) => sha256Hex('rc:' + c))), createdAt: Date.now() };
        await backend.updateProfile(ctx.user.uid, { mfa });
        Audio.sfx('report'); await ctx.mfaDone({ ...(ctx.profile || {}), mfa });
      } catch (ex) { err.textContent = '저장 실패: ' + (ex.userMessage || ex.message); finish.disabled = false; finish.textContent = '설정 완료'; Audio.sfx('error'); }
    });
    const list = h('ul', { class: 'codes' }, ...st.recovery.map((c) => h('li', {}, c)));
    const body = h('div', { class: 'form' }, list,
      h('div', { class: 'row' }, h('button', { class: 'btn ghost', type: 'button', onclick: async (e) => { try { await navigator.clipboard.writeText(st.recovery.join('\n')); e.target.textContent = '복사됨'; } catch { e.target.textContent = '복사 불가 — 직접 적어두세요'; } } }, '복사')),
      h('label', { class: 'check' }, chk, h('span', {}, '복구 코드를 안전한 곳에 보관했습니다. (PIN 을 잊었거나 등록된 기기를 쓸 수 없을 때 1회용으로 사용 · 이 화면은 다시 볼 수 없음)')), err, h('div', { class: 'row' }, finish));
    return frame({ kicker: 'SECURITY / 02', title: '복구 코드 보관', sub: 'PIN 을 잊었을 때를 대비한 1회용 코드 8개입니다.', body, step: { list: STEPS, at: 1 } });
  };
  render(stepPin);
}

/* ───────────── 접속 시 확인 ───────────── */
export function mountVerify(root, ctx) {
  let reset = false;
  const err = h('p', { class: 'err', role: 'alert' });
  const fields = h('div', {});
  const submit = h('button', { class: 'btn primary', type: 'submit' }, '확인');
  const toggle = h('button', { class: 'link sub', type: 'button' });
  const form = h('form', { class: 'form', novalidate: true }, fields, err,
    h('div', { class: 'row' }, submit, h('button', { class: 'link', type: 'button', onclick: () => ctx.logout() }, '다른 계정으로 로그인')), toggle);
  const paint = () => {
    fields.replaceChildren(...(reset
      ? [h('label', { class: 'f', for: 'rc' }, h('span', { class: 'f-label' }, '복구 코드 (1회용)'), h('input', { id: 'rc', name: 'rc', autocomplete: 'off', placeholder: 'XXXX-XXXX', maxlength: 9, spellcheck: 'false', required: true })), pinInput('pin', '새 PIN 6자리')]
      : [pinInput('pin', '보안 PIN')]));
    submit.textContent = reset ? 'PIN 재설정' : '확인';
    toggle.textContent = reset ? '← PIN 으로 확인' : 'PIN 을 잊었나요? 복구 코드로 재설정';
    setTimeout(() => (reset ? form.rc : form.pin).focus(), 30);
  };
  toggle.addEventListener('click', () => { reset = !reset; err.textContent = ''; paint(); });
  const tick = () => { const s = lockState(ctx.user.uid); if (s.remaining > 0) { err.textContent = `시도가 너무 많습니다. ${s.remaining}초 후 다시 시도하세요.`; submit.disabled = true; setTimeout(tick, 1000); } else if (submit.disabled && !submit.dataset.busy) { submit.disabled = false; err.textContent = ''; } };
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); err.textContent = '';
    const uid = ctx.user.uid; if (lockState(uid).remaining > 0) { tick(); return; }
    submit.disabled = true; submit.dataset.busy = '1'; submit.textContent = '확인 중…';
    try {
      const profile = await backend.getProfile(uid); const mfa = profile?.mfa;
      if (!mfa?.enabled) { await ctx.go('#/setup'); return; }
      if (!reset) {
        if (await verifySecret(form.pin.value, mfa.pin)) { lockClear(uid); Audio.sfx('confirm'); await ctx.verified(profile); return; }
      } else {
        const norm = normalizeRecovery(form.rc.value); const hash = await sha256Hex('rc:' + norm);
        const bad = pinProblem(form.pin.value);
        if (/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(norm) && (mfa.recovery || []).includes(hash)) {
          if (bad) { err.textContent = bad; Audio.sfx('error'); submit.dataset.busy = ''; submit.disabled = false; submit.textContent = 'PIN 재설정'; return; }
          lockClear(uid);
          const next = { ...mfa, pin: await hashSecret(form.pin.value), recovery: mfa.recovery.filter((x) => x !== hash) };
          await backend.updateProfile(uid, { mfa: { pin: next.pin, recovery: next.recovery } });
          Audio.sfx('report'); await ctx.verified({ ...profile, mfa: next }, { viaRecovery: true });
          setTimeout(() => ctx.toast(`PIN 을 재설정했습니다. 남은 복구 코드 ${next.recovery.length}개`, 'alert'), 400); return;
        }
      }
      const s = lockFail(uid); Audio.sfx('error');
      err.textContent = s.remaining > 0 ? `확인 실패. ${s.remaining}초 후 다시 시도하세요.` : `${reset ? '복구 코드가' : 'PIN이'} 올바르지 않습니다. (남은 시도 ${Math.max(0, 5 - s.fails)}회)`;
      if (s.remaining > 0) tick();
    } catch (ex) { err.textContent = ex.userMessage || ex.message; Audio.sfx('error'); }
    submit.dataset.busy = ''; submit.disabled = lockState(uid).remaining > 0; submit.textContent = reset ? 'PIN 재설정' : '확인';
  });
  root.append(frame({ kicker: 'SECURITY / VERIFY', title: '2차 보안 확인', sub: `${ctx.user.nick} — 보안 PIN 을 입력하세요.`, body: form }));
  paint(); tick();
}
