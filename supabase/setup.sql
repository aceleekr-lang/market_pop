-- Supabase SQL Editor에서 실행합니다.
create table if not exists public.gagok_kids_market_applications (
 id uuid primary key default gen_random_uuid(),
 guardian_name text not null check (length(guardian_name) between 2 and 40),
 phone text not null unique check (phone ~ '^01[016789][0-9]{7,8}$'),
 children_count smallint not null check (children_count between 1 and 20),
 items text not null check (length(items) between 2 and 300),
 consent_version text not null check (length(consent_version) between 1 and 40),
 retention_days smallint not null check (retention_days between 1 and 365),
 created_at timestamptz not null default now(),
 status text not null default 'received' check (status in ('received','confirmed','withdrawn'))
);
alter table public.gagok_kids_market_applications enable row level security;
revoke all on table public.gagok_kids_market_applications from public, anon, authenticated, service_role;
grant insert on table public.gagok_kids_market_applications to service_role;

-- 운영자: 실제 참여가 확정된 팀만 집계 (5팀 미만이면 키즈마켓 미운영)
-- select count(*) as confirmed_teams from public.gagok_kids_market_applications where status='confirmed';

-- 운영자: 보유 기한이 지난 신청 정보 삭제 (Supabase SQL Editor 또는 운영자가 설정한 스케줄)
-- delete from public.gagok_kids_market_applications
-- where now() >= timestamptz '2026-11-22 00:00:00+09' + retention_days * interval '1 day';
