// 날씨: 기본 지형은 눈 덮인 땅. 날씨는 비·안개·맑음·한파 중 하루 단위로 정해지고 내일 예보를 볼 수 있다.
// 특수 효과는 한파(이동 속도 ↓)와 안개(임무 성공 확률 ↓)에만 있다. 비·맑음은 분위기/적설 변화만.
export const WEATHERS = {
  clear: { ko: '맑음', weight: 35, snow: -5, desc: '하늘이 맑다. 특수 효과 없음.' },
  rain: { ko: '비', weight: 20, snow: -20, desc: '비가 눈을 녹인다. 특수 효과 없음.' },
  fog: { ko: '안개', weight: 20, snow: 5, succ: -0.1, desc: '짙은 안개 — 임무 성공 확률 -10%.' },
  cold: { ko: '한파', weight: 25, snow: 25, speed: -0.25, desc: '혹한 — 직원 이동 속도 -25%.' },
};
export const WEATHER_KEYS = Object.keys(WEATHERS);
export const START_SNOW = 40;                 // 시작 적설(%)
export const SNOW_SLOW = 0.2;                 // 적설 100% 일 때 야외 이동 속도 감소 비율

export function rollWeather(rand = Math.random) {
  const total = WEATHER_KEYS.reduce((a, k) => a + WEATHERS[k].weight, 0);
  let r = rand() * total;
  for (const k of WEATHER_KEYS) { r -= WEATHERS[k].weight; if (r < 0) return k; }
  return 'clear';
}
export const dailySnow = (snow, weather) => Math.max(0, Math.min(100, snow + WEATHERS[weather].snow));

// 야외 작업: 재설(눈 치우기) / 용광로 발전(눈 녹이기). rate = 게임 1분당 적설 감소(%)
export const TASKS = {
  snow: { ko: '재설 작업', dur: 120, rate: 0.25, desc: '마당의 눈을 치운다. 2시간에 적설 약 -30%.' },
  furnace: { ko: '용광로 발전', dur: 180, rate: 0.4, desc: '용광로를 돌려 눈을 녹인다. 3시간에 적설 약 -72%. 한 번에 한 명만 가능.' },
};
