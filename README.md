# 가곡동 상상창고 · 와글와글 키즈마켓 모집 페이지

2026년 11월 21일(토) 제26회 떠들썩 플프마켓의 어린이 벼룩시장 모집용입니다. 보호자 신청 1건을 1팀으로 접수하며, 같은 번호로 제출하면 최초 접수만 저장합니다. 신청 폼은 참여를 자동 확정하지 않습니다. **5팀 미만 모집 시 와글와글 키즈마켓만 미운영**합니다.

## GitHub → Vercel → Supabase 연결

1. 압축을 풀고 이 README가 있는 폴더의 **내용 전체**를 GitHub 저장소에 올립니다. 실제 키가 들어간 파일은 커밋하지 않습니다.
2. Supabase에서 프로젝트를 만들고 **SQL Editor**에서 `supabase/setup.sql`을 실행합니다. Data API가 활성화되어 있어야 합니다. 프로젝트의 **Project URL**과 서버 전용 **Secret key**(`sb_secret_…`)를 확인합니다.
3. Vercel에서 **Add New → Project**로 GitHub 저장소를 Import합니다. Framework Preset은 **Other**, Root Directory는 이 README가 있는 폴더입니다. `vercel.json`이 정적 경로를 `public`, `api/`를 서버 함수로 사용하도록 구성합니다.
4. Vercel 환경 변수에 다음을 입력합니다. 비밀 키는 Vercel에만 넣고, 브라우저 공개 변수나 GitHub에는 넣지 않습니다.

| 변수 | 값 |
|---|---|
| `SUPABASE_URL` | 프로젝트 URL. 예시 모양: `https://project-ref.supabase.co` |
| `SUPABASE_SECRET_KEY` | Supabase 서버 전용 Secret key |
| `APPLICATION_CLOSE_AT` | 확정된 모집 마감 시각. 형식 예시: `2026-11-20T18:00:00+09:00` (예시이며 확정 시간이 아님) |
| `RETENTION_DAYS` | 운영팀이 확정한 보유 기간(행사 종료 후 일수, 1~365) |
| `APPLICATIONS_OPEN` | 처음에는 `false`. 검증을 마치고 `true`로 바꿔 재배포 |
| `PUBLIC_CONTACT` | 공개할 운영 문의 연락처(선택) |
| `PUBLIC_EVENT_HOURS` | 확정된 행사 운영 시간(선택) |

5. 배포한 주소에서 접수 상태를 확인합니다. Preview 환경에서 테스트용 DB와 임시 접수 설정으로 보호자 테스트 신청 1건을 넣어 저장 여부와 마감 동작을 확인한 후 운영합니다.
6. 최종 배포 주소로 QR을 생성해 카드 5번 흰 정사각형(x=621, y=494, 310×310px)에 넣습니다. QR 내부 흰 여백을 유지하고, 인쇄·게시 전에 휴대전화로 링크를 확인하세요. 현재 카드에는 예약 공간만 있습니다.

## 운영

- 접수 내역은 Supabase **Table Editor**의 `gagok_kids_market_applications` 테이블에서 확인합니다. 수정 요청은 운영자가 처리합니다.
- 실제 참여 확정 건을 `confirmed`, 취소 건을 `withdrawn`으로 바꿉니다. SQL 예시에 따라 확정 팀 수를 집계한 뒤 운영 여부를 안내합니다. 마감은 서버에서 확인되며, 5팀 집계·운영 결정·참여 안내는 운영자가 합니다.
- 공개 전 개인정보 안내 문구(수집 주체·보유 기간·연락처)를 운영 정책과 맞춰 주세요. 어린이 이름이나 생년월일은 받지 않습니다. 보유 기한이 지나면 SQL 파일의 삭제 쿼리를 실행하거나 프로젝트 스케줄에 등록하세요. 소스가 자동으로 삭제 예약을 설치하지는 않습니다.
- `npm run preview`: 로컬에서 화면을 보며 입력을 확인할 수 있습니다. 실제 저장은 하지 않습니다. 미리보기의 보유 기간은 예시입니다.
- `npm test`: 마감, 필수 설정, 동의, 신청 저장 요청과 실패 처리 검증. 외부 프로젝트에 접속하지 않습니다.

공식 문서: [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration) · [Vercel 환경 변수](https://vercel.com/docs/environment-variables) · [Supabase Data REST API](https://supabase.com/docs/guides/api) · [Supabase API Keys](https://supabase.com/docs/guides/getting-started/api-keys)

## 관리자 페이지 - 신청 내역 확인

1. Supabase SQL Editor에서 `supabase/admin.sql`을 실행합니다. **신규 설치:** `setup.sql` → `admin.sql` 순서. **기존 DB:** `admin.sql`만 실행하면 기존 신청을 유지합니다.
2. Vercel의 **서버 환경 변수**에 `ADMIN_PIN` 값으로 **0000**을 입력합니다. 숫자 0이 네 개입니다.
3. 터미널에서 `openssl rand -hex 32`를 실행해 나온 64자리 값을 `ADMIN_ENTRY_KEY`에 입력한 뒤, 수정된 소스를 배포합니다. Vercel 운영 주소에 `/admin#key=발급한_64자리_값`을 붙인 링크를 운영자끼리만 보관합니다. 이 관리자 전용 링크는 행사 QR이나 공개 게시글에 넣지 않습니다.
4. 관리자 전용 링크에서 비밀번호 **0000**을 입력하면 보호자 이름·연락처·참여 인원·물품·접수 시각·상태를 접수순으로 볼 수 있습니다. 목록은 조회용이며 참여 확정 등 상태 변경은 기존처럼 Supabase에서 합니다.
5. 접수 화면과 관리자 화면은 같은 데이터베이스를 사용합니다. 배포한 사이트에서 로그인·로그아웃을 확인해 주세요. `npm run preview`는 공개 접수 페이지의 화면 확인용이며, 실제 접수·관리자 인증을 실행하지 않습니다.

짧은 PIN만으로는 접속할 수 없습니다. 운영자 전용 링크와 PIN을 함께 확인하고, 유효한 전용 링크로 접속해도 10분에 최대 5회만 입력할 수 있습니다. 로그인은 4시간 뒤 만료됩니다. 전용 링크가 노출되면 `ADMIN_ENTRY_KEY`를 바꾸고 재배포하세요.
