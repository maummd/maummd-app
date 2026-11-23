# 마음엠디 (MaumMD) — CBT 가족치료 관리 앱

가족상담연구소 마음재활정원의 가족치료 프로그램 관리 앱입니다. 매주 일요일 1년(52회기) 과정을 운영하고, 시작 · 6개월 · 12개월에 평가합니다.

- 패키지 이름: `com.maumm.maummd`
- 대상 Android: 8.0 이상 (minSdk 26), targetSdk 36
- 서버: Firebase (Authentication + Firestore, 서울 리전 asia-northeast3)

## 누가 무엇을 하나요

| | 상담자 | 가족 구성원 |
| --- | --- | --- |
| 가족 등록 · 52주 회기표 | 만들고 고침 | 일정만 봄 |
| 상담 기록(SOAP) | 작성 · 열람 | 볼 수 없음 |
| CBT 과제 | 내고 피드백 | 자기 과제만 보고 제출 |
| PHQ-9 · GAD-7 | 문항 점수 입력 (종이 검사 후) | 볼 수 없음 |
| 가족기능 자체 평가 | 결과 열람 | 본인이 작성 |
| 수료 조건 | 자동 확인 (16주 + 매월 과제) | - |

- PHQ-9 9번 문항(죽음 · 자해 생각)이 1점 이상이면 상담자 홈에 안전 평가 알림이 뜹니다.
- 가족 구성원은 상담자가 발급한 **구성원별 초대 코드**로만 가입할 수 있습니다.
- 앱에서는 실명 대신 별칭(예: 정○연)을 씁니다.

## 폴더

- `src/` — 앱 화면과 동작 (`curriculum.js`: 52주 표준안 · 평가 문항, `store.js`: 저장소, `app.js`: 화면, `config.js`: Firebase 설정)
- `firestore.rules` — 서버 보안 규칙 (누가 무엇을 읽고 쓰는지)
- `build.mjs` — `src/`를 `web/index.html` 한 파일로 묶음 (`npm ci && node build.mjs`)
- `android/` — 안드로이드 앱 (화면을 감싸는 WebView)
- `.github/workflows/android.yml` — 올릴 때마다 앱 파일 자동 생성

## 처음 설정 (Firebase)

1. https://console.firebase.google.com 에서 프로젝트 `maummd`를 만듭니다.
2. **Authentication → 로그인 방법 → 이메일/비밀번호** 사용 설정.
3. **Firestore Database → 데이터베이스 만들기**, 위치 **asia-northeast3 (서울)**, 프로덕션 모드.
4. **Firestore → 규칙** 탭에 `firestore.rules` 내용을 붙여 넣고 **게시**.
5. **프로젝트 설정 → 내 앱 → 웹 앱 추가**에서 나온 `firebaseConfig` 값을 `src/config.js`의 `FIREBASE_CONFIG`에 넣습니다.
6. 상담자 이메일은 `src/config.js`의 `COUNSELOR_EMAIL`과 `firestore.rules`의 이메일 두 곳이 같아야 합니다.

`FIREBASE_CONFIG`가 `null`이면 **체험 모드**로 동작합니다(이 기기에만 저장, 상담자 · 내담자 화면 전환 가능).

## 상담자 첫 로그인

1. 앱에서 상담자 이메일로 **가입** → 앱의 **인증 메일 보내기** → 메일의 링크 누르기 → 다시 로그인.
2. 이메일 인증 전에는 보안 규칙 때문에 기록이 저장되지 않습니다.

## 서명 키와 배포

- 저장소 **Settings → Secrets and variables → Actions**에 `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`를 등록하면 서명된 출시 파일이 만들어집니다.
- Android Developer Console에 패키지 이름 `com.maumm.maummd`와 서명 키 SHA-256 지문을 등록해야 다른 휴대폰에 설치됩니다.
- 회원 배포: **Actions → 최근 실행 → Artifacts → 출시용-AAB-APK**의 `app-release.apk`를 구글 드라이브에 올리고 링크를 공유합니다. (Gmail · 카카오톡은 APK 파일 전송을 막습니다.)

## 52주 표준안

1단계 관계 형성과 이해(1~13주) → 2단계 생각 바꾸기와 의사소통(14~26주, 26주 6개월 평가) → 3단계 행동 변화와 관계 강화(27~39주) → 4단계 유지와 종결(40~52주, 51주 12개월 평가). 회기 주제 · 목표 · 과제는 가족마다 앱에서 고칠 수 있습니다.
