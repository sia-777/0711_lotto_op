# 사주 로또 추첨기

생년월일과 태어난 시간을 입력하면 사주를 풀이해 로또 번호를 추천하고, 볼 머신 애니메이션으로 뽑아주는 웹앱입니다.

## 구조

- `index.html` — 프론트엔드 (사주 입력 폼 + 챗봇 UI + 볼 머신 애니메이션)
- `api/saju.js` — Vercel 서버리스 함수. OpenAI 호출을 서버에서 대신 처리합니다.
  **API 키는 서버 환경변수에서만 읽으며 브라우저에 노출되지 않습니다.**

## Vercel 배포

1. 이 저장소를 Vercel 프로젝트로 임포트합니다. (별도 빌드 설정 불필요 — 정적 사이트 + `/api` 자동 인식)
2. **Settings → Environment Variables** 에서 아래 값을 등록합니다.

   | 이름 | 필수 | 설명 |
   |------|------|------|
   | `OPENAI_API_KEY` | ✅ | OpenAI API 키 |
   | `OPENAI_MODEL` | 선택 | 사용할 모델 (기본값 `gpt-5.4-mini`) |
   | `SUPABASE_URL` | 선택 | Supabase 프로젝트 URL (데이터 저장 시) |
   | `SUPABASE_SERVICE_ROLE_KEY` | 선택 | Supabase service_role 키 (서버 전용 비밀 키) |
   | `SUPABASE_TABLE` | 선택 | 사주 저장 테이블명 (기본값 `saju_logs`) |
   | `SUPABASE_CHAT_TABLE` | 선택 | 대화 저장 테이블명 (기본값 `chat_logs`) |
   | `ADMIN_TOKEN` | 선택 | 관리자 조회 페이지 접근 토큰 (설정해야 `/admin.html` 사용 가능) |

3. 배포하면 `https://<프로젝트>.vercel.app` 에서 동작합니다.

## 데이터 저장 (Supabase)

사주 추천 시 입력값(생년월일·태어난 시간·성별)과 결과(사주 풀이·추천 번호)가
`api/saju.js` 서버 함수에서 Supabase 테이블 `saju_logs` 에 저장됩니다.

1. Supabase 프로젝트를 만들고 `supabase_schema.sql` 을 SQL Editor 에서 실행해 테이블을 생성합니다.
2. **Project Settings → API** 에서 `Project URL` 과 `service_role` 키를 복사합니다.
3. 위 표의 `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 환경변수에 등록합니다.

> `service_role` 키는 RLS 를 우회하는 관리자 키입니다. **서버 환경변수에만** 두고 절대 브라우저/깃에 노출하지 마세요.
> 환경변수가 없으면 저장만 건너뛰고 추천 기능은 정상 동작합니다.

### 개인정보 동의

입력 폼의 **동의 체크박스**가 체크된 경우에만 데이터가 저장됩니다. 미체크 시 추천/대화는
정상 동작하되 서버에 아무것도 저장하지 않습니다. 사주 저장은 `saju_logs`, 자유 대화는 `chat_logs` 에 기록됩니다.

### 관리자 조회 페이지

`/admin.html` 에서 저장된 기록(사주 / 대화)을 조회할 수 있습니다.

- `ADMIN_TOKEN` 환경변수를 설정한 뒤, 페이지에서 그 토큰을 입력해야 열람됩니다.
- 조회는 서버 함수 `/api/logs` 가 토큰을 검증한 뒤 Supabase 에서 최근 200건을 읽어옵니다.
- `ADMIN_TOKEN` 이 없으면 조회 기능은 비활성화(503)됩니다.

> 모델명을 바꾸려면 `OPENAI_MODEL` 환경변수만 수정하면 됩니다. 지정한 모델명이 유효하지 않으면 OpenAI가 오류를 반환하니, 계정에서 사용 가능한 모델명인지 확인하세요.

## 로컬 실행

정적 파일이라 브라우저로 `index.html`을 바로 열면 볼 머신/랜덤 추첨은 동작하지만, **사주 추천(`/api/saju`)은 서버가 필요**합니다.

```bash
npm i -g vercel
vercel dev          # .env.local 에 OPENAI_API_KEY 설정 후 실행
```

## 참고

사주 풀이와 번호 추천은 재미를 위한 것이며 당첨을 보장하지 않습니다.
