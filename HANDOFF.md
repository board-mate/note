# 모임 운영 웹앱 인수인계서

## 1. 프로젝트 목적

로그인 없이 외부망에서 여러 명이 편하게 사용하는 **모임 운영 웹앱**이다.

핵심 원칙:

- 회원가입/로그인 없음
- URL 접속 즉시 읽기/작성/수정 가능
- 모바일 우선이지만 PC에서도 보기 좋게
- 공지사항 / 일정 / 달력 / 회의록 / Action Item을 한 곳에서 관리
- 삭제 실수에 대비해 회의록은 휴지통 방식
- 작성자 이름은 로그인 대신 브라우저 localStorage에 기억

현재 버전: **v4**

---

## 2. 현재 구현된 주요 기능

### 홈

첫 화면에서 다음을 한 번에 본다.

- 다음 모임 일정
- 공지사항
- 최근 회의록
- 남은 할 일
- 예정 일정

PC에서는 넓은 대시보드 형태, 모바일에서는 세로 카드형으로 보인다.

### 회의록

가능한 작업:

- 회의록 전체 목록
- 회의 제목 수정
- 분류/프로젝트 수정
- 날짜/시간/장소 수정
- 참석자 수정
- 한 줄 요약
- 논의 내용
- 결정사항
- 참고 링크
- Action Item 추가/삭제
- 담당자 / 기한 / 완료 여부
- 검색
- 프로젝트 필터
- 휴지통 이동 및 복원
- 수정 이력 저장

회의 제목은 두 방식으로 수정할 수 있다.

1. 회의록 카드의 `제목 수정`
2. 회의록을 열어 제목 입력란 직접 수정

### 공지사항

- 작성
- 수정
- 삭제
- 상단 고정

### 일정

- 일정명
- 날짜
- 시간
- 장소
- 메모
- 수정 / 삭제

### 달력

- 월간 달력
- 이전 달 / 오늘 / 다음 달
- 회의록 날짜 표시
- 별도 일정 표시
- 날짜 클릭 → 해당 날짜의 회의/일정 하단 표시
- 회의 클릭 → 회의록 바로 수정
- 일정 클릭 → 일정 바로 수정
- 선택 날짜에 새 일정 추가

### 할 일

모든 회의록의 Action Item을 자동으로 통합한다.

- 미완료 / 전체 전환
- 담당자 표시
- 기한 표시
- 목록에서 바로 완료 체크
- 해당 회의록으로 이동

---

## 3. 반응형 UI 구조

### 모바일

하단 고정 메뉴:

`홈 / 달력 / 회의록 / 할 일 / 공지`

특징:

- 한 손 사용을 고려한 큰 터치 영역
- 새 회의록 Floating Action Button
- 검색 영역 sticky
- 회의록/공지/일정 편집창은 화면 아래에서 올라오는 sheet 형태
- 달력은 모바일에서 일정명을 길게 표시하지 않고 점/막대 위주로 표시

### PC

상단 고정 메뉴:

`홈 / 달력 / 회의록 / 할 일 / 공지`

우측 빠른 작성:

- `+ 새 회의록`
- `+ 일정`

특징:

- 홈 대시보드 4열 활용
- 회의록 카드는 화면 폭에 따라 2~4열
- 월간 달력은 넓은 셀을 활용
- 1180~1240px 중심 폭 기준

---

## 4. 파일 구조

```text
meeting-minutes-webapp-v4/
├─ index.html
├─ styles.css
├─ app.js
├─ config.js
├─ schema.sql
├─ manifest.webmanifest
├─ sw.js
├─ icon-192.png
├─ icon-512.png
├─ README.md
└─ HANDOFF.md
```

### index.html

화면 구조와 dialog/form 정의.

### styles.css

전체 디자인 및 모바일/태블릿/PC 반응형 레이아웃.

### app.js

주요 기능 전체:

- 화면 전환
- 회의록 CRUD
- 공지 CRUD
- 일정 CRUD
- 달력 렌더링
- Action Item 통합
- localStorage 미리보기
- Supabase 연동

### config.js

Supabase 연결값.

현재 기본값은 미연결 상태:

```js
window.APP_CONFIG = {
  appName: "모임 운영",
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_PUBLISHABLE_OR_ANON_KEY"
};
```

### schema.sql

Supabase DB 스키마와 RLS 정책.

### manifest.webmanifest / sw.js

홈 화면 추가(PWA)와 기본 정적 자산 캐싱.

---

## 5. 데이터 구조

### meetings

회의록 테이블.

주요 컬럼:

- id
- project
- title
- meeting_date
- start_time
- location
- attendees
- summary
- discussion
- decisions
- actions(jsonb)
- links
- author
- created_at
- updated_at
- deleted_at

### meeting_revisions

회의록 수정 이력.

### announcements

공지사항.

### schedules

일정.

---

## 6. Supabase 연결 방법

1. Supabase 프로젝트 생성
2. SQL Editor에서 `schema.sql` 실행
3. Supabase Project URL 확인
4. Publishable key 또는 anon key 확인
5. `config.js` 수정
6. 정적 호스팅에 전체 폴더 배포

브라우저에는 **service_role key를 절대 넣지 않는다.**

---

## 7. 현재 운영 방식

Supabase 설정 전:

- localStorage 기반 미리보기
- 한 브라우저에서만 데이터 유지
- 여러 사용자 공유 불가

Supabase 설정 후:

- 여러 사용자가 같은 URL에서 동일 데이터 사용
- 로그인 없음
- 누구나 읽기/작성/수정 가능

이 구조는 사용자 요구에 따른 의도된 설계다.

---

## 8. 현재 UX 흐름

### 모바일

```text
홈
 ↓
달력 / 회의록 / 할 일 / 공지
 ↓
항목 터치
 ↓
수정 sheet
 ↓
저장
```

### PC

```text
상단 메뉴
 ↓
홈 / 달력 / 회의록 / 할 일 / 공지
 ↓
목록 또는 카드
 ↓
편집 dialog
```

---

## 9. 다음 대화에서 이어서 작업할 때의 요청문

새 대화에 아래 내용을 그대로 붙여넣으면 된다.

```text
첨부한 HANDOFF.md와 meeting-minutes-webapp-v4.zip을 기준으로
'모임 운영 웹앱' 작업을 이어서 해줘.

기존 기능과 구조를 깨지 말고 현재 v4를 기준으로 수정해야 한다.
모바일/PC 반응형을 모두 유지하고,
로그인 없는 외부망 공개형 구조를 유지한다.

수정 전 HANDOFF.md를 먼저 읽고,
현재 구조를 파악한 뒤 변경사항을 적용해줘.
```

---

## 10. 향후 추가하면 좋은 기능

우선순위 제안:

1. 파일/사진 첨부
2. 회의록별 댓글 또는 간단 메모
3. 반복 일정
4. 달력에서 일정 드래그 이동
5. 공지 읽음 표시
6. 회의록 템플릿
7. 회의 시작 시 `새 회의록` 자동 생성
8. 모바일 공유 버튼
9. QR 코드로 모임 페이지 공유
10. 웹앱 이름/로고/모임명 설정 화면

---

## 11. 수정 시 주의사항

- 모바일 하단 5탭 구조를 깨지 말 것
- PC 상단 메뉴와 모바일 하단 메뉴는 같은 `data-nav` 구조를 사용한다
- 회의록 Action Item은 별도 테이블이 아니라 `meetings.actions` JSON 배열이다
- 할 일 화면은 이 JSON을 전체 회의록에서 모아 렌더링한다
- 회의록 삭제는 실제 DELETE가 아니라 `deleted_at`을 이용한 soft delete다
- 공지/일정은 현재 실제 DELETE 방식이다
- 달력은 `meetings.meeting_date`와 `schedules.event_date`를 함께 렌더링한다
- Supabase 연결 전 localStorage 미리보기 모드를 유지해야 한다
- 공개형 구조이므로 RLS에서 anon 읽기/쓰기 정책을 의도적으로 허용한다

---

## 12. 현재 버전 기준

- 프로젝트명: 모임 운영 웹앱
- 현재 버전: v4
- 방향: 모바일 앱처럼 단순하게 + PC에서는 대시보드처럼 넓게
- 인증: 없음
- DB: Supabase
- 프론트엔드: 순수 HTML / CSS / JavaScript
- 배포: 정적 호스팅
