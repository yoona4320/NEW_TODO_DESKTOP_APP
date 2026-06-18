const state = {
  viewYear: 0,
  viewMonth: 0,
  selectedDate: '',
  hoveredDate: '',
  todayStr: '',
  todoCache: {}, // 날짜별 할일 존재 여부 캐시
};

function pad(n) { return String(n).padStart(2, '0'); }
function toDateStr(year, month, day) { return `${year}-${pad(month + 1)}-${pad(day)}`; }
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

// 해당 월의 모든 날짜 할일 존재 여부 로드
async function loadMonthTodos(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const promises = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(year, month, d);
    promises.push(
      window.electronAPI.getTodoCount(dateStr).then(count => {
        state.todoCache[dateStr] = count > 0;
      })
    );
  }
  await Promise.all(promises);
}

async function renderCalendar() {
  const { viewYear, viewMonth, selectedDate, hoveredDate, todayStr } = state;
  document.getElementById('monthLabel').textContent = `${viewYear}년 ${viewMonth + 1}월`;

  // 이번 달 할일 데이터 로드
  await loadMonthTodos(viewYear, viewMonth);

  const grid = document.getElementById('daysGrid');
  grid.innerHTML = '';

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

  for (let i = firstDay - 1; i >= 0; i--) {
    grid.appendChild(createDayEl(viewYear, viewMonth - 1, daysInPrev - i, true));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    grid.appendChild(createDayEl(viewYear, viewMonth, d, false));
  }
  const total = grid.children.length;
  const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= remaining; d++) {
    grid.appendChild(createDayEl(viewYear, viewMonth + 1, d, true));
  }

  await updateFooter(selectedDate);
}

function createDayEl(year, month, day, otherMonth) {
  const d = new Date(year, month, day);
  const realYear = d.getFullYear();
  const realMonth = d.getMonth();
  const realDay = d.getDate();
  const dateStr = toDateStr(realYear, realMonth, realDay);

  const el = document.createElement('div');
  el.className = 'day';
  el.dataset.date = dateStr;

  // 날짜 숫자
  const numSpan = document.createElement('span');
  numSpan.textContent = realDay;
  el.appendChild(numSpan);

  // 할일 있으면 빨간 점
  if (state.todoCache[dateStr]) {
    const dot = document.createElement('span');
    dot.className = 'todo-dot';
    el.appendChild(dot);
  }

  if (otherMonth) el.classList.add('other-month');
  const dow = d.getDay();
  if (!otherMonth && dow === 0) el.classList.add('sun');
  if (!otherMonth && dow === 6) el.classList.add('sat');
  if (dateStr === state.todayStr) el.classList.add('today');
  if (dateStr === state.hoveredDate) el.classList.add('hovered');
  if (dateStr === state.selectedDate) el.classList.add('selected');

  let clickTimer = null;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      selectDate(dateStr);
    } else {
      clickTimer = setTimeout(() => {
        clickTimer = null;
        hoverDate(dateStr);
      }, 250);
    }
  });

  return el;
}

function hoverDate(dateStr) {
  state.hoveredDate = dateStr;
  renderCalendar();
  updateFooter(dateStr);
}

async function selectDate(dateStr) {
  state.selectedDate = dateStr;
  state.hoveredDate = '';
  await window.electronAPI.setSelectedDate(dateStr);
  renderCalendar();
}

async function updateFooter(dateStr) {
  if (!dateStr) {
    document.getElementById('calFooter').textContent = '날짜를 선택하세요';
    return;
  }
  const count = await window.electronAPI.getTodoCount(dateStr);
  const [, month, day] = dateStr.split('-').map(Number);
  document.getElementById('calFooter').textContent = `${month}월 ${day}일 할일 [${count}건]`;
}

// 드래그
let isDragging = false, startX = 0, startY = 0;
document.getElementById('calDragHandle').addEventListener('mousedown', (e) => {
  if (e.target.tagName === 'BUTTON') return;
  isDragging = true; startX = e.screenX; startY = e.screenY; e.preventDefault();
});
document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  window.electronAPI.dragWindow('calendar', e.screenX - startX, e.screenY - startY);
  startX = e.screenX; startY = e.screenY;
});
document.addEventListener('mouseup', () => { isDragging = false; });

document.getElementById('btnPrevMonth').addEventListener('click', () => {
  state.viewMonth--;
  if (state.viewMonth < 0) { state.viewMonth = 11; state.viewYear--; }
  renderCalendar();
});
document.getElementById('btnNextMonth').addEventListener('click', () => {
  state.viewMonth++;
  if (state.viewMonth > 11) { state.viewMonth = 0; state.viewYear++; }
  renderCalendar();
});
document.getElementById('btnToday').addEventListener('click', async () => {
  const today = new Date();
  state.viewYear = today.getFullYear();
  state.viewMonth = today.getMonth();
  state.hoveredDate = '';
  state.selectedDate = state.todayStr;
  await window.electronAPI.setSelectedDate(state.todayStr);
  renderCalendar();
});
document.getElementById('btnClose').addEventListener('click', () => {
  window.electronAPI.closeCalendar();
});

async function init() {
  state.todayStr = getTodayStr();
  const selectedDate = await window.electronAPI.getSelectedDate();
  state.selectedDate = selectedDate;
  const parts = selectedDate.split('-').map(Number);
  state.viewYear = parts[0];
  state.viewMonth = parts[1] - 1;
  renderCalendar();
}

init();
