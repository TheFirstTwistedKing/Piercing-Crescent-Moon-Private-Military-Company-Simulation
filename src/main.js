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

// 인증 상태는 메모리에만 둔다 → 앱을 닫았다 열면(=새로 로드) 항상 인트로 + 2차 보안 확인이 다시 필요하다.
const S = { user: null, profile: null, verified: false, cleanup: null, booting: true };
const app = $('#app');

const ctx = {
  get user() { return S.user; }, get profile() { return S.profile; }, get backendLabel() { return getBackend()?.label || ''; },
  go: (hash) => { if (location.hash === hash) return route(); location.hash = hash; },
  toast,
  async signedIn(user) { S.user = user; S.profile = await backend.getProfile(user.uid); S.verified = false; location.hash = S.profile?.mfa?.enabled ? '#/verify' : '#/setup'; route(); },
  async signedUp(user) { S.user = user; S.profile = await backend.getProfile(user.uid); S.verified = false; location.hash = '#/setup'; route(); },
  async mfaDone(profile) { S.profile = profile; S.verified = true; location.hash = '#/panel'; route(); },
  async verified(profile) { S.profile = profile; S.verified = true; location.hash = '#/panel'; route(); },
  async logout() { try { await engine.save(); } catch { /* ignore */ } engine.stop(); await backend.signOut(); S.user = S.profile = null; S.verified = false; location.hash = '#/login'; route(); },
};

const PANEL = { '#/panel': mountPanel, '#/panel/cctv': mountCctv, '#/panel/field': mountField, '#/panel/report': mountReport };

async function route() {
  if (S.booting) return;
  let hash = location.hash || '#/login';
  let mount;
  if (!S.user) { hash = hash === '#/signup' ? '#/signup' : '#/login'; mount = hash === '#/signup' ? mountSignup : mountLogin; }
  else if (!S.profile?.mfa?.enabled) { hash = '#/setup'; mount = mountSetup; }
  else if (!S.verified) { hash = '#/verify'; mount = mountVerify; }
  else { if (!PANEL[hash]) hash = '#/panel'; mount = PANEL[hash]; }
  if (location.hash !== hash) history.replaceState(null, '', hash);

  S.cleanup?.(); S.cleanup = null;
  const root = h('div', { class: 'view' });
  if (S.user && S.verified) {
    if (!engine.running) { app.replaceChildren(h('div', { class: 'loading screen' }, h('span', {}, '데이터 동기화 중…'))); await engine.start(S.user.uid); }
  }
  app.replaceChildren(root);
  S.cleanup = mount(root, ctx) || null;
  document.body.dataset.screen = hash.replace('#/', '').replace('/', '-');
}
addEventListener('hashchange', route);

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
