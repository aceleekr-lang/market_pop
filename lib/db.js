// Supabase 연결 공통 설정. 새 Secret key(sb_secret_…)와 예전 service_role JWT(eyJ…)를 모두 허용합니다.
export const TEAM_CAPACITY = 10;
const URL_RE = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i;
const KEY_RE = /^(?:sb_secret_\S+|eyJ[\w-]+\.[\w-]+\.[\w-]+)$/;
export const dbUrl = (env = process.env) => String(env.SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
export const dbKey = (env = process.env) => String(env.SUPABASE_SECRET_KEY ?? '').trim();
export const validUrl = url => URL_RE.test(url);
export const validKey = key => KEY_RE.test(key);
export function dbHeaders(key, extra = {}) {
  const headers = { apikey: key, ...extra };
  if (key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + key; // 예전 JWT 키는 Bearer도 필요
  return headers;
}
// DB 오류를 운영자가 볼 수 있는 진단 코드로 바꿉니다. 응답 본문·키는 노출하지 않습니다.
export function dbIssue(status) {
  if (status === 404) return 'SQL_CAPACITY_NOT_INSTALLED';
  if (status === 401 || status === 403) return 'SUPABASE_SECRET_KEY_REJECTED';
  return 'DB_UNREACHABLE';
}
