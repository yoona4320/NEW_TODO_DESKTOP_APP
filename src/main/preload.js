const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('electronAPI', {
  getTodos: (date) => ipcRenderer.invoke('get-todos', date),
  saveTodos: (date, todos) => ipcRenderer.invoke('save-todos', date, todos),
  getSelectedDate: () => ipcRenderer.invoke('get-selected-date'),
  setSelectedDate: (date) => ipcRenderer.invoke('set-selected-date', date),
  getTodoCount: (date) => ipcRenderer.invoke('get-todo-count', date),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getCharIcon: () => ipcRenderer.invoke('get-char-icon'),
  setCharIcon: (icon) => ipcRenderer.send('set-char-icon', icon),
  charClicked: () => ipcRenderer.send('char-clicked'),
  openCalendar: () => ipcRenderer.send('open-calendar'),
  closeCalendar: () => ipcRenderer.send('close-calendar'),
  // mode: 'char' | 'todo'
  openIconPicker: (mode, todoId) => ipcRenderer.send('open-icon-picker', { mode, todoId }),
  closeIconPicker: () => ipcRenderer.send('close-icon-picker'),
  sendIconSelected: (todoId, icon) => ipcRenderer.send('icon-selected', { todoId, icon }),
  closePanel: () => ipcRenderer.send('close-panel'),
  dragWindow: (name, dx, dy) => ipcRenderer.send('drag-window', { windowName: name, deltaX: dx, deltaY: dy }),
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  installUpdate: () => ipcRenderer.send('install-update'),
  onDateChanged: (cb) => ipcRenderer.on('date-changed', (_, d) => cb(d)),
  onIconSelected: (cb) => ipcRenderer.on('icon-selected', (_, data) => cb(data)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', () => cb()),
  onInitPicker: (cb) => ipcRenderer.on('init-picker', (_, data) => cb(data)),
  onCharIconChanged: (cb) => ipcRenderer.on('char-icon-changed', (_, icon) => cb(icon)),
  removeAllListeners: (ch) => ipcRenderer.removeAllListeners(ch),
  getCharacterPath: (key) => `asset://assets/characters/${key}.png`
});
