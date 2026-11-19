// 기기 식별: 기기마다 한 번 만들어지는 무작위 ID. (실제 하드웨어 정보는 수집하지 않는다)
export const MAX_DEVICES = 5;
export function deviceId() {
  try {
    const o = sessionStorage.getItem('pcm.deviceId.test'); // 시험용 재정의(탭 단위)
    if (o) return o;
    let id = localStorage.getItem('pcm.deviceId');
    if (!id) { id = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('pcm.deviceId', id); }
    return id;
  } catch { return 'volatile-' + Math.random().toString(16).slice(2); }
}
export function deviceLabel() {
  const ua = navigator.userAgent;
  if (window.Capacitor?.isNativePlatform?.()) return 'Android 앱';
  if (/Electron\//.test(ua)) return 'Windows 앱';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '기타';
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '브라우저';
  return `${br} · ${os}`;
}
