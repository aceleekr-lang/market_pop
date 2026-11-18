export const APPLICATION_START = '2026-11-18T00:00:00+09:00';
const start = Date.parse(APPLICATION_START);
export const APPLICATION_DEADLINE = '2026-11-20T18:00:00+09:00';
const close = Date.parse(APPLICATION_DEADLINE);
const closeAt = new Date(close).toISOString();
export function settings(env = process.env, now = Date.now()) {
  const retention = Number(env.RETENTION_DAYS);
  const validRetention = Number.isInteger(retention) && retention >= 1 && retention <= 365;
  const ready = validRetention && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(env.SUPABASE_URL ?? '')) && /^sb_secret_\S+$/.test(String(env.SUPABASE_SECRET_KEY ?? ''));
  // Open as soon as the production database settings are ready, unless the operator pauses it.
  const mode = String(env.APPLICATIONS_OPEN ?? 'true').trim();
  const state = now >= close ? 'closed' : now < start ? 'upcoming' : ready && mode === 'true' ? 'open' : 'paused';
  return { state, closeAt, retentionDays: validRetention ? retention : null, contact: String(env.PUBLIC_CONTACT ?? '').slice(0,100), hours: String(env.PUBLIC_EVENT_HOURS || '12:00~16:00').slice(0,80) };
}
export function parseRegistration(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {error:'신청 정보를 확인해 주세요.'};
  if (data.website) return {error:'신청 정보를 확인해 주세요.'};
  const name = typeof data.guardianName==='string' ? data.guardianName.trim().normalize('NFC') : '';
  const phone = typeof data.phone==='string' && /^[0-9\s-]+$/.test(data.phone) ? data.phone.replace(/[\s-]/g,'') : '';
  const kids = typeof data.kids==='string' && /^\d{1,2}$/.test(data.kids) ? Number(data.kids) : data.kids;
  const items = typeof data.items==='string' ? data.items.trim() : '';
  if(name.length < 2 || name.length > 40 || /[\r\n\t]/.test(name)) return {error:'보호자 이름을 2~40자로 입력해 주세요.'};
  if(!/^01[016789]\d{7,8}$/.test(phone)) return {error:'연락 가능한 보호자 휴대전화 번호를 확인해 주세요.'};
  if(!Number.isInteger(kids)||kids<1||kids>20) return {error:'참여 어린이·청소년 수를 1~20명 사이로 입력해 주세요.'};
  if(items.length<2 || items.length>300) return {error:'판매·교환할 물품을 2~300자로 적어 주세요.'};
  if(data.consent !== true) return {error:'개인정보 수집·이용 동의가 필요합니다.'};
  return {value:{guardian_name:name,phone,children_count:kids,items,consent_version:'2026-11-18-v1'}};
}
