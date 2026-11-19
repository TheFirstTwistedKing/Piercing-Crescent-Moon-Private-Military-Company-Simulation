import '@fontsource-variable/noto-sans-kr/wght.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './styles.css';
import { initBackend, backend, getBackend } from './core/backend.js';
import * as Audio from './core/audio.js';
import { h, toast, $ } from './core/ui.js';
import { playIntro } from './screens/intro.js';
import { mountLogin, mountSignup } from './screens/auth.js';
import { mountSetup, mountVerify } from './screens/twofa.js';
import { mountPanel } from './screens/panel.js';
import { mountCctv } from './screens/cctv.js';
import { mountField } from './screens/field.js';
import { mountReport } from './screens/report.js';
import { engine } from './game/engine.js';

import * as Session from './core/session.js';
import { deviceId } from './core/device.js';
import { mountDevice, registerCurrentDevice, promptApproval } from './screens/device.js';
import { modal } from './core/ui.js';

// 인증 상태는 메모리에만 둔다 → 앱을 닫았다 열면(=새로 로드) 항상 인트로 + 2차 보안 확인이 다시 필요하다.
const S = { user: null, profile: null, verified: false, deviceOk: false, cleanup: null, booting: true, watch: 0, lastKey: '' };
const app = $('#app');

async function checkDevice(viaRecovery) {
  const uid = S.user.uid, id = deviceId();
  if (await backend.getDevice(uid, id)) { backend.putDevice(uid, id, { lastSeen: Date.now() }).catch(() => {}); return true; }
  const list = await backend.listDevices(uid);
  if (list.length === 0 || viaRecovery) { await registerCurrentDevice(uid, { replaceOldest: true }); return true; } // 첫 기기이거나 복구 코드로 증명한 경우
  return false;
}

const ctx = {
  get user() { return S.user; }, get profile() { return S.profile; }, get backendLabel() { return getBackend()?.label || ''; },
  go: (hash) => { if (location.hash === hash) return route(true); location.hash = hash; },
  toast,
  async signedIn(user) { S.user = user; S.profile = await backend.getProfile(user.uid); S.verified = false; S.deviceOk = false; location.hash = S.profile?.mfa?.enabled ? '#/verify' : '#/setup'; route(); },
  async signedUp(user) { S.user = user; S.profile = await backend.getProfile(user.uid); S.verified = false; S.deviceOk = false; location.hash = '#/setup'; route(); },
  async mfaDone(profile) { S.profile = profile; S.verified = true; await registerCurrentDevice(S.user.uid, { replaceOldest: true }); S.deviceOk = true; location.hash = '#/panel'; route(); },
  async verified(profile, opts = {}) { S.profile = profile; S.verified = true; S.deviceOk = await checkDevice(!!opts.viaRecovery); location.hash = S.deviceOk ? '#/panel' : '#/device'; route(); },
  async deviceApproved() { S.deviceOk = true; location.hash = '#/panel'; route(); },
  async logout() { await resetSession(); try { await backend.signOut(); } catch { /* ignore */ } S.user = S.profile = null; S.verified = S.deviceOk = false; location.hash = '#/login'; route(); },
};

async function resetSession(save = true) {
  clearInterval(S.watch); S.watch = 0;
  if (save) { try { await engine.save(); } catch { /* ignore */ } }
  Session.stop(); engine.stop();
}

// 동시 접속 1곳: 다른 곳에서 로그인했거나 이 기기가 삭제되면 저장 없이 즉시 종료
async function onSessionLost(reason, info) {
  await resetSession(false);
  try { await backend.signOut(); } catch { /* ignore */ }
  S.user = S.profile = null; S.verified = S.deviceOk = false; location.hash = '#/login'; route(true);
  modal({ title: '접속이 종료되었습니다', dismiss: false, actions: [{ label: '확인', kind: 'primary' }],
    body: reason === 'replaced' ? `다른 기기(${info?.name || '알 수 없음'})에서 이 계정으로 로그인했습니다. 한 계정은 한 곳에서만 접속할 수 있습니다.` : '이 기기의 등록이 해제되었습니다. 다시 로그인하면 기기 승인이 필요합니다.' });
}

// 새 기기의 승인 요청을 주기적으로 확인(등록된 기기에서만 동작)
function startWatch() {
  clearInterval(S.watch); let busy = false;
  S.watch = setInterval(async () => {
    if (busy || document.hidden || !S.user || !S.deviceOk) return; busy = true;
    try {
      const me = deviceId();
      for (const r of await backend.listRequests(S.user.uid)) {
        if (r.id === me) continue;
        if (Date.now() - (r.createdAt || 0) > 10 * 60 * 1000) { await backend.delRequest(S.user.uid, r.id); continue; }
        Audio.sfx('notify'); await promptApproval(ctx, r); break;
      }
    } catch { /* 다음 주기에 재시도 */ }
    busy = false;
  }, 5000);
}

const PANEL = { '#/panel': mountPanel, '#/panel/cctv': mountCctv, '#/panel/field': mountField, '#/panel/report': mountReport };

let chain = Promise.resolve();
function route(force = false) { chain = chain.then(() => doRoute(force)).catch((e) => console.error(e)); return chain; }

async function doRoute(force) {
  if (S.booting) return;
  let hash = location.hash || '#/login';
  let mount;
  if (!S.user) { hash = hash === '#/signup' ? '#/signup' : '#/login'; mount = hash === '#/signup' ? mountSignup : mountLogin; }
  else if (!S.profile?.mfa?.enabled) { hash = '#/setup'; mount = mountSetup; }
  else if (!S.verified) { hash = '#/verify'; mount = mountVerify; }
  else if (!S.deviceOk) { hash = '#/device'; mount = mountDevice; }
  else { if (!PANEL[hash]) hash = '#/panel'; mount = PANEL[hash]; }
  if (location.hash !== hash) history.replaceState(null, '', hash);
  const key = `${hash}|${S.user?.uid}|${S.verified}|${S.deviceOk}`;
  if (!force && key === S.lastKey) return;
  S.lastKey = key;

  S.cleanup?.(); S.cleanup = null;
  const root = h('div', { class: 'view' });
  if (S.user && S.verified && S.deviceOk && !Session.active()) {
    app.replaceChildren(h('div', { class: 'loading screen' }, h('span', {}, '접속 확인 중…')));
    try { await Session.start(S.user.uid, onSessionLost); startWatch(); } catch (e) { toast(e.userMessage || e.message, 'bad'); }
  }
  if (S.user && S.verified && S.deviceOk && !engine.running) { app.replaceChildren(h('div', { class: 'loading screen' }, h('span', {}, '데이터 동기화 중…'))); await engine.start(S.user.uid); }
  app.replaceChildren(root);
  S.cleanup = mount(root, ctx) || null;
  document.body.dataset.screen = hash.replace('#/', '').replace('/', '-');
}
addEventListener('hashchange', () => route());

// 엔진 이벤트 → 토스트 (한 번만 등록)
engine.onToast((e) => { if (e.kind !== 'quiet') toast(e.text, e.kind === 'info' ? 'info' : e.kind); });

// 네이티브(apk): 앱을 벗어났다 3초 이상 지나 돌아오면 새로 시작 → 인트로 재생 + 2차 보안 재확인
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  const native = !!window.Capacitor?.isNativePlatform?.();
  if (document.hidden) hiddenAt = Date.now();
  else if (native && hiddenAt && Date.now() - hiddenAt > 3000) location.reload();
});

(async function boot() {
  await initBackend();
  await playIntro(app);
  document.body.classList.add('holo-on');
  S.user = await backend.ready();
  if (S.user) S.profile = await backend.getProfile(S.user.uid).catch(() => null);
  S.booting = false;
  route();
})();
