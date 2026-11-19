// ─────────────────────────────────────────────────────────────
//  Firebase 웹 앱 설정
//  Firebase 콘솔 → 프로젝트 설정 → 일반 → "내 앱(웹)" 의 firebaseConfig 값을 아래에 붙여넣으세요.
//  (웹 API 키는 비밀 값이 아니며, 접근 제어는 firestore.rules 와 Authentication 설정이 담당합니다.)
//
//  CI(GitHub Actions)에서 빌드할 때는 저장소 Secret `FIREBASE_CONFIG_JSON` 에
//  같은 객체를 JSON 한 줄로 넣어도 됩니다. (빌드 시 자동 주입)
//
//  값이 비어 있으면 앱은 "로컬 시험 모드"로 동작하며, 이 모드는 화면에 그대로 표시됩니다.
// ─────────────────────────────────────────────────────────────
const placeholder = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

/* global __FIREBASE_CONFIG__ */
export const firebaseConfig =
  typeof __FIREBASE_CONFIG__ !== 'undefined' && __FIREBASE_CONFIG__ ? __FIREBASE_CONFIG__ : placeholder;

export const isFirebaseConfigured =
  !!firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith('YOUR_') &&
  !!firebaseConfig.projectId && !String(firebaseConfig.projectId).startsWith('YOUR_');
