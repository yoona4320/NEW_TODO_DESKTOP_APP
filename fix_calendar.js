const fs = require('fs');

// ── calendar/index.html (전체 재작성) ────────────────────────
const calendarHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>캘린더</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-user-select: none; user-select: none; }
    :root {
      --bg: #fdfcff; --bg2: #f5f2ff;
      --accent: #9b7fd4; --accent2: #c4b0e8; --accent-light: #f0ebff;
      --text: #2e2840; --text2: #8878aa; --border: #e0d8f5;
      --shadow: 0 8px 32px rgba(100,80,160,0.18);
      --radius: 16px; --radius-sm: 8px;
    }
    html, body { width: 300px; height: 340px; overflow: hidden; background: transparent; font-family: 'Segoe UI','Malgun Gothic',sans-serif; font-size: 13px; }

    .container { width: 300px; height: 340px; background: var(--bg); border-radius: var(--radius); box-shadow: var(--shadow); border: 1.5px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }

    .cal-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px 8px; background: linear-gradient(135deg, #ddd0f8, #cfc0f0); border-bottom: 1px solid var(--border); cursor: grab; }
    .cal-header:active { cursor: grabbing; }
    .cal-nav { display: flex; align-items: center; gap: 6px; }
    .btn-nav { background: none; border: none; cursor: pointer; color: #6a4faa; font-size: 14px; font-weight: 700; padding: 2px 6px; border-radius: 6px; }
    .btn-nav:hover { background: rgba(106,79,170,0.12); }
    .cal-month-label { font-size: 13px; font-weight: 700; color: #6a4faa; min-width: 70px; text-align: center; }
    .cal-header-right { display: flex; align-items: center; gap: 4px; }
    .btn-today, .btn-close-cal { background: none; border: none; cursor: pointer; font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 6px; color: #6a4faa; }
    .btn-today { background: var(--accent-light); border: 1px solid var(--accent2); }
    .btn-today:hover { background: var(--accent2); }
    .btn-close-cal { font-size: 12px; }
    .btn-close-cal:hover { background: rgba(106,79,170,0.12); }

    .weekdays { display: grid; grid-template-columns: repeat(7, 1fr); padding: 6px 8px 2px; background: var(--bg2); }
    .wd { text-align: center; font-size: 10px; font-weight: 700; padding: 2px 0; color: var(--text2); }
    .wd:first-child { color: #e07090; }
    .wd:last-child { color: #7090e0; }

    .days-grid { flex: 1; display: grid; grid-template-columns: repeat(7, 1fr); padding: 4px 8px; gap: 2px; }
    .day {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 30px; border-radius: 8px;
      font-size: 12px; cursor: pointer;
      color: var(--text);
      transition: all 0.15s;
      border: 2px solid transparent;
      position: relative;
    }
    .day:hover { background: var(--accent-light); }
    .day.other-month { color: #ccc; }
    .day.sun { color: #e07090; }
    .day.sat { color: #7090e0; }
    .day.today { font-weight: 800; }
    .day.hovered { border-color: var(--accent); }
    .day.selected { background: var(--accent); color: white !important; font-weight: 700; }

    .todo-dot { display: block; width: 5px; height: 5px; border-radius: 50%; margin: 2px auto 0; flex-shrink: 0; }
    .todo-dot-pending { background: #e05070; }
    .todo-dot-done { background: #3aaa5c; }
    .day.selected .todo-dot-pending,
    .day.selected .todo-dot-done { background: white; }

    .cal-footer { padding: 8px 12px; background: var(--bg2); border-top: 1px solid var(--border); font-size: 12px; font-weight: 600; color: var(--accent); text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="cal-header" id="calDragHandle">
      <div class="cal-nav">
        <button class="btn-nav" id="btnPrevMonth">‹</button>
        <span class="cal-month-label" id="monthLabel"></span>
        <button class="btn-nav" id="btnNextMonth">›</button>
      </div>
      <div class="cal-header-right">
        <button class="btn-today" id="btnToday">오늘로</button>
        <button class="btn-close-cal" id="btnClose">✕</button>
      </div>
    </div>

    <div class="weekdays">
      <div class="wd">일</div><div class="wd">월</div><div class="wd">화</div>
      <div class="wd">수</div><div class="wd">목</div><div class="wd">금</div><div class="wd">토</div>
    </div>

    <div class="days-grid" id="daysGrid"></div>

    <div class="cal-footer" id="calFooter">날짜를 선택하세요</div>
  </div>

  <script src="calendar.js"></script>
</body>
</html>
`;

fs.writeFileSync('src/renderer/calendar/index.html', calendarHtml, 'utf8');
console.log('calendar/index.html 완료');

// ── calendar.js (전체 재작성) ────────────────────────────────
const calendarJs = `const state = {
  viewYear: 0,
  viewMonth: 0,
  selectedDate: '',
  hoveredDate: '',
  todayStr: '',
  todoStatusCache: {},
};

function pad(n) { return String(n).padStart(2, '0'); }
function toDateStr(year, month, day) { return year + '-' + pad(month + 1) + '-' + pad(day); }
function getTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
}

async function getDateStatus(dateStr) {
  const todos = await window.electronAPI.getTodos(dateStr);
  if (!todos || todos.length === 0) return 'none';
  const hasPending = todos.some(t => !t.done);
  return hasPending ? 'pending' : 'done';
}

async function loadMonthTodos(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const promises = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(year, month, d);
    promises.push(getDateStatus(dateStr).then(status => { state.todoStatusCache[dateStr] = status; }));
  }
  await Promise.all(promises);
}

async function renderCalendar() {
  const { viewYear, viewMonth, selectedDate, hoveredDate, todayStr } = state;
  document.getElementById('monthLabel').textContent = viewYear + '년 ' + (viewMonth + 1) + '월';

  await loadMonthTodos(viewYear, viewMonth);

  const grid = document.getElementById('daysGrid');
  grid.innerHTML = '';

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

  for (let i = firstDay - 1; i >= 0; i--) grid.appendChild(createDayEl(viewYear, viewMonth - 1, daysInPrev - i, true));
  for (let d = 1; d <= daysInMonth; d++) grid.appendChild(createDayEl(viewYear, viewMonth, d, false));
  const total = grid.children.length;
  const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= remaining; d++) grid.appendChild(createDayEl(viewYear, viewMonth + 1, d, true));

  await updateFooter(selectedDate);
}

function createDayEl(year, month, day, otherMonth) {
  const d = new Date(year, month, day);
  const realYear = d.getFullYear(), realMonth = d.getMonth(), realDay = d.getDate();
  const dateStr = toDateStr(realYear, realMonth, realDay);

  const el = document.createElement('div');
  el.className = 'day';
  el.dataset.date = dateStr;

  const numSpan = document.createElement('span');
  numSpan.textContent = realDay;
  el.appendChild(numSpan);

  const status = state.todoStatusCache[dateStr];
  if (status === 'pending') {
    const dot = document.createElement('span');
    dot.className = 'todo-dot todo-dot-pending';
    el.appendChild(dot);
  } else if (status === 'done') {
    const dot = document.createElement('span');
    dot.className = 'todo-dot todo-dot-done';
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
      clearTimeout(clickTimer); clickTimer = null;
      selectDate(dateStr);
    } else {
      clickTimer = setTimeout(() => { clickTimer = null; hoverDate(dateStr); }, 250);
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
  if (!dateStr) { document.getElementById('calFooter').textContent = '날짜를 선택하세요'; return; }
  const count = await window.electronAPI.getTodoCount(dateStr);
  const [, month, day] = dateStr.split('-').map(Number);
  document.getElementById('calFooter').textContent = month + '월 ' + day + '일 할일 [' + count + '건]';
}

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
document.getElementById('btnClose').addEventListener('click', () => { window.electronAPI.closeCalendar(); });

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
`;

fs.writeFileSync('src/renderer/calendar/calendar.js', calendarJs, 'utf8');
console.log('calendar.js 완료');
console.log('캘린더 빨강/초록 점 적용 완료!');