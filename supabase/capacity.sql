-- 선착순 10팀 자동 마감. setup.sql → admin.sql 다음에 Supabase SQL Editor에서 실행합니다.
-- 기존 신청 데이터는 건드리지 않습니다. 여러 번 실행해도 안전합니다(create or replace).
-- 정원 계산: status가 'withdrawn'(취소)이 아닌 신청 = 팀 수. 취소로 바꾸면 자리가 다시 열립니다.

create or replace function public.gagok_kids_market_team_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
 select count(*)::integer from public.gagok_kids_market_applications where status <> 'withdrawn';
$$;

create or replace function public.gagok_kids_market_apply(
 p_guardian_name text,
 p_phone text,
 p_children_count integer,
 p_items text,
 p_consent_version text,
 p_retention_days integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
 -- 동시 제출을 한 줄로 세워 정원 초과를 막습니다(트랜잭션 끝나면 자동 해제).
 perform pg_advisory_xact_lock(hashtext('gagok_kids_market_apply'));
 if exists (select 1 from public.gagok_kids_market_applications where phone = p_phone) then
  return 'duplicate';
 end if;
 select count(*) into n from public.gagok_kids_market_applications where status <> 'withdrawn';
 if n >= 10 then
  return 'full';
 end if;
 insert into public.gagok_kids_market_applications
  (guardian_name, phone, children_count, items, consent_version, retention_days)
 values
  (p_guardian_name, p_phone, p_children_count::smallint, p_items, p_consent_version, p_retention_days::smallint);
 return 'ok';
end;
$$;

revoke all on function public.gagok_kids_market_team_count() from public, anon, authenticated;
revoke all on function public.gagok_kids_market_apply(text,text,integer,text,text,integer) from public, anon, authenticated;
grant execute on function public.gagok_kids_market_team_count() to service_role;
grant execute on function public.gagok_kids_market_apply(text,text,integer,text,text,integer) to service_role;

-- Data API가 새 함수를 바로 인식하도록 스키마 캐시를 새로 고칩니다.
notify pgrst, 'reload schema';
