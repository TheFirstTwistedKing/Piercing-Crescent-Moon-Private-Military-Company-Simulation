// Electron 메인 프로세스 — www/ 번들을 그대로 불러오는 얇은 껍데기.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

// 인트로의 '전력 활성화' 효과음이 사용자 입력 없이도 재생되도록 허용
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

if (!app.requestSingleInstanceLock()) app.quit();

function createWindow() {
  const win = new BrowserWindow({
    width: 1366, height: 860, minWidth: 900, minHeight: 600,
    backgroundColor: '#000000', title: '천공월아 관리 패널', autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, autoplayPolicy: 'no-user-gesture-required', spellcheck: false },
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'www', 'index.html'));
  // 외부 링크는 기본 브라우저로, 앱 내부 이동은 file:// 만 허용
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) e.preventDefault(); });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
app.on('window-all-closed', () => app.quit());
