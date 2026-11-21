// 백엔드 추상화: Firebase(Auth + Firestore) 또는 "로컬 시험 모드"(localStorage).
// 로컬 모드는 Firebase 설정값이 비어 있을 때만 켜지며, UI 에 항상 표시된다. (계정이 이 기기 안에만 존재)
import { firebaseConfig, isFirebaseConfigured } from '../config/firebase-config.js';
import { hashSecret, verifySecret } from './crypto.js';
import { nickKey } from './nick.js';

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
  'auth/requires-recent-login': '보안을 위해 다시 로그인한 뒤 시도하세요.',
  'auth/missing-password': '비밀번호를 입력하세요.',
  'auth/too-many-requests-verify': '인증 메일을 너무 자주 요청했습니다. 잠시 후 다시 시도하세요.',
  'nick/taken': '이미 사용 중인 콜사인입니다. 다른 이름을 입력하세요.',
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
  const toUser = (u) => (u ? { uid: u.uid, email: u.email, nick: u.displayName || (u.email || '').split('@')[0], verified: !!u.emailVerified } : null);
  const wrap = async (fn) => { try { return await fn(); } catch (e) { e.userMessage = koError(e); throw e; } };
  const gameRef = (uid) => F.doc(db, 'users', uid, 'data', 'game');
  const sub = (uid, col, id) => F.doc(db, 'users', uid, col, id);
  const nickTaken = () => Object.assign(new Error('nick taken'), { code: 'nick/taken' });
  // 비밀번호 변경·계정 삭제 전 재인증 (Firebase 는 최근 로그인을 요구한다)
  const reauth = async (password) => {
    const u = auth.currentUser; if (!u) throw Object.assign(new Error('no user'), { code: 'auth/requires-recent-login' });
    await A.reauthenticateWithCredential(u, A.EmailAuthProvider.credential(u.email, password)); return u;
  };
  const delCol = async (...path) => { for (const d of (await F.getDocs(F.collection(db, ...path))).docs) await F.deleteDoc(d.ref); };

  return {
    mode: 'firebase',
    label: 'FIREBASE',
    ready: () => new Promise((res) => { const off = A.onAuthStateChanged(auth, (u) => { off(); res(toUser(u)); }); }),
    current: () => toUser(auth.currentUser),
    nickAvailable: (nick) => wrap(async () => !(await F.getDoc(F.doc(db, 'nicks', nickKey(nick)))).exists()),
    signUp: ({ email, password, nick }) => wrap(async () => {
      const key = nickKey(nick);
      if ((await F.getDoc(F.doc(db, 'nicks', key))).exists()) throw nickTaken();
      const cred = await A.createUserWithEmailAndPassword(auth, email, password);
      try { await F.setDoc(F.doc(db, 'nicks', key), { uid: cred.user.uid, nick }); } // 규칙: 이미 있으면 create 불가 → 동시 가입 경쟁도 차단
      catch { await A.deleteUser(cred.user).catch(() => {}); throw nickTaken(); }
      await A.updateProfile(cred.user, { displayName: nick });
      // verifyEmail: 이 기능 이후 가입한 계정만 이메일 인증을 요구한다 (기존 계정은 플래그가 없어 제외)
      await F.setDoc(F.doc(db, 'users', cred.user.uid), { nick, nickKey: key, email, verifyEmail: true, createdAt: F.serverTimestamp() }, { merge: true });
      await A.sendEmailVerification(cred.user).catch(() => {}); // 실패해도 인증 화면에서 다시 보낼 수 있다
      return toUser(auth.currentUser);
    }),
    signIn: ({ email, password }) => wrap(async () => toUser((await A.signInWithEmailAndPassword(auth, email, password)).user)),
    signOut: () => wrap(() => A.signOut(auth)),
    resetPassword: (email) => wrap(() => A.sendPasswordResetEmail(auth, email)),
    sendVerification: () => wrap(async () => {
      try { await A.sendEmailVerification(auth.currentUser); }
      catch (e) { if (e.code === 'auth/too-many-requests') e.code = 'auth/too-many-requests-verify'; throw e; }
    }),
    reloadUser: () => wrap(async () => { await auth.currentUser?.reload(); return toUser(auth.currentUser); }),
    changePassword: ({ current, next }) => wrap(async () => { const u = await reauth(current); await A.updatePassword(u, next); }),
    deleteAccount: ({ password }) => wrap(async () => {
      const u = await reauth(password); const uid = u.uid;
      const prof = (await F.getDoc(F.doc(db, 'users', uid))).data() || {};
      for (const c of ['devices', 'deviceRequests', 'reports', 'data']) await delCol('users', uid, c);
      if (prof.nickKey) await F.deleteDoc(F.doc(db, 'nicks', prof.nickKey)).catch(() => {}); // 콜사인 해제
      await F.deleteDoc(F.doc(db, 'users', uid));
      await A.deleteUser(u);
    }),
    getProfile: (uid) => wrap(async () => { const s = await F.getDoc(F.doc(db, 'users', uid)); return s.exists() ? s.data() : null; }),
    updateProfile: (uid, patch) => wrap(() => F.setDoc(F.doc(db, 'users', uid), patch, { merge: true })),
    loadGame: (uid) => wrap(async () => { const s = await F.getDoc(gameRef(uid)); return s.exists() ? JSON.parse(s.data().json) : null; }),
    saveGame: (uid, state) => wrap(() => F.setDoc(gameRef(uid), { json: JSON.stringify(state), updatedAt: F.serverTimestamp() })),
    submitReport: (uid, report) => wrap(() => F.setDoc(F.doc(db, 'users', uid, 'reports', String(report.day).padStart(4, '0')), { json: JSON.stringify(report), day: report.day, createdAt: F.serverTimestamp() })),
    // 기기 · 승인 요청 · 접속 세션
    getDevice: (uid, id) => wrap(async () => { const x = await F.getDoc(sub(uid, 'devices', id)); return x.exists() ? { id, ...x.data() } : null; }),
    putDevice: (uid, id, data) => wrap(() => F.setDoc(sub(uid, 'devices', id), data, { merge: true })),
    delDevice: (uid, id) => wrap(() => F.deleteDoc(sub(uid, 'devices', id))),
    listDevices: (uid) => wrap(async () => (await F.getDocs(F.collection(db, 'users', uid, 'devices'))).docs.map((d) => ({ id: d.id, ...d.data() }))),
    getRequest: (uid, id) => wrap(async () => { const x = await F.getDoc(sub(uid, 'deviceRequests', id)); return x.exists() ? { id, ...x.data() } : null; }),
    putRequest: (uid, id, data) => wrap(() => F.setDoc(sub(uid, 'deviceRequests', id), data)),
    delRequest: (uid, id) => wrap(() => F.deleteDoc(sub(uid, 'deviceRequests', id))),
    listRequests: (uid) => wrap(async () => (await F.getDocs(F.collection(db, 'users', uid, 'deviceRequests'))).docs.map((d) => ({ id: d.id, ...d.data() }))),
    getSession: (uid) => wrap(async () => { const x = await F.getDoc(F.doc(db, 'users', uid, 'data', 'session')); return x.exists() ? x.data() : null; }),
    putSession: (uid, data) => wrap(() => F.setDoc(F.doc(db, 'users', uid, 'data', 'session'), data)),
    listReports: (uid, n = 14) => wrap(async () => {
      const q = F.query(F.collection(db, 'users', uid, 'reports'), F.orderBy('day', 'desc'), F.limit(n));
      return (await F.getDocs(q)).docs.map((d) => JSON.parse(d.data().json));
    }),
  };
}

/* ───────────────────────── 로컬 시험 모드 ───────────────────────── */
export function makeLocal() {
  const KEY = 'pcm.local.v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));
  const db = () => { const d = load(); d.users ||= {}; d.profiles ||= {}; d.games ||= {}; d.reports ||= {}; d.nicks ||= {}; d.devices ||= {}; d.requests ||= {}; d.sessions ||= {}; return d; };
  const bucket = (d, kind, uid) => (d[kind][uid] ||= {});
  const fail = (code, msg) => Object.assign(new Error(msg), { code, userMessage: msg });
  const pub = (u) => (u ? { uid: u.uid, email: u.email, nick: u.nick, verified: true } : null); // 로컬 모드는 메일을 보낼 수 없어 인증된 것으로 취급

  return {
    mode: 'local',
    label: 'LOCAL TEST',
    ready: async () => { const d = db(); return pub(d.users[d.session]); },
    current: () => { const d = db(); return pub(d.users[d.session]); },
    signUp: async ({ email, password, nick }) => {
      const d = db(); const em = email.trim().toLowerCase(); const key = nickKey(nick);
      if (d.nicks[key]) throw fail('nick/taken', KO_ERR['nick/taken']);
      if (Object.values(d.users).some((u) => u.email === em)) throw fail('auth/email-already-in-use', KO_ERR['auth/email-already-in-use']);
      const uid = 'local-' + crypto.randomUUID();
      d.users[uid] = { uid, email: em, nick, pw: await hashSecret(password, 60000) };
      d.profiles[uid] = { nick, nickKey: key, email: em, createdAt: Date.now() }; d.nicks[key] = uid;
      d.session = uid; save(d); return pub(d.users[uid]);
    },
    nickAvailable: async (nick) => !db().nicks[nickKey(nick)],
    signIn: async ({ email, password }) => {
      const d = db(); const em = email.trim().toLowerCase();
      const u = Object.values(d.users).find((x) => x.email === em);
      if (!u || !(await verifySecret(password, u.pw))) throw fail('auth/invalid-credential', KO_ERR['auth/invalid-credential']);
      d.session = u.uid; save(d); return pub(u);
    },
    signOut: async () => { const d = db(); delete d.session; save(d); },
    resetPassword: async () => { throw fail('local', '로컬 시험 모드에서는 비밀번호 재설정을 지원하지 않습니다.'); },
    sendVerification: async () => {},
    reloadUser: async () => { const d = db(); return pub(d.users[d.session]); },
    changePassword: async ({ current, next }) => {
      const d = db(); const u = d.users[d.session];
      if (!u || !(await verifySecret(current, u.pw))) throw fail('auth/invalid-credential', '현재 비밀번호가 올바르지 않습니다.');
      u.pw = await hashSecret(next, 60000); save(d);
    },
    deleteAccount: async ({ password }) => {
      const d = db(); const u = d.users[d.session];
      if (!u || !(await verifySecret(password, u.pw))) throw fail('auth/invalid-credential', '비밀번호가 올바르지 않습니다.');
      const uid = u.uid, key = d.profiles[uid]?.nickKey;
      for (const k of ['users', 'profiles', 'games', 'reports', 'devices', 'requests', 'sessions']) delete d[k][uid];
      if (key && d.nicks[key] === uid) delete d.nicks[key];
      delete d.session; save(d);
    },
    getProfile: async (uid) => db().profiles[uid] || null,
    updateProfile: async (uid, patch) => { const d = db(); d.profiles[uid] = deepMerge(d.profiles[uid] || {}, patch); save(d); },
    loadGame: async (uid) => db().games[uid] || null,
    saveGame: async (uid, state) => { const d = db(); d.games[uid] = state; save(d); },
    submitReport: async (uid, report) => { const d = db(); (d.reports[uid] ||= {})[report.day] = report; save(d); },
    getDevice: async (uid, id) => { const x = bucket(db(), 'devices', uid)[id]; return x ? { id, ...x } : null; },
    putDevice: async (uid, id, data) => { const d = db(); const b = bucket(d, 'devices', uid); b[id] = { ...(b[id] || {}), ...data }; save(d); },
    delDevice: async (uid, id) => { const d = db(); delete bucket(d, 'devices', uid)[id]; save(d); },
    listDevices: async (uid) => Object.entries(bucket(db(), 'devices', uid)).map(([id, v]) => ({ id, ...v })),
    getRequest: async (uid, id) => { const x = bucket(db(), 'requests', uid)[id]; return x ? { id, ...x } : null; },
    putRequest: async (uid, id, data) => { const d = db(); bucket(d, 'requests', uid)[id] = data; save(d); },
    delRequest: async (uid, id) => { const d = db(); delete bucket(d, 'requests', uid)[id]; save(d); },
    listRequests: async (uid) => Object.entries(bucket(db(), 'requests', uid)).map(([id, v]) => ({ id, ...v })),
    getSession: async (uid) => db().sessions[uid] || null,
    putSession: async (uid, data) => { const d = db(); d.sessions[uid] = data; save(d); },
    listReports: async (uid, n = 14) => Object.values(db().reports[uid] || {}).sort((a, b) => b.day - a.day).slice(0, n),
  };
}

function deepMerge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(a[k] || {}, v) : v;
  return out;
}
