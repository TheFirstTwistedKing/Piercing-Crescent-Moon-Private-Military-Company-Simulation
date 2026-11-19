// 기기 등록: 처음 쓰는 기기는 이미 등록된 기기에서 승인해야 로그인된다. (복구 코드로도 등록 가능)
// ⚠ 한계: 이 검사는 앱(클라이언트) 안에서 이뤄진다. Firestore 를 직접 조작할 수 있는 기술적 공격자는 우회할 수 있다.
import { backend } from '../core/backend.js';
import * as Audio from '../core/audio.js';
import { deviceId, deviceLabel, MAX_DEVICES } from '../core/device.js';
import { sha256Hex, normalizeRecovery, lockState, lockFail, lockClear } from '../core/crypto.js';
import { frame } from './twofa.js';
import { h, modal, toast, icon } from '../core/ui.js';

const fmtCode = (c) => String(c).replace(/^(\d{3})(\d{3})$/, '$1 $2');
const fmtDate = (t) => (t ? new Date(t).toLocaleDateString('ko-KR') : '—');

export async function registerCurrentDevice(uid, { replaceOldest = false } = {}) {
  const list = await backend.listDevices(uid);
  if (list.length >= MAX_DEVICES && replaceOldest) { list.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0)); await backend.delDevice(uid, list[0].id); }
  await backend.putDevice(uid, deviceId(), { name: deviceLabel(), addedAt: Date.now(), lastSeen: Date.now() });
}

/** 새 기기 화면: 승인 요청을 올리고 기다린다 */
export function mountDevice(root, ctx) {
  const uid = ctx.user.uid, id = deviceId();
  const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  let stopped = false, timer = 0;
  const status = h('p', { class: 'lede', role: 'status' }, '승인을 기다리는 중…');
  const retry = h('button', { class: 'btn ghost', type: 'button', hidden: true }, '다시 요청');
  const post = async () => { await backend.putRequest(uid, id, { name: deviceLabel(), code, createdAt: Date.now() }); };
  const poll = async () => {
    if (stopped) return;
    try {
      if (await backend.getDevice(uid, id)) { stopped = true; await ctx.deviceApproved(); return; }
      if (!(await backend.getRequest(uid, id))) { status.textContent = '요청이 거부되었거나 만료되었습니다.'; retry.hidden = false; return; }
    } catch { /* 일시 오류는 재시도 */ }
    timer = setTimeout(poll, 2500);
  };
  const begin = () => { retry.hidden = true; status.textContent = '승인을 기다리는 중…'; post().then(() => { timer = setTimeout(poll, 2500); }).catch((e) => { status.textContent = e.userMessage || e.message; }); };
  retry.addEventListener('click', begin);

  const err = h('p', { class: 'err', role: 'alert' });
  const form = h('form', { class: 'form', novalidate: true },
    h('label', { class: 'f', for: 'rc' }, h('span', { class: 'f-label' }, '복구 코드 (1회용)'), h('input', { id: 'rc', name: 'rc', autocomplete: 'off', placeholder: 'XXXX-XXXX', maxlength: 9, spellcheck: 'false', required: true })), err,
    h('button', { class: 'btn ghost', type: 'submit' }, '복구 코드로 이 기기 등록'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); err.textContent = '';
    const key = 'dev:' + uid; const ls = lockState(key); if (ls.remaining > 0) { err.textContent = `시도가 너무 많습니다. ${ls.remaining}초 후 다시 시도하세요.`; return; }
    try {
      const prof = await backend.getProfile(uid); const hash = await sha256Hex('rc:' + normalizeRecovery(form.rc.value));
      if (!(prof?.mfa?.recovery || []).includes(hash)) { const s = lockFail(key); Audio.sfx('error'); err.textContent = s.remaining > 0 ? `${s.remaining}초 후 다시 시도하세요.` : '복구 코드가 올바르지 않습니다.'; return; }
      lockClear(key); stopped = true; clearTimeout(timer);
      await backend.updateProfile(uid, { mfa: { recovery: prof.mfa.recovery.filter((x) => x !== hash) } });
      await registerCurrentDevice(uid, { replaceOldest: true }); await backend.delRequest(uid, id).catch(() => {});
      Audio.sfx('confirm'); toast(`복구 코드를 사용했습니다. 남은 코드 ${prof.mfa.recovery.length - 1}개`, 'alert'); await ctx.deviceApproved();
    } catch (ex) { err.textContent = ex.userMessage || ex.message; }
  });

  const body = h('div', { class: 'form' }, status,
    h('p', { class: 'f-label', style: 'margin-top:24px' }, '이 기기의 확인 코드'), h('code', { class: 'secret devcode' }, fmtCode(code)),
    h('p', { class: 'hint', style: 'margin:12px 0 24px' }, `이미 등록된 기기에서 앱을 열면 승인 요청이 표시됩니다. 두 화면의 코드가 같은지 확인하고 승인하세요. (${deviceLabel()})`),
    h('div', { class: 'row' }, retry, h('button', { class: 'link', type: 'button', onclick: async () => { stopped = true; clearTimeout(timer); await backend.delRequest(uid, id).catch(() => {}); ctx.logout(); } }, '취소하고 로그아웃')),
    h('details', { class: 'more' }, h('summary', {}, '등록된 기기를 쓸 수 없나요?'), form));
  root.append(frame({ kicker: 'DEVICE / 승인 필요', title: '새 기기입니다', sub: '이 계정은 등록된 기기에서만 접속할 수 있습니다. 등록된 기기에서 이 기기를 승인해 주세요.', body }));
  begin();
  return () => { stopped = true; clearTimeout(timer); };
}

/** 등록된 기기에 뜨는 승인 요청 창 */
export function promptApproval(ctx, req) {
  return new Promise((resolve) => {
    const uid = ctx.user.uid;
    modal({
      title: '새 기기 로그인 요청', dismiss: false,
      body: h('div', {}, h('p', {}, `“${req.name}” 에서 이 계정으로 로그인하려 합니다. 그 기기에 표시된 확인 코드가 아래와 같을 때만 승인하세요. 모르는 기기라면 거부하세요.`), h('code', { class: 'secret devcode' }, fmtCode(req.code))),
      actions: [
        { label: '거부', onClick: async () => { await backend.delRequest(uid, req.id).catch(() => {}); resolve(); } },
        { label: '승인', kind: 'primary', keep: true, onClick: async (close) => {
          try {
            if ((await backend.listDevices(uid)).length >= MAX_DEVICES) { toast(`기기는 최대 ${MAX_DEVICES}대까지입니다. 목록에서 먼저 삭제하세요.`, 'bad'); return; }
            await backend.putDevice(uid, req.id, { name: req.name, addedAt: Date.now(), lastSeen: 0 }); await backend.delRequest(uid, req.id);
            Audio.sfx('confirm'); toast(`${req.name} 을(를) 등록했습니다.`, 'good'); close(); resolve();
          } catch (e) { toast(e.userMessage || e.message, 'bad'); }
        } },
      ],
    });
  });
}

/** 등록 기기 목록 / 삭제 */
export function openDeviceManager(ctx) {
  const uid = ctx.user.uid, me = deviceId();
  const list = h('ul', { class: 'devs' });
  const render = async () => {
    try {
      const devs = (await backend.listDevices(uid)).sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
      list.replaceChildren(...devs.map((d) => h('li', {}, h('div', {}, h('b', {}, d.name + (d.id === me ? ' (이 기기)' : '')), h('small', {}, `등록 ${fmtDate(d.addedAt)} · 최근 ${fmtDate(d.lastSeen)}`)),
        d.id === me ? null : h('button', { class: 'btn ghost sm', type: 'button', onclick: async () => { await backend.delDevice(uid, d.id); Audio.sfx('confirm'); toast('기기를 삭제했습니다. 해당 기기는 곧 접속이 종료됩니다.', 'alert'); render(); } }, '삭제'))));
    } catch (e) { list.replaceChildren(h('li', {}, e.userMessage || e.message)); }
  };
  modal({ title: '등록된 기기', body: h('div', {}, h('p', { class: 'hint', style: 'margin-bottom:12px' }, `최대 ${MAX_DEVICES}대. 삭제한 기기는 다시 로그인할 때 승인이 필요합니다.`), list), actions: [{ label: '닫기', kind: 'primary' }] });
  render();
}
export { icon };
