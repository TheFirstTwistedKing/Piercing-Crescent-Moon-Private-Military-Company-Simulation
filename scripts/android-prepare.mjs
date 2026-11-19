// `npx cap add android` 직후 실행: 앱 아이콘 교체 + 화면 설정(가로/세로 모두, 상태바 색)을 적용한다.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const res = 'android/app/src/main/res';
if (!existsSync(res)) { console.error('android/ 가 없습니다. 먼저 `npx cap add android` 를 실행하세요.'); process.exit(1); }

// 아이콘: assets/icon-1024.png → mipmap(런처) — ImageMagick(`convert`/`magick`) 사용
const bin = ['magick', 'convert'].find((b) => { try { execFileSync(b, ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } });
if (bin) {
  const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  const fg = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
  for (const [d, s] of Object.entries(sizes)) {
    const dir = path.join(res, `mipmap-${d}`); mkdirSync(dir, { recursive: true });
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) execFileSync(bin, ['assets/icon-1024.png', '-resize', `${s}x${s}`, path.join(dir, name)]);
    // 적응형 아이콘 전경: 안전영역(66%)에 로고를 넣고 나머지는 검정
    execFileSync(bin, ['assets/icon-1024.png', '-resize', `${Math.round(fg[d] * 0.66)}x${Math.round(fg[d] * 0.66)}`, '-background', 'black', '-gravity', 'center', '-extent', `${fg[d]}x${fg[d]}`, path.join(dir, 'ic_launcher_foreground.png')]);
  }
  console.log('아이콘 갱신 완료');
} else console.warn('ImageMagick 이 없어 기본 아이콘을 유지합니다.');

// 적응형 아이콘 배경색을 검정으로
const bg = path.join(res, 'values', 'ic_launcher_background.xml');
if (existsSync(bg)) writeFileSync(bg, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#000000</color>\n</resources>\n');

// 스플래시/상태바: 검정
const styles = path.join(res, 'values', 'styles.xml');
if (existsSync(styles)) {
  let x = readFileSync(styles, 'utf8');
  if (!x.includes('android:statusBarColor')) x = x.replace('<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">', '<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">\n        <item name="android:statusBarColor">#000000</item>\n        <item name="android:navigationBarColor">#000000</item>');
  writeFileSync(styles, x);
}
console.log('android 준비 완료');
