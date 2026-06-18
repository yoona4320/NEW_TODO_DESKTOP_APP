const ICONS = [
  {key:'cat',label:'고양이'},{key:'dog',label:'강아지'},{key:'frog',label:'개구리'},
  {key:'turtle',label:'거북이'},{key:'hamster',label:'햄스터'},{key:'rabbit',label:'토끼'},
  {key:'chick',label:'병아리'},{key:'sheep',label:'양'},{key:'fox',label:'여우'},
  {key:'otter',label:'수달'},{key:'pig',label:'돼지'},{key:'penguin',label:'펭귄'},
  {key:'dinosaur',label:'공룡'},{key:'bear',label:'곰'},{key:'tiger',label:'호랑이'},
];

let currentMode = 'todo', currentTodoId = null;

function renderIcons() {
  const grid = document.getElementById('iconsGrid');
  grid.innerHTML = '';
  ICONS.forEach(icon => {
    const btn = document.createElement('button');
    btn.className = 'icon-btn';
    const img = document.createElement('img');
    img.src = CHARACTER_IMAGES[icon.key] || CHARACTER_IMAGES['cat'];
    img.alt = icon.label;
    const label = document.createElement('span');
    label.className = 'icon-label';
    label.textContent = icon.label;
    btn.appendChild(img); btn.appendChild(label);
    btn.addEventListener('click', () => {
      document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (currentMode === 'todo') {
        window.electronAPI.sendIconSelected(currentTodoId, icon.key);
      } else {
        window.electronAPI.setCharIcon(icon.key);
        setTimeout(() => window.electronAPI.closeIconPicker(), 300);
      }
    });
    grid.appendChild(btn);
  });
}

let isDragging = false, startX = 0, startY = 0;
document.getElementById('dragHandle').addEventListener('mousedown', e => {
  if (e.target.tagName === 'BUTTON') return;
  isDragging = true; startX = e.screenX; startY = e.screenY; e.preventDefault();
});
document.addEventListener('mousemove', e => {
  if (!isDragging) return;
  window.electronAPI.dragWindow('icon-picker', e.screenX - startX, e.screenY - startY);
  startX = e.screenX; startY = e.screenY;
});
document.addEventListener('mouseup', () => { isDragging = false; });
document.getElementById('btnClose').addEventListener('click', () => window.electronAPI.closeIconPicker());

window.electronAPI.onInitPicker(({ mode, todoId }) => {
  currentMode = mode; currentTodoId = todoId;
  document.getElementById('modeLabel').textContent = mode === 'char' ? '캐릭터 & 헤더 아이콘 변경' : '할일 아이콘 선택';
  document.getElementById('headerTitle').textContent = mode === 'char' ? '🎨 캐릭터 변경' : '🎨 아이콘 선택';
  renderIcons();
});
