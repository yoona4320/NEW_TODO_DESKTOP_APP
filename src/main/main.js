const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');

const store = new Store({
  defaults: {
    todos: {},
    selectedDate: getTodayString(),
    selectedCharIcon: 'cat',
    windowPositions: { char: null, panel: null, calendar: null, iconPicker: null }
  }
});

let tray = null;
let charWindow = null;
let panelWindow = null;
let calendarWindow = null;
let iconPickerWindow = null;
let isPanelVisible = false;

const CHAR_SIZE = 64;
const PANEL_W = 320;
const PANEL_H = 520;

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function clampToDisplay(x, y, width, height) {
  const displays = screen.getAllDisplays();
  let workArea = screen.getPrimaryDisplay().workArea;
  for (const display of displays) {
    const wa = display.workArea;
    if (x >= wa.x && x < wa.x + wa.width && y >= wa.y && y < wa.y + wa.height) {
      workArea = wa; break;
    }
  }
  return {
    x: Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - width)),
    y: Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - height))
  };
}

function getDefaultCharPosition() {
  const { workArea } = screen.getPrimaryDisplay();
  return { x: workArea.x + workArea.width - CHAR_SIZE - 20, y: workArea.y + workArea.height - CHAR_SIZE - 80 };
}

function getPanelPositionNearChar() {
  if (!charWindow) return { x: 100, y: 100 };
  const [cx, cy] = charWindow.getPosition();
  const { workArea } = screen.getPrimaryDisplay();
  let x = cx - PANEL_W - 10;
  let y = cy - PANEL_H + CHAR_SIZE;
  if (x < workArea.x) x = cx + CHAR_SIZE + 10;
  if (y < workArea.y) y = workArea.y + 10;
  if (y + PANEL_H > workArea.y + workArea.height) y = workArea.y + workArea.height - PANEL_H - 10;
  return { x, y };
}

// ─── 트레이 ─────────────────────────────────────────────────────
function createTray() {
  let trayIcon;
  try {
    const iconPath = path.join(__dirname, '../../assets/icons/tray-icon.png');
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) throw new Error('empty');
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  tray.setToolTip('할일 앱');

  const updateMenu = () => {
    const menu = Menu.buildFromTemplate([
      { label: isPanelVisible ? '패널 닫기' : '패널 열기', click: togglePanel },
      { type: 'separator' },
      { label: '종료', click: () => { app.isQuiting = true; app.quit(); } }
    ]);
    tray.setContextMenu(menu);
  };

  tray.on('click', togglePanel);
  tray.on('right-click', updateMenu);
  updateMenu();
}

// ─── 캐릭터 창 ──────────────────────────────────────────────────
function createCharWindow() {
  const savedPos = store.get('windowPositions.char');
  let pos = savedPos || getDefaultCharPosition();
  pos = clampToDisplay(pos.x, pos.y, CHAR_SIZE, CHAR_SIZE);

  charWindow = new BrowserWindow({
    width: CHAR_SIZE, height: CHAR_SIZE, x: pos.x, y: pos.y,
    frame: false, transparent: true, alwaysOnTop: true,
    resizable: false, skipTaskbar: true, show: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js'), spellcheck: false }
  });
  charWindow.loadFile(path.join(__dirname, '../renderer/char/index.html'));
  charWindow.on('move', () => {
    if (!charWindow) return;
    const [x, y] = charWindow.getPosition();
    store.set('windowPositions.char', { x, y });
  });
  charWindow.on('closed', () => { charWindow = null; });
}

// ─── 패널 창 ────────────────────────────────────────────────────
function createPanelWindow() {
  const savedPos = store.get('windowPositions.panel');
  const defaultPos = getPanelPositionNearChar();
  let pos = savedPos || defaultPos;
  pos = clampToDisplay(pos.x, pos.y, PANEL_W, PANEL_H);

  panelWindow = new BrowserWindow({
    width: PANEL_W, height: PANEL_H, x: pos.x, y: pos.y,
    frame: false, transparent: true, alwaysOnTop: true,
    resizable: false, skipTaskbar: false, show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js'), spellcheck: false }
  });
  panelWindow.loadFile(path.join(__dirname, '../renderer/main/index.html'));
  // 작업표시줄 아이콘 설정
  try {
    const iconPath = path.join(__dirname, '../../assets/icons/app-icon.ico');
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) panelWindow.setIcon(icon);
  } catch(e) {}
  panelWindow.on('move', () => {
    if (!panelWindow) return;
    const [x, y] = panelWindow.getPosition();
    store.set('windowPositions.panel', { x, y });
  });
  panelWindow.on('closed', () => { panelWindow = null; });
}

// ─── 캘린더 창 ──────────────────────────────────────────────────
function createCalendarWindow() {
  if (calendarWindow) { calendarWindow.focus(); return; }
  const W = 300, H = 340;
  const mainPos = panelWindow ? panelWindow.getPosition() : [100, 100];
  const savedPos = store.get('windowPositions.calendar');
  let pos = savedPos || { x: mainPos[0] - W - 10, y: mainPos[1] };
  pos = clampToDisplay(pos.x, pos.y, W, H);
  calendarWindow = new BrowserWindow({
    width: W, height: H, x: pos.x, y: pos.y,
    frame: false, transparent: true, alwaysOnTop: true, resizable: false, skipTaskbar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js'), spellcheck: false }
  });
  calendarWindow.loadFile(path.join(__dirname, '../renderer/calendar/index.html'));
  calendarWindow.on('move', () => {
    if (!calendarWindow) return;
    const [x, y] = calendarWindow.getPosition();
    store.set('windowPositions.calendar', { x, y });
  });
  calendarWindow.on('closed', () => { calendarWindow = null; });
}

// ─── 아이콘 선택 창 ─────────────────────────────────────────────
function createIconPickerWindow(mode, todoId) {
  if (iconPickerWindow) { iconPickerWindow.focus(); return; }
  const W = 340, H = 320;
  const mainPos = panelWindow ? panelWindow.getPosition() : [100, 100];
  const savedPos = store.get('windowPositions.iconPicker');
  let pos = savedPos || { x: mainPos[0] - W - 10, y: mainPos[1] + 80 };
  pos = clampToDisplay(pos.x, pos.y, W, H);
  iconPickerWindow = new BrowserWindow({
    width: W, height: H, x: pos.x, y: pos.y,
    frame: false, transparent: true, alwaysOnTop: true, resizable: false, skipTaskbar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js'), spellcheck: false }
  });
  iconPickerWindow.loadFile(path.join(__dirname, '../renderer/icon-picker/index.html'));
  iconPickerWindow.webContents.once('did-finish-load', () => {
    iconPickerWindow.webContents.send('init-picker', { mode, todoId });
  });
  iconPickerWindow.on('move', () => {
    if (!iconPickerWindow) return;
    const [x, y] = iconPickerWindow.getPosition();
    store.set('windowPositions.iconPicker', { x, y });
  });
  iconPickerWindow.on('closed', () => { iconPickerWindow = null; });
}

// ─── 패널 토글 ──────────────────────────────────────────────────
function togglePanel() {
  if (!panelWindow) return;
  if (isPanelVisible) {
    panelWindow.hide();
    isPanelVisible = false;
    // 서브 창들도 모두 닫기
    if (calendarWindow) calendarWindow.close();
    if (iconPickerWindow) iconPickerWindow.close();
  } else {
    if (!store.get('windowPositions.panel')) {
      const pos = getPanelPositionNearChar();
      panelWindow.setPosition(pos.x, pos.y);
    }
    panelWindow.show();
    panelWindow.focus();
    isPanelVisible = true;
  }
}

// ─── IPC ────────────────────────────────────────────────────────
ipcMain.handle('get-todos', (_, date) => store.get(`todos.${date}`, []));
ipcMain.handle('save-todos', (_, date, todos) => { store.set(`todos.${date}`, todos); return true; });
ipcMain.handle('get-selected-date', () => store.get('selectedDate', getTodayString()));
ipcMain.handle('set-selected-date', (_, date) => {
  store.set('selectedDate', date);
  if (panelWindow) panelWindow.webContents.send('date-changed', date);
  return true;
});
ipcMain.handle('get-todo-count', (_, date) => store.get(`todos.${date}`, []).length);
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-char-icon', () => store.get('selectedCharIcon', 'cat'));

ipcMain.on('set-char-icon', (_, icon) => {
  store.set('selectedCharIcon', icon);
  if (charWindow) charWindow.webContents.send('char-icon-changed', icon);
  if (panelWindow) panelWindow.webContents.send('char-icon-changed', icon);
});
ipcMain.on('char-clicked', () => togglePanel());
ipcMain.on('open-calendar', () => createCalendarWindow());
ipcMain.on('close-calendar', () => { if (calendarWindow) calendarWindow.close(); });
ipcMain.on('open-icon-picker', (_, { mode, todoId }) => createIconPickerWindow(mode, todoId));
ipcMain.on('close-icon-picker', () => { if (iconPickerWindow) iconPickerWindow.close(); });
ipcMain.on('icon-selected', (_, { todoId, icon }) => {
  if (panelWindow) panelWindow.webContents.send('icon-selected', { todoId, icon });
  if (iconPickerWindow) iconPickerWindow.close();
});
ipcMain.on('close-panel', () => {
  if (panelWindow) { panelWindow.hide(); isPanelVisible = false; }
});
ipcMain.on('drag-window', (_, { windowName, deltaX, deltaY }) => {
  const map = { char: charWindow, panel: panelWindow, calendar: calendarWindow, 'icon-picker': iconPickerWindow };
  const win = map[windowName];
  if (!win) return;
  const [x, y] = win.getPosition();
  const [w, h] = win.getSize();
  const c = clampToDisplay(x + deltaX, y + deltaY, w, h);
  win.setPosition(c.x, c.y);
  if (windowName === 'char') store.delete('windowPositions.panel');
});
ipcMain.handle('check-update', async () => {
  try { const r = await autoUpdater.checkForUpdates(); return r ? r.updateInfo : null; } catch { return null; }
});
ipcMain.on('install-update', () => autoUpdater.downloadUpdate());

// ─── autoUpdater ────────────────────────────────────────────────
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.on('update-downloaded', () => { if (panelWindow) panelWindow.webContents.send('update-downloaded'); });
autoUpdater.on('error', err => console.error('Update error:', err));

// ─── 앱 시작 ────────────────────────────────────────────────────
app.whenReady().then(() => {
  // 작업표시줄 아이콘 설정
  const appIconPath = path.join(__dirname, '../../assets/icons/app-icon.ico');
  const appIcon = nativeImage.createFromPath(appIconPath);
  if (!appIcon.isEmpty()) {
    app.setAppUserModelId('com.yoona.todo-float');
  }
  createTray();
  createCharWindow();
  createPanelWindow();
  screen.on('display-metrics-changed', () => {
    [charWindow, panelWindow].forEach(win => {
      if (!win) return;
      const [x, y] = win.getPosition();
      const [w, h] = win.getSize();
      const c = clampToDisplay(x, y, w, h);
      win.setPosition(c.x, c.y);
    });
  });
});

app.on('window-all-closed', e => e.preventDefault());
app.on('before-quit', () => { app.isQuiting = true; });
