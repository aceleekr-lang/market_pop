-- setup.sql 설치 후 이 파일을 SQL Editor에서 실행합니다.
-- 공개 브라우저 권한에는 신청 조회 권한을 부여하지 않습니다.
grant select (id, guardian_name,phone,children_count,items,status,created_at)
 on table public.gagok_kids_market_applications to service_role;

create schema if not exists gagok_admin_private;
revoke all on schema gagok_admin_private from public, anon, authenticated;
create table if not exists gagok_admin_private.login_guard (
 singleton boolean primary key default true check (singleton),
 since_at timestamptz not null,
 attempts integer not null check (attempts between 1 and 6)
);
revoke all on gagok_admin_private.login_guard from public, anon, authenticated, service_role;

-- 서버 인스턴스가 여러 개여도 동일 제한: 10분에 5회. UPDATE는 행 잠금으로 직렬화.
create or replace function public.gagok_admin_login_allowed()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
stamp timestamptz := statement_timestamp();
begin
 insert into gagok_admin_private.login_guard as g (singleton,since_at,attempts)
 values(true,stamp,1)
 on conflict(singleton) do update set
  since_at=case when g.since_at<=stamp-interval '10 minutes' then stamp else g.since_at end,
  attempts=case when g.since_at<=stamp-interval '10 minutes' then 1 else least(g.attempts+1,6) end
 returning attempts into n;
 return n<=5;
end;
$$;
revoke all on function public.gagok_admin_login_allowed() from public, anon, authenticated;
grant execute on function public.gagok_admin_login_allowed() to service_role;
