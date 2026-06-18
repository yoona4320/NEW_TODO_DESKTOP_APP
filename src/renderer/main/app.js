const state = {
  todos: [],
  currentDate: '',
  currentTab: 'current',
  editingId: null,
};

const ICON_KEYS = ['cat','dog','frog','turtle','hamster','rabbit','chick','sheep','fox','otter','pig','penguin','dinosaur','bear','tiger'];

function getImgSrc(key) {
  return CHARACTER_IMAGES[key] || CHARACTER_IMAGES['cat'];
}

function generateId() { return 'todo_' + Date.now() + '_' + Math.random().toString(36).substr(2,9); }

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  return dateStr === todayStr ? `오늘 (${m}월 ${d}일)` : `${m}월 ${d}일`;
}

function getNextDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(y, m-1, d+1);
  return `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`;
}

async function loadTodos() {
  state.todos = await window.electronAPI.getTodos(state.currentDate);
  renderList();
}

async function saveTodos() {
  await window.electronAPI.saveTodos(state.currentDate, state.todos);
}

function renderList() {
  const list = document.getElementById('todoList');
  const empty = document.getElementById('emptyState');
  list.innerHTML = '';
  const filtered = state.todos.filter(t => state.currentTab === 'current' ? !t.done : t.done);
  empty.style.display = filtered.length === 0 ? '' : 'none';

  filtered.forEach(todo => {
    const item = document.createElement('div');
    item.className = 'todo-item' + (todo.done ? ' done-item' : '');

    const check = document.createElement('input');
    check.type = 'checkbox'; check.className = 'todo-check'; check.checked = todo.done;
    check.addEventListener('click', e => { e.stopPropagation(); toggleDone(todo.id); });

    const iconEl = document.createElement('img');
    iconEl.className = 'todo-icon-img';
    iconEl.src = getImgSrc(todo.icon);
    iconEl.alt = todo.icon;

    const title = document.createElement('span');
    title.className = 'todo-title'; title.textContent = todo.title;

    item.appendChild(check); item.appendChild(iconEl); item.appendChild(title);
    item.addEventListener('click', () => openDetail(todo.id));
    list.appendChild(item);
  });
}

function addTodo() {
  const input = document.getElementById('addInput');
  const title = input.value.trim();
  if (!title) return;
  state.todos.push({ id: generateId(), title, content: '', done: false, icon: 'cat', createdAt: new Date().toISOString() });
  saveTodos(); renderList(); input.value = '';
}

function toggleDone(id) {
  const todo = state.todos.find(t => t.id === id);
  if (!todo) return;
  todo.done = !todo.done;
  saveTodos(); renderList();
  if (state.editingId === id) document.getElementById('detailDoneCheck').checked = todo.done;
}

function openDetail(id) {
  const todo = state.todos.find(t => t.id === id);
  if (!todo) return;
  state.editingId = id;
  document.getElementById('detailIconImg').src = getImgSrc(todo.icon);
  document.getElementById('detailTitleInput').value = todo.title;
  document.getElementById('detailContentInput').value = todo.content || '';
  document.getElementById('detailDoneCheck').checked = todo.done;
  document.getElementById('detailOverlay').style.display = '';
}

function closeDetail() {
  saveDetailChanges();
  document.getElementById('detailOverlay').style.display = 'none';
  state.editingId = null;
}

function saveDetailChanges() {
  if (!state.editingId) return;
  const todo = state.todos.find(t => t.id === state.editingId);
  if (!todo) return;
  const newTitle = document.getElementById('detailTitleInput').value.trim();
  if (newTitle) todo.title = newTitle;
  todo.content = document.getElementById('detailContentInput').value;
  todo.done = document.getElementById('detailDoneCheck').checked;
  saveTodos(); renderList();
}

function openTodoIconPicker() {
  if (!state.editingId) return;
  window.electronAPI.openIconPicker('todo', state.editingId);
}

function deleteTodo() {
  showModal('해당 할일을 삭제하시겠습니까?', () => {
    state.todos = state.todos.filter(t => t.id !== state.editingId);
    saveTodos(); renderList(); closeDetail();
  });
}

async function applyNextDay() {
  showModal('다음날에도 적용하시겠습니까?', async () => {
    const todo = state.todos.find(t => t.id === state.editingId);
    if (!todo) return;
    const nextDate = getNextDate(state.currentDate);
    const nextTodos = await window.electronAPI.getTodos(nextDate);
    nextTodos.push({ id: generateId(), title: todo.title, content: todo.content, done: false, icon: todo.icon, createdAt: new Date().toISOString() });
    await window.electronAPI.saveTodos(nextDate, nextTodos);
    const btn = document.querySelector('.btn-next-day');
    const orig = btn.textContent;
    btn.textContent = '✓ 추가됨!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });
}

function switchTab(tab) {
  state.currentTab = tab;
  document.getElementById('tabCurrent').classList.toggle('active', tab === 'current');
  document.getElementById('tabDone').classList.toggle('active', tab === 'done');
  renderList();
}

let _modalCallback = null;
function showModal(msg, onYes) {
  _modalCallback = onYes;
  document.getElementById('modalMsg').textContent = msg;
  document.getElementById('modalNo').style.display = '';
  document.getElementById('modalOverlay').style.display = '';
}
document.getElementById('modalYes').addEventListener('click', () => {
  document.getElementById('modalOverlay').style.display = 'none';
  if (_modalCallback) { _modalCallback(); _modalCallback = null; }
});
document.getElementById('modalNo').addEventListener('click', () => {
  document.getElementById('modalOverlay').style.display = 'none';
  _modalCallback = null;
});

document.getElementById('btnUpdate').addEventListener('click', async () => {
  const btn = document.getElementById('btnUpdate');
  btn.textContent = '⏳'; btn.disabled = true;
  try {
    const info = await window.electronAPI.checkUpdate();
    if (!info) {
      document.getElementById('modalNo').style.display = 'none';
      showModal('업데이트 내역이 없습니다.', () => {});
    } else {
      showModal(`업데이트하시겠습니까?\n(v${info.version})`, () => window.electronAPI.installUpdate());
    }
  } catch { showModal('업데이트 확인 중 오류가 발생했습니다.', () => {}); }
  btn.textContent = '↑'; btn.disabled = false;
});

window.electronAPI.onUpdateDownloaded(() => {
  document.getElementById('modalNo').style.display = 'none';
  showModal('업데이트 준비 완료! 재시작하면 설치됩니다.', () => window.electronAPI.installUpdate());
});

document.getElementById('btnChangeChar').addEventListener('click', () => {
  window.electronAPI.openIconPicker('char', null);
});

window.electronAPI.onCharIconChanged((icon) => {
  document.getElementById('headerCharImg').src = getImgSrc(icon);
});

// 드래그
let isDragging = false, dragStartX = 0, dragStartY = 0;
document.getElementById('dragHandle').addEventListener('mousedown', e => {
  if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
  isDragging = true; dragStartX = e.screenX; dragStartY = e.screenY; e.preventDefault();
});
document.addEventListener('mousemove', e => {
  if (!isDragging) return;
  window.electronAPI.dragWindow('panel', e.screenX - dragStartX, e.screenY - dragStartY);
  dragStartX = e.screenX; dragStartY = e.screenY;
});
document.addEventListener('mouseup', () => { isDragging = false; });

document.getElementById('btnClose').addEventListener('click', () => window.electronAPI.closePanel());
document.getElementById('btnCalendar').addEventListener('click', () => window.electronAPI.openCalendar());
document.getElementById('btnAdd').addEventListener('click', addTodo);
document.getElementById('addInput').addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
document.getElementById('detailTitleInput').addEventListener('blur', saveDetailChanges);
document.getElementById('detailContentInput').addEventListener('blur', saveDetailChanges);
document.getElementById('detailDoneCheck').addEventListener('change', saveDetailChanges);

window.electronAPI.onDateChanged(async (date) => {
  state.currentDate = date;
  document.getElementById('dateText').textContent = formatDate(date);
  closeDetail(); await loadTodos();
});

window.electronAPI.onIconSelected(({ todoId, icon }) => {
  const todo = state.todos.find(t => t.id === todoId);
  if (!todo) return;
  todo.icon = icon; saveTodos(); renderList();
  if (state.editingId === todoId) document.getElementById('detailIconImg').src = getImgSrc(icon);
});

async function init() {
  const version = await window.electronAPI.getAppVersion();
  document.getElementById('versionText').textContent = `v${version}`;
  const charIcon = await window.electronAPI.getCharIcon();
  document.getElementById('headerCharImg').src = getImgSrc(charIcon);
  state.currentDate = await window.electronAPI.getSelectedDate();
  document.getElementById('dateText').textContent = formatDate(state.currentDate);
  await loadTodos();
}
init();

// ── 자정 자동 날짜 갱신 ──────────────────────────────────────
function scheduleMidnightRefresh() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  const msUntilMidnight = midnight - now;

  setTimeout(async () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    
    // 오늘 날짜로 자동 변경
    await window.electronAPI.setSelectedDate(todayStr);
    state.currentDate = todayStr;
    document.getElementById('dateText').textContent = formatDate(todayStr);
    closeDetail();
    await loadTodos();

    // 다음 자정도 예약
    scheduleMidnightRefresh();
  }, msUntilMidnight);
}

scheduleMidnightRefresh();
