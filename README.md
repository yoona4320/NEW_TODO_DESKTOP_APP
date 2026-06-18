# Todo Desktop Float 🐱

항상 화면 위에 떠 있는 귀여운 데스크탑 할일 관리 앱 (Electron 기반)

---

## 초기 앱 구현 및 UI/UX 전면 설정 [v1.0.0]

### 🏗 프로젝트 초기 세팅
- Electron 기반 데스크탑 할일 앱 초기 구조 생성
- electron-store, electron-updater, electron-builder 세팅
- GitHub Actions 자동 빌드/배포 워크플로우 추가 (태그 push 시 EXE 자동 생성)

### 🪟 창 구조
- 화면 위에 항상 떠다니는 캐릭터 아이콘 창 (드래그 이동 가능)
- 캐릭터 클릭 시 할일 패널 열기/닫기
- 작업표시줄 트레이 아이콘 상주 + 우클릭 종료 메뉴
- 패널 작업표시줄에도 표시
- 캘린더 팝업, 아이콘 선택 창 각각 독립 이동 가능
- 화면 밖 벗어남 방지, 창 위치 저장

### ✅ 할일 기능
- 날짜별 할일 목록 관리
- 할일 추가/수정/삭제 (삭제 시 확인 팝업)
- 현재/완료 탭 전환
- 상세 화면에서 제목, 내용, 아이콘, 완료 여부 수정
- 다음날 복사 기능

### 📅 캘린더
- 단일 클릭: 테두리 미리보기, 더블 클릭: 날짜 확정
- 오늘로 버튼, 해당 날짜 할일 건수 표시
- 할일 저장된 날짜 하단 빨간점 표기

### 🎨 디자인
- 전체 테마 연보라 계열로 설정
- 버전 표시 + 업데이트 버튼을 "할일 관리" 텍스트 바로 옆에 배치
- 헤더 캐릭터 이미지, 할일 목록 아이콘 전부 이모지 → 이미지 파일로 교체

### 🐾 캐릭터/아이콘
- 15종 동물 이미지 적용 (고양이/강아지/개구리/거북이/햄스터/토끼/병아리/양/여우/수달/돼지/펭귄/공룡/곰/호랑이)
- 🎨 버튼으로 캐릭터 변경 시 떠다니는 아이콘 + 헤더 동시 반영
- 할일별 개별 아이콘 설정 가능

### 🔄 업데이트
- GitHub Releases 기반 자동 업데이트 (electron-updater)
- 업데이트 없을 시 / 있을 시 각각 다른 안내 문구

---

## 📁 프로젝트 구조

```
NEW_TODO_DESKTOP_APP/
├── .github/workflows/build.yml   ← GitHub 자동 빌드
├── assets/
│   ├── characters/               ← 동물 캐릭터 이미지 15종
│   └── icons/                    ← 트레이/앱 아이콘
├── src/
│   ├── main/
│   │   ├── main.js               ← Electron 메인 프로세스
│   │   └── preload.js            ← IPC 보안 브릿지
│   └── renderer/
│       ├── characters.js         ← 캐릭터 이미지 base64 내장
│       ├── main/                 ← 메인 패널
│       ├── calendar/             ← 캘린더 팝업
│       ├── icon-picker/          ← 아이콘 선택창
│       └── char/                 ← 떠다니는 캐릭터 창
└── package.json
```

---

## 🚀 개발 실행

```bash
npm install
npm start
```

## 📦 배포

```bash
git add .
git commit -m "커밋 메시지"
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

GitHub Actions가 자동으로 EXE 빌드 후 Releases에 업로드합니다.
