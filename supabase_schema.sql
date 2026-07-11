-- 사주 추천 데이터 저장 테이블
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.

create table if not exists public.saju_logs (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  birth_date  text,        -- 생년월일 (YYYY-MM-DD)
  birth_time  text,        -- 태어난 시간 (십이지시 문자열)
  calendar    text,        -- 양력 / 음력
  gender      text,        -- 성별
  saju        text,        -- 사주 풀이
  advice      text,        -- 오늘의 운세 한 줄
  numbers     int[],       -- 추천 번호 6개
  bonus       int          -- 보너스 번호
);

-- 자유 대화(챗봇 질문/답변) 저장 테이블
create table if not exists public.chat_logs (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  question    text,        -- 사용자 질문
  answer      text         -- 챗봇 답변
);

-- 서버리스 함수는 service_role 키로 접속하므로 RLS를 켜도 서버 저장/조회에는 영향이 없습니다.
-- (service_role 은 RLS 를 우회합니다. anon 키로 브라우저에서 직접 접근하지 않는 한 켜두는 것을 권장.)
alter table public.saju_logs enable row level security;
alter table public.chat_logs enable row level security;
