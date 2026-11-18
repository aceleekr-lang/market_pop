import assert from 'node:assert/strict';
import {test} from 'node:test';
import handler from '../api/admin.js';
import {config,issueSession,sessionCookie,validSession,SESSION_SECONDS} from '../lib/admin.js';
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test',ADMIN_PIN:'0000',ADMIN_ENTRY_KEY:'0123456789abcdef'.repeat(4)};
test('관리자 설정이 없으면 닫히고, 세션은 변조·만료·키 변경을 거절',()=>{
 assert.equal(config({...env,ADMIN_ENTRY_KEY:''}),null);
 assert.equal(config({...env,ADMIN_PIN:''}),null);
 const c=config(env),now=Date.parse('2026-11-18T13:00:00+09:00');
 const token=issueSession(c,now), cookie=sessionCookie(token,SESSION_SECONDS).split(';')[0];
 assert.ok(validSession(cookie,c,now));
 assert.equal(validSession(cookie.slice(0,-3)+'xxx',c,now),false);
 assert.equal(validSession(cookie,c,now+SESSION_SECONDS*1000),false);
 assert.equal(validSession(cookie,{...c,pin:'1234'},now),false);
});
test('API 익명 차단, 전용 키·0000 로그인, 시도 제한, 목록 조회 및 로그아웃',async t=>{
 for (const [k,v] of Object.entries(env)){
  const old=process.env[k];process.env[k]=v;
  t.after(()=>{if(old===undefined)delete process.env[k];else process.env[k]=old;});
 }
 let calls=[], allow=true;
 t.mock.method(globalThis,'fetch',async (url,options)=>{
  calls.push(url);assert.equal(options.headers.apikey,env.SUPABASE_SECRET_KEY);
  if(url.endsWith('/rpc/gagok_admin_login_allowed'))return Response.json(allow);
  assert.match(url,/gagok_kids_market_applications\?select=.*&order=created_at\.asc,id\.asc&limit=51&offset=0$/);
  return Response.json([{guardian_name:'테스트',phone:'01000000000'}]);
 });
 async function call(method='GET',body,headers={}){
  const res={headers:{},setHeader(k,v){this.headers[k]=v;}, status(status){this.code=status;return this;},json(data){return {code:this.code,data,headers:this.headers};}};
  return handler({method,url:'/api/admin?page=1',body,headers:{'content-type':'application/json',...headers}},res);
 }
 assert.equal((await call()).code,401);
 assert.equal((await call('POST',{action:'login',pin:'0000'})).code,401);
 assert.equal(calls.length,0);
 assert.equal((await call('POST',{action:'login',pin:'0001',entryKey:env.ADMIN_ENTRY_KEY})).code,401);
 allow=false;assert.equal((await call('POST',{action:'login',pin:'0000',entryKey:env.ADMIN_ENTRY_KEY})).code,429);
 assert.equal((await call('POST',{action:'login',pin:'0000',entryKey:env.ADMIN_ENTRY_KEY},{'sec-fetch-site':'cross-site'})).code,403);
 allow=true;
 const ok=await call('POST',{action:'login',pin:'0000',entryKey:env.ADMIN_ENTRY_KEY});
 assert.equal(ok.code,200);
 assert.match(ok.headers['Set-Cookie'],/HttpOnly; Secure; SameSite=Strict/);
 const cookie=ok.headers['Set-Cookie'].split(';')[0];
 const data=await call('GET',undefined,{cookie});
 assert.equal(data.code,200);assert.equal(data.data.applications[0].phone,'01000000000');
 assert.equal(data.headers['Cache-Control'],'private, no-store');
 assert.match((await call('POST',{action:'logout'},{cookie})).headers['Set-Cookie'],/Max-Age=0$/);
});
