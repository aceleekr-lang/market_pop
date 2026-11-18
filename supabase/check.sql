-- 설치 상태 점검(읽기 전용). Supabase SQL Editor에서 실행하면 무엇이 설치됐는지 한눈에 보입니다.
-- 결과가 모두 true면 setup.sql·admin.sql·capacity.sql이 적용된 상태입니다.
select
 to_regclass('public.gagok_kids_market_applications') is not null      as "1_setup_신청테이블",
 to_regprocedure('public.gagok_admin_login_allowed()') is not null      as "2_admin_로그인제한",
 to_regprocedure('public.gagok_kids_market_team_count()') is not null   as "3_capacity_팀수",
 to_regprocedure('public.gagok_kids_market_apply(text,text,integer,text,text,integer)') is not null as "3_capacity_접수";

-- 신청테이블이 있으면 아래로 현재 집계를 봅니다.
-- select status, count(*) from public.gagok_kids_market_applications group by status;
