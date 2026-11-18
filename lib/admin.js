import {createHmac, createHash, timingSafeEqual, randomBytes} from 'node:crypto';
export const SESSION_NAME='__Host-gagok-admin';
export const SESSION_SECONDS=4*3600;

export function config(env=process.env){
 const url=String(env.SUPABASE_URL??'').trim().replace(/\/$/,'');
 const dbKey=String(env.SUPABASE_SECRET_KEY??'');
 const entryKey=String(env.ADMIN_ENTRY_KEY??'');
 const pin=String(env.ADMIN_PIN??'');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)||!/^sb_secret_\S+$/.test(dbKey)||!/^\d{4,12}$/.test(pin)||!/^[a-f0-9]{64}$/.test(entryKey))return null;
 return {url,dbKey,entryKey,pin};
}
export function equal(a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length>256||b.length>256)return false;
 const hash=s=>createHash('sha256').update(s).digest();
 return timingSafeEqual(hash(a),hash(b));
}
const sign=(part,c)=>createHmac('sha256',c.dbKey).update('gagok-admin:v1\0'+c.entryKey+'\0'+c.pin+'\0'+part).digest('base64url');
export function issueSession(c, now=Date.now()){
 const part=Math.floor(now/1000+SESSION_SECONDS)+'.'+randomBytes(24).toString('base64url');
 return part+'.'+sign(part,c);
}
export function validSession(cookie,c,now=Date.now()){
 const matches=String(cookie??'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(SESSION_NAME+'='));
 if(matches.length!==1)return false;
 const token=matches[0].slice(SESSION_NAME.length+1);
 if(!/^\d{10}\.[a-zA-Z0-9_-]{32}\.[a-zA-Z0-9_-]{43}$/.test(token))return false;
 const [expiry,nonce,mac]=token.split('.');
 const current=Math.floor(now/1000);
 return +expiry>current&&+expiry<=current+SESSION_SECONDS&&equal(mac,sign(expiry+'.'+nonce,c));
}
export const sessionCookie=(value,age)=>SESSION_NAME+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+age;
