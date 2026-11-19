// 동시 접속 1곳 제한: 로그인할 때마다 새 세션 ID 를 기록한다. 이전 세션은 10초마다 확인하다가 자기 ID 가 아니면 종료된다.
// (등록 해제된 기기도 같은 점검에서 종료) 저장 직전에도 확인해, 밀려난 기기가 최신 데이터를 덮어쓰지 못하게 한다.
import { backend } from './backend.js';
import { deviceId, deviceLabel } from './device.js';

let sid = null, timer = 0, uid = null, onLost = null;
export const active = () => !!sid;

export async function start(u, cb) {
  stop(); uid = u; onLost = cb; sid = crypto.randomUUID();
  await backend.putSession(uid, { sid, deviceId: deviceId(), name: deviceLabel(), at: Date.now() });
  timer = setInterval(() => check().catch(() => {}), 10000);
}
export function stop() { clearInterval(timer); timer = 0; sid = null; }

function lose(reason, info) { const cb = onLost; stop(); if (cb) cb(reason, info); }

export async function check() {
  if (!sid) return true;
  const s = await backend.getSession(uid);
  if (s && s.sid !== sid) { lose('replaced', s); return false; }
  const d = await backend.getDevice(uid, deviceId());
  if (!d) { lose('device-removed'); return false; }
  return true;
}
/** 저장/제출 직전 호출. 이 접속이 현재 유효한 세션이 아니면 예외 */
export async function assertHolder() {
  if (!(await check())) throw Object.assign(new Error('session-lost'), { userMessage: '다른 곳에서 로그인되어 이 접속은 종료되었습니다.' });
}
