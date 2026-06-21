const fs = require('fs');

let content = fs.readFileSync('src/renderer/main/app.js', 'utf8');

// showModal 함수를 confirm/alert 구분하도록 수정
const oldModal = `let _modalCallback = null;
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
});`;

const newModal = `let _modalCallback = null;
function showModal(msg, onYes) {
  _modalCallback = onYes;
  document.getElementById('modalMsg').textContent = msg;
  document.getElementById('modalNo').style.display = '';
  document.getElementById('modalYes').textContent = '예';
  document.getElementById('modalOverlay').style.display = '';
}
function showAlert(msg) {
  _modalCallback = null;
  document.getElementById('modalMsg').textContent = msg;
  document.getElementById('modalNo').style.display = 'none';
  document.getElementById('modalYes').textContent = '닫기';
  document.getElementById('modalOverlay').style.display = '';
}
document.getElementById('modalYes').addEventListener('click', () => {
  document.getElementById('modalOverlay').style.display = 'none';
  if (_modalCallback) { _modalCallback(); _modalCallback = null; }
});
document.getElementById('modalNo').addEventListener('click', () => {
  document.getElementById('modalOverlay').style.display = 'none';
  _modalCallback = null;
});`;

content = content.replace(oldModal, newModal);

// 업데이트 내역 없음 부분을 showAlert로 변경
const oldUpdateCheck = `if (!info) { document.getElementById('modalNo').style.display = 'none'; showModal('업데이트 내역이 없습니다.', () => {}); }`;
const newUpdateCheck = `if (!info) { showAlert('업데이트 내역이 없습니다.'); }`;
content = content.replace(oldUpdateCheck, newUpdateCheck);

// 오류 메시지도 동일하게
const oldErr = `} catch { showModal('업데이트 확인 중 오류가 발생했습니다.', () => {}); }`;
const newErr = `} catch { showAlert('업데이트 확인 중 오류가 발생했습니다.'); }`;
content = content.replace(oldErr, newErr);

// 업데이트 다운로드 완료 메시지도 alert성이지만 설치 진행해야하니 confirm 유지 (그대로 둠)
// "업데이트 준비 완료" 부분은 onYes 콜백이 필요해서 showModal 그대로

fs.writeFileSync('src/renderer/main/app.js', content, 'utf8');
console.log('app.js 수정 완료 - 업데이트 없음 시 닫기 버튼만 표시');


let mainContent = fs.readFileSync('src/main/main.js', 'utf8');

// app.whenReady 안에서 주기적으로 alwaysOnTop 재설정 (창이 사라지는 현상 방지)
const old = `app.whenReady().then(() => {`;
const new_ = `app.whenReady().then(() => {
  // 일정 시간마다 창이 항상 위에 뜨도록 재확인 (시스템 이벤트로 풀리는 경우 방지)
  setInterval(() => {
    if (charWindow && !charWindow.isDestroyed()) {
      charWindow.setAlwaysOnTop(true, 'screen-saver');
      if (!charWindow.isVisible()) charWindow.show();
    }
    if (panelWindow && !panelWindow.isDestroyed() && isPanelVisible) {
      panelWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  }, 5000);
`;
mainContent = mainContent.replace(old, new_);

// charWindow 생성 시 setAlwaysOnTop 레벨 강화
const oldChar = `charWindow.loadFile(path.join(__dirname, '../renderer/char/index.html'));`;
const newChar = `charWindow.loadFile(path.join(__dirname, '../renderer/char/index.html'));
  charWindow.setAlwaysOnTop(true, 'screen-saver');
  charWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });`;
mainContent = mainContent.replace(oldChar, newChar);

fs.writeFileSync('src/main/main.js', mainContent, 'utf8');
console.log('main.js 수정 완료 - 캐릭터 창 항상 표시 강화');