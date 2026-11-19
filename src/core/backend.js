// 백엔드 추상화: Firebase(Auth + Firestore) 또는 "로컬 시험 모드"(localStorage).
// 로컬 모드는 Firebase 설정값이 비어 있을 때만 켜지며, UI 에 항상 표시된다. (계정이 이 기기 안에만 존재)
import { firebaseConfig, isFirebaseConfigured } from '../config/firebase-config.js';
import { hashSecret, verifySecret } from './crypto.js';

let impl = null;
export const backend = new Proxy({}, { get: (_, k) => (impl ? impl[k] : undefined) });
export const getBackend = () => impl;

export async function initBackend() {
  impl = isFirebaseConfigured ? await makeFirebase() : makeLocal();
  return impl;
}

const KO_ERR = {
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/wrong-password': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/user-not-found': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
  'auth/email-already-in-use': '이미 가입된 이메일입니다.',
  'auth/weak-password': '비밀번호가 너무 약합니다. (6자 이상, 8자 이상 권장)',
  'auth/too-many-requests': '시도가 너무 많습니다. 잠시 후 다시 시도하세요.',
  'auth/network-request-failed': '네트워크 연결을 확인하세요.',
  'auth/operation-not-allowed': 'Firebase 콘솔에서 이메일/비밀번호 로그인이 비활성화되어 있습니다.',
  'auth/user-disabled': '비활성화된 계정입니다.',
  'permission-denied': '권한이 없습니다. Firestore 보안 규칙을 확인하세요.',
  unavailable: '서버에 연결할 수 없습니다.',
};
export const koError = (e) => KO_ERR[e?.code] || e?.userMessage || `오류: ${e?.code || e?.message || e}`;

/* ───────────────────────── Firebase ───────────────────────── */
async function makeFirebase() {
  const { initializeApp } = await import('firebase/app');
  const A = await import('firebase/auth');
  const F = await import('firebase/firestore');
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const db = F.initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  const toUser = (u) => (u ? { uid: u.uid, email: u.email, nick: u.displayName || (u.email || '').split('@')[0] } : null);
  const wrap = async (fn) => { try { return await fn(); } catch (e) { e.userMessage = koError(e); throw e; } };
  const gameRef = (uid) => F.doc(db, 'users', uid, 'data', 'game');

  return {
    mode: 'firebase',
    label: 'FIREBASE',
    ready: () => new Promise((res) => { const off = A.onAuthStateChanged(auth, (u) => { off(); res(toUser(u)); }); }),
    current: () => toUser(auth.currentUser),
    signUp: ({ email, password, nick }) => wrap(async () => {
      const cred = await A.createUserWithEmailAndPassword(auth, email, password);
      await A.updateProfile(cred.user, { displayName: nick });
      await F.setDoc(F.doc(db, 'users', cred.user.uid), { nick, email, createdAt: F.serverTimestamp() }, { merge: true });
      return toUser(auth.currentUser);
    }),
    signIn: ({ email, password }) => wrap(async () => toUser((await A.signInWithEmailAndPassword(auth, email, password)).user)),
    signOut: () => wrap(() => A.signOut(auth)),
    resetPassword: (email) => wrap(() => A.sendPasswordResetEmail(auth, email)),
    getProfile: (uid) => wrap(async () => { const s = await F.getDoc(F.doc(db, 'users', uid)); return s.exists() ? s.data() : null; }),
    updateProfile: (uid, patch) => wrap(() => F.setDoc(F.doc(db, 'users', uid), patch, { merge: true })),
    loadGame: (uid) => wrap(async () => { const s = await F.getDoc(gameRef(uid)); return s.exists() ? JSON.parse(s.data().json) : null; }),
    saveGame: (uid, state) => wrap(() => F.setDoc(gameRef(uid), { json: JSON.stringify(state), updatedAt: F.serverTimestamp() })),
    submitReport: (uid, report) => wrap(() => F.setDoc(F.doc(db, 'users', uid, 'reports', String(report.day).padStart(4, '0')), { json: JSON.stringify(report), day: report.day, createdAt: F.serverTimestamp() })),
    listReports: (uid, n = 14) => wrap(async () => {
      const q = F.query(F.collection(db, 'users', uid, 'reports'), F.orderBy('day', 'desc'), F.limit(n));
      return (await F.getDocs(q)).docs.map((d) => JSON.parse(d.data().json));
    }),
  };
}

/* ───────────────────────── 로컬 시험 모드 ───────────────────────── */
function makeLocal() {
  const KEY = 'pcm.local.v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));
  const db = () => { const d = load(); d.users ||= {}; d.profiles ||= {}; d.games ||= {}; d.reports ||= {}; return d; };
  const fail = (code, msg) => Object.assign(new Error(msg), { code, userMessage: msg });
  const pub = (u) => (u ? { uid: u.uid, email: u.email, nick: u.nick } : null);

  return {
    mode: 'local',
    label: 'LOCAL TEST',
    ready: async () => { const d = db(); return pub(d.users[d.session]); },
    current: () => { const d = db(); return pub(d.users[d.session]); },
    signUp: async ({ email, password, nick }) => {
      const d = db(); const em = email.trim().toLowerCase();
      if (Object.values(d.users).some((u) => u.email === em)) throw fail('auth/email-already-in-use', KO_ERR['auth/email-already-in-use']);
      const uid = 'local-' + crypto.randomUUID();
      d.users[uid] = { uid, email: em, nick, pw: await hashSecret(password, 60000) };
      d.profiles[uid] = { nick, email: em, createdAt: Date.now() };
      d.session = uid; save(d); return pub(d.users[uid]);
    },
    signIn: async ({ email, password }) => {
      const d = db(); const em = email.trim().toLowerCase();
      const u = Object.values(d.users).find((x) => x.email === em);
      if (!u || !(await verifySecret(password, u.pw))) throw fail('auth/invalid-credential', KO_ERR['auth/invalid-credential']);
      d.session = u.uid; save(d); return pub(u);
    },
    signOut: async () => { const d = db(); delete d.session; save(d); },
    resetPassword: async () => { throw fail('local', '로컬 시험 모드에서는 비밀번호 재설정을 지원하지 않습니다.'); },
    getProfile: async (uid) => db().profiles[uid] || null,
    updateProfile: async (uid, patch) => { const d = db(); d.profiles[uid] = deepMerge(d.profiles[uid] || {}, patch); save(d); },
    loadGame: async (uid) => db().games[uid] || null,
    saveGame: async (uid, state) => { const d = db(); d.games[uid] = state; save(d); },
    submitReport: async (uid, report) => { const d = db(); (d.reports[uid] ||= {})[report.day] = report; save(d); },
    listReports: async (uid, n = 14) => Object.values(db().reports[uid] || {}).sort((a, b) => b.day - a.day).slice(0, n),
  };
}

function deepMerge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(a[k] || {}, v) : v;
  return out;
}
