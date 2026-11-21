// 이메일 인증 대기 화면. 이 기능 이후 가입한 계정(profile.verifyEmail)만 거친다. 인증 링크를 누른 뒤 '인증 완료 확인'으로 진행.
import { backend, koError } from '../core/backend.js';
import * as Audio from '../core/audio.js';
import { h } from '../core/ui.js';
import { frame } from './twofa.js';

const COOLDOWN = 60;

export function mountEmailVerify(root, ctx) {
  let left = 0, timer = 0, polling = 0;
  const msg = h('p', { class: 'err', role: 'status' });
  const say = (text, ok = false) => { msg.className = ok ? 'err ok' : 'err'; msg.textContent = text; };
  const check = h('button', { class: 'btn primary', type: 'button' }, '인증 완료 확인');
  const resend = h('button', { class: 'btn ghost', type: 'button' }, '인증 메일 다시 보내기');

  const tick = () => {
    resend.disabled = left > 0; resend.textContent = left > 0 ? `다시 보내기 (${left}초)` : '인증 메일 다시 보내기';
    if (left > 0) { left--; timer = setTimeout(tick, 1000); }
  };
  const cool = () => { clearTimeout(timer); left = COOLDOWN; tick(); };

  const verifyNow = async (quiet) => {
    try {
      const u = await backend.reloadUser();
      if (u?.verified) { clearInterval(polling); Audio.sfx('confirm'); await ctx.emailVerified(u); return; }
      if (!quiet) { say('아직 인증되지 않았습니다. 메일의 링크를 누른 뒤 다시 확인하세요.'); Audio.sfx('error'); }
    } catch (e) { if (!quiet) say(koError(e)); }
  };
  check.addEventListener('click', async () => { check.disabled = true; await verifyNow(false); check.disabled = false; });
  resend.addEventListener('click', async () => {
    resend.disabled = true;
    try { await backend.sendVerification(); say('인증 메일을 다시 보냈습니다. 스팸함도 확인하세요.', true); Audio.sfx('confirm'); cool(); }
    catch (e) { say(koError(e)); Audio.sfx('error'); tick(); }
  });

  const body = h('div', { class: 'form' },
    h('p', { class: 'f-label' }, '인증 메일을 보낸 주소'), h('code', { class: 'secret' }, ctx.user.email),
    h('p', { class: 'hint', style: 'margin:12px 0 20px' }, '메일함에서 인증 링크를 누르면 이 화면이 자동으로 다음 단계로 넘어갑니다. 넘어가지 않으면 아래 버튼을 누르세요.'),
    msg,
    h('div', { class: 'row' }, check, resend),
    h('button', { class: 'link sub', type: 'button', onclick: () => ctx.logout() }, '다른 계정으로 로그인'));
  root.append(frame({ kicker: 'ACCESS / 이메일 인증', title: '이메일을 인증하세요', sub: '계정을 보호하기 위해 가입한 이메일이 본인 것인지 확인합니다.', body }));

  cool(); // 가입 직후 메일이 이미 발송됐으므로 쿨다운부터 시작
  polling = setInterval(() => { if (!document.hidden) verifyNow(true); }, 5000);
  return () => { clearTimeout(timer); clearInterval(polling); };
}
