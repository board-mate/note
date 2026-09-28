# Arena 일정 공개 연동 (v10)

`note`의 `schedules` 테이블에 `is_public` 컬럼이 추가되었습니다.

- 새 일정 기본값: `false` (비공개)
- 일정 등록/수정에서 **Arena에 공개**를 체크한 경우만 `true`
- 기존 일정은 마이그레이션 후 모두 `false` 상태로 유지됩니다. 필요한 일정만 note에서 열어 공개 체크 후 저장하세요.

## Arena 쪽 권장 수정

Arena가 현재 다음처럼 원본 테이블을 읽는다면:

```js
supabase.from("schedules").select("*")
```

가장 단순한 수정은 공개 필터를 붙이는 것입니다.

```js
supabase
  .from("schedules")
  .select("*")
  .eq("is_public", true)
```

더 안전한 게시 전용 인터페이스는 이번 마이그레이션이 만드는 `arena_public_schedules` 뷰입니다.

```js
supabase
  .from("arena_public_schedules")
  .select("*")
```

REST를 직접 호출한다면 원본 테이블 URL에 `is_public=eq.true` 필터를 추가하거나, `/rest/v1/arena_public_schedules`를 사용하세요.

## 중요한 점

현재 BoardMate note는 로그인 없이 `anon` 권한으로 공동 편집하도록 만들어져 있습니다. 따라서 여기서 '비공개'는 **Arena에 게시하지 않음**이라는 의미입니다. DB 자체에서 권한 없는 사람에게 기밀로 숨기는 보안형 비공개가 필요하면 로그인/인증 및 RLS 구조를 별도로 도입해야 합니다.
