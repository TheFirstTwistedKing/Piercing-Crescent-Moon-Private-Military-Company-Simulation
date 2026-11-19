// 2차 보안: 인증 앱(TOTP) + 6자리 PIN. 최초 로그인(또는 가입 직후) 설정 → 이후 접속마다 확인.
// ⚠ 한계: 검증이 앱(클라이언트) 안에서 이뤄지고 비밀값이 Firestore 의 본인 문서에 저장되므로,
//   비밀번호까지 탈취한 공격자가 직접 Firestore 를 읽을 수 있다면 우회될 수 있다. (Firebase 공식 MFA 대비 방어력은 낮음)
import QRCode from 'qrcode';
import { backend } from '../core/backend.js';
import * as Audio from '../core/audio.js';
import { randomSecret, otpauthUri, verifyTotp } from '../core/totp.js';
import { hashSecret, verifySecret, sha256Hex, makeRecoveryCodes, normalizeRecovery, lockState, lockFail, lockClear } from '../core/crypto.js';
import { h } from '../core/ui.js';

const ISSUER = 'PCM-PMC';
const digitsOnly = (el, n = 6) => el.addEventListener('input', () => { el.value = el.value.replace(/\D/g, '').slice(0, n); });
const codeInput = (id, label, { secret = false, hint } = {}) => {
  const input = h('input', { id, name: id, type: secret ? 'password' : 'text', inputmode: 'numeric', autocomplete: secret ? 'off' : 'one-time-code', maxlength: 6, pattern: '[0-9]*', placeholder: '••••••', class: 'code', required: true });
  digitsOnly(input);
  return h('label', { class: 'f', for: id }, h('span', { class: 'f-label' }, label), input, hint && h('span', { class: 'f-hint' }, hint));
};
export const frame = ({ kicker, title, sub, body, step }) => h('main', { class: 'auth screen twofa' },
  h('section', { class: 'auth-aside' }, h('img', { class: 'auth-mark', src: 'img/logo.png', alt: '' }),
    step && h('ol', { class: 'steps' }, ...step.list.map((s, i) => h('li', { class: i === step.at ? 'on' : i < step.at ? 'done' : '' }, h('b', {}, String(i + 1).padStart(2, '0')), s)))),
  h('section', { class: 'auth-main' }, h('div', { class: 'auth-head' }, h('p', { class: 'eyebrow' }, kicker), h('h2', {}, title), h('p', { class: 'lede' }, sub)), body));

/* ───────────── 최초 설정 ───────────── */
export function mountSetup(root, ctx) {
  const STEPS = ['보안 PIN', '인증 앱', '복구 코드'];
  const st = { pin: null, secret: randomSecret(), recovery: makeRecoveryCodes(8) };
  const render = (fn) => { root.replaceChildren(fn()); };

  const stepPin = () => {
    const err = h('p', { class: 'err', role: 'alert' });
    const form = h('form', { class: 'form', novalidate: true },
      codeInput('pin', '6자리 PIN', { secret: true, hint: '로그인할 때마다 입력합니다. 생일·연속 숫자는 피하세요.' }), codeInput('pin2', 'PIN 확인', { secret: true }), err,
      h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'submit' }, '다음')));
    form.addEventListener('submit', (e) => {
      e.preventDefault(); const a = form.pin.value, b = form.pin2.value;
      if (!/^\d{6}$/.test(a)) { err.textContent = 'PIN은 숫자 6자리여야 합니다.'; Audio.sfx('error'); return; }
      if (/^(\d)\1{5}$/.test(a) || '0123456789012345'.includes(a) || '9876543210987654'.includes(a)) { err.textContent = '너무 쉬운 PIN입니다. 다른 숫자를 사용하세요.'; Audio.sfx('error'); return; }
      if (a !== b) { err.textContent = 'PIN 확인이 일치하지 않습니다.'; Audio.sfx('error'); return; }
      st.pin = a; Audio.sfx('confirm'); render(stepTotp);
    });
    setTimeout(() => form.pin.focus(), 60);
    return frame({ kicker: 'SECURITY / 01', title: '보안 PIN 설정', sub: '계정 비밀번호와 별개로, 접속할 때 매번 확인하는 6자리 숫자입니다.', body: form, step: { list: STEPS, at: 0 } });
  };

  const stepTotp = () => {
    const uri = otpauthUri({ secret: st.secret, account: ctx.user.email || ctx.user.nick, issuer: ISSUER });
    const qr = h('img', { class: 'qr', alt: '인증 앱용 QR 코드', width: 208, height: 208 });
    QRCode.toDataURL(uri, { margin: 2, width: 208, color: { dark: '#000000', light: '#ffffff' } }).then((u) => { qr.src = u; }).catch(() => { qr.alt = 'QR 생성 실패 — 아래 키를 직접 입력하세요'; });
    const err = h('p', { class: 'err', role: 'alert' });
    const form = h('form', { class: 'form', novalidate: true }, codeInput('code', '인증 앱에 표시된 6자리 코드', { hint: '코드는 30초마다 바뀝니다.' }), err,
      h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'submit' }, '확인'), h('button', { class: 'link', type: 'button', onclick: () => render(stepPin) }, '← PIN 다시 설정')));
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); err.textContent = '';
      const step = await verifyTotp(st.secret, form.code.value);
      if (step == null) { err.textContent = '코드가 일치하지 않습니다. 기기 시간이 정확한지, 방금 코드인지 확인하세요.'; Audio.sfx('error'); return; }
      st.step = step; Audio.sfx('confirm'); render(stepRecovery);
    });
    const body = h('div', { class: 'totp-setup' },
      h('div', { class: 'qrbox' }, qr),
      h('div', { class: 'qrtext' }, h('p', {}, 'Google Authenticator · Microsoft Authenticator · Authy 등에서 QR 을 스캔하거나, 아래 키를 직접 입력하세요.'),
        h('code', { class: 'secret', 'aria-label': '수동 입력 키' }, st.secret.match(/.{1,4}/g).join(' '))), form);
    return frame({ kicker: 'SECURITY / 02', title: '인증 앱 연결', sub: '인증 앱에 계정을 추가하고, 표시되는 코드로 연결을 확인합니다.', body, step: { list: STEPS, at: 1 } });
  };

  const stepRecovery = () => {
    const err = h('p', { class: 'err', role: 'alert' });
    const chk = h('input', { type: 'checkbox', id: 'saved' });
    const finish = h('button', { class: 'btn primary', type: 'button', disabled: true }, '설정 완료');
    chk.addEventListener('change', () => { finish.disabled = !chk.checked; });
    finish.addEventListener('click', async () => {
      finish.disabled = true; finish.textContent = '저장 중…';
      try {
        const mfa = { enabled: true, pin: await hashSecret(st.pin), totp: { secret: st.secret }, lastStep: st.step ?? -1, recovery: await Promise.all(st.recovery.map((c) => sha256Hex('rc:' + c))), createdAt: Date.now() };
        await backend.updateProfile(ctx.user.uid, { mfa });
        Audio.sfx('report'); await ctx.mfaDone({ ...(ctx.profile || {}), mfa });
      } catch (ex) { err.textContent = '저장 실패: ' + (ex.userMessage || ex.message); finish.disabled = false; finish.textContent = '설정 완료'; Audio.sfx('error'); }
    });
    const list = h('ul', { class: 'codes' }, ...st.recovery.map((c) => h('li', {}, c)));
    const body = h('div', { class: 'form' }, list,
      h('div', { class: 'row' }, h('button', { class: 'btn ghost', type: 'button', onclick: async (e) => { try { await navigator.clipboard.writeText(st.recovery.join('\n')); e.target.textContent = '복사됨'; } catch { e.target.textContent = '복사 불가 — 직접 적어두세요'; } } }, '복사')),
      h('label', { class: 'check' }, chk, h('span', {}, '복구 코드를 안전한 곳에 보관했습니다. (인증 앱을 잃어버렸을 때 코드 대신 1회용으로 사용 · 이 화면은 다시 볼 수 없음)')), err, h('div', { class: 'row' }, finish));
    return frame({ kicker: 'SECURITY / 03', title: '복구 코드 보관', sub: '인증 앱 기기를 잃어버렸을 때를 대비한 1회용 코드 8개입니다.', body, step: { list: STEPS, at: 2 } });
  };
  render(stepPin);
}

/* ───────────── 접속 시 확인 ───────────── */
export function mountVerify(root, ctx) {
  let recovery = false;
  const err = h('p', { class: 'err', role: 'alert' });
  const codeWrap = h('div', {});
  const pinF = codeInput('pin', '보안 PIN', { secret: true });
  const submit = h('button', { class: 'btn primary', type: 'submit' }, '확인');
  const form = h('form', { class: 'form', novalidate: true }, codeWrap, pinF, err,
    h('div', { class: 'row' }, submit, h('button', { class: 'link', type: 'button', onclick: () => ctx.logout() }, '다른 계정으로 로그인')),
    h('button', { class: 'link sub', type: 'button', id: 'toggle' }, ''));
  const paint = () => {
    codeWrap.replaceChildren(recovery
      ? h('label', { class: 'f', for: 'rc' }, h('span', { class: 'f-label' }, '복구 코드 (1회용)'), h('input', { id: 'rc', name: 'rc', autocomplete: 'off', placeholder: 'XXXX-XXXX', maxlength: 9, spellcheck: 'false', required: true }))
      : codeInput('code', '인증 앱 6자리 코드'));
    form.querySelector('#toggle').textContent = recovery ? '← 인증 앱 코드로 확인' : '인증 앱을 사용할 수 없나요? 복구 코드 사용';
    setTimeout(() => (recovery ? form.rc : form.code).focus(), 30);
  };
  form.querySelector('#toggle').addEventListener('click', () => { recovery = !recovery; err.textContent = ''; paint(); });
  const tick = () => { const s = lockState(ctx.user.uid); if (s.remaining > 0) { err.textContent = `시도가 너무 많습니다. ${s.remaining}초 후 다시 시도하세요.`; submit.disabled = true; setTimeout(tick, 1000); } else if (submit.disabled && !submit.dataset.busy) { submit.disabled = false; err.textContent = ''; } };
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); err.textContent = '';
    const uid = ctx.user.uid; const ls = lockState(uid); if (ls.remaining > 0) { tick(); return; }
    submit.disabled = true; submit.dataset.busy = '1'; submit.textContent = '확인 중…';
    try {
      const profile = await backend.getProfile(uid); const mfa = profile?.mfa;
      if (!mfa?.enabled) { await ctx.go('#/setup'); return; }
      let okFactor = false, stepUsed = null, usedRecovery = null;
      if (recovery) {
        const norm = normalizeRecovery(form.rc.value); const hash = await sha256Hex('rc:' + norm);
        if (/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(norm) && (mfa.recovery || []).includes(hash)) { okFactor = true; usedRecovery = hash; }
      } else { stepUsed = await verifyTotp(mfa.totp.secret, form.code.value, { minStep: mfa.lastStep ?? -1 }); okFactor = stepUsed != null; }
      const okPin = await verifySecret(form.pin.value, mfa.pin);
      if (okFactor && okPin) {
        lockClear(uid);
        const patch = {}; if (stepUsed != null) patch.lastStep = stepUsed;
        if (usedRecovery) patch.recovery = mfa.recovery.filter((x) => x !== usedRecovery);
        if (Object.keys(patch).length) await backend.updateProfile(uid, { mfa: patch }).catch(() => {});
        Audio.sfx('confirm'); await ctx.verified(profile, { viaRecovery: !!usedRecovery });
        if (usedRecovery) setTimeout(() => ctx.toast(`복구 코드를 사용했습니다. 남은 코드 ${patch.recovery.length}개`, 'alert'), 400);
        return;
      }
      const s = lockFail(uid); Audio.sfx('error');
      err.textContent = s.remaining > 0 ? `확인 실패. ${s.remaining}초 후 다시 시도하세요.` : `코드 또는 PIN 이 올바르지 않습니다. (남은 시도 ${Math.max(0, 5 - s.fails)}회)`;
      if (s.remaining > 0) tick();
    } catch (ex) { err.textContent = ex.userMessage || ex.message; Audio.sfx('error'); }
    submit.dataset.busy = ''; submit.disabled = lockState(uid).remaining > 0; submit.textContent = '확인';
  });
  root.append(frame({ kicker: 'SECURITY / VERIFY', title: '2차 보안 확인', sub: `${ctx.user.nick} — 인증 앱의 코드와 보안 PIN 을 입력하세요.`, body: form }));
  paint(); tick();
}
