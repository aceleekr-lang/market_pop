import {test} from 'node:test';
import assert from 'node:assert/strict';
import {settings,parseRegistration,APPLICATION_START,APPLICATION_DEADLINE} from '../lib/application.js';
import handler from '../api/apply.js';
import settingsHandler from '../api/settings.js';
import {dbHeaders} from '../lib/db.js';
const env={APPLICATIONS_OPEN:'true',APPLICATION_CLOSE_AT:'2026-11-20T18:00:00+09:00',RETENTION_DAYS:'30',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test'};
const input={guardianName:'김가곡',phone:'010-1234-5678',kids:'2',items:'동화책과 장난감',consent:true};
test('접수 기간, 중지 및 필수 설정 검증',()=>{
 assert.equal(settings(env,Date.parse(APPLICATION_START)-1).state,'upcoming');
 assert.equal(settings(env,Date.parse(APPLICATION_START)).state,'open');
 assert.equal(settings(env,Date.parse('2026-11-20T17:59:59+09:00')).state,'open');
 assert.equal(settings(env,Date.parse(APPLICATION_DEADLINE)).state,'closed');
 for(const overrides of [{APPLICATIONS_OPEN:'false'},{RETENTION_DAYS:''},{SUPABASE_SECRET_KEY:''}]){
  assert.equal(settings({...env,...overrides},Date.parse('2026-11-19T00:00:00+09:00')).state,'paused');
 }
 assert.equal(settings({...env,APPLICATION_CLOSE_AT:'2026-11-22T00:00:00+09:00'},Date.parse(APPLICATION_DEADLINE)).state,'closed');
 assert.equal(settings({...env,APPLICATIONS_OPEN:undefined},Date.parse('2026-11-18T00:00:00+09:00')).state,'open');
 assert.ok(!JSON.stringify(settings(env)).includes('sb_secret'));
 const mid=Date.parse('2026-11-19T00:00:00+09:00');
 assert.deepEqual(settings({...env,RETENTION_DAYS:''},mid).issues,['RETENTION_DAYS']);
 assert.deepEqual(settings({APPLICATIONS_OPEN:'false'},mid).issues,['RETENTION_DAYS','SUPABASE_URL','SUPABASE_SECRET_KEY','APPLICATIONS_OPEN']);
 assert.equal(settings(env,mid).issues,undefined);
 // 예전 service_role JWT 키, 앞뒤 공백·URL 끝 슬래시 허용
 assert.equal(settings({...env,SUPABASE_SECRET_KEY:' eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.sig_part-1 \n',SUPABASE_URL:'https://example.supabase.co/',RETENTION_DAYS:' 30 '},mid).state,'open');
 assert.equal(settings({...env,SUPABASE_SECRET_KEY:'sb_publishable_x'},mid).state,'paused');
 assert.equal(dbHeaders('eyJa.b.c').Authorization,'Bearer eyJa.b.c');
 assert.equal(dbHeaders('sb_secret_x').Authorization,undefined);
});
test('보호자 입력 정규화 및 동의 확인',()=>{
 assert.equal(parseRegistration(input).value.phone,'01012345678');
 assert.equal(parseRegistration(input).value.children_count,2);
 for(const overrides of [{consent:false},{kids:0},{phone:'031-123-4567'},{website:'bot'},{items:''}]){
  assert.ok(parseRegistration({...input,...overrides}).error);
 }
});
test('신청 API: 정상 저장, 중복 비공개, 미동의·실패·마감 처리',async t=>{
 const original={};for(const k of Object.keys(env)){original[k]=process.env[k];process.env[k]=env[k];}
 t.after(()=>{for(const [k,v] of Object.entries(original)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
 t.mock.method(Date,'now',()=>Date.parse('2026-11-19T09:00:00+09:00'));
 let saved, result=Response.json('ok'), calls=0;
 t.mock.method(globalThis,'fetch',async (url,options)=>{
  calls++;assert.equal(url,'https://example.supabase.co/rest/v1/rpc/gagok_kids_market_apply');assert.equal(options.headers.apikey,env.SUPABASE_SECRET_KEY);saved=JSON.parse(options.body);return result;
 });
 async function send(body=input,extra={}){
  const res={setHeader(){},status(code){this.code=code;return this;},json(data){return {code:this.code,data};}};
  return handler({method:'POST',headers:{'content-type':'application/json'},body,...extra},res);
 }
 assert.deepEqual(await send(),{code:200,data:{ok:true}});
 assert.deepEqual(saved,{p_guardian_name:'김가곡',p_phone:'01012345678',p_children_count:2,p_items:'동화책과 장난감',p_consent_version:'2026-11-18-v1',p_retention_days:30});
 result=Response.json('duplicate');
 assert.deepEqual(await send(),{code:200,data:{ok:true}});
 assert.equal((await send({...input,consent:false})).code,422);
 assert.equal((await send(input,{headers:{'content-type':'application/json','sec-fetch-site':'cross-site'}})).code,415);
 result=Response.json('full');{const r=await send();assert.equal(r.code,409);assert.equal(r.data.full,true);assert.match(r.data.error,/10팀/);}
 result=new Response(null,{status:500});assert.equal((await send()).code,503);
 result=new Response(null,{status:404});assert.equal((await send()).code,503);
 Date.now.mock.mockImplementation(()=>Date.parse(APPLICATION_DEADLINE));
 assert.match((await send()).data.error,/마감/);
 Date.now.mock.mockImplementation(()=>Date.parse(APPLICATION_START)-1);
 assert.match((await send()).data.error,/11월 18일/);
 process.env.APPLICATIONS_OPEN='false';assert.equal((await send()).code,409);assert.equal(calls,5);
});

test('접수 상태 API: 남은 자리, 정원 마감, DB 진단',async t=>{
 const original={};for(const k of Object.keys(env)){original[k]=process.env[k];process.env[k]=env[k];}
 t.after(()=>{for(const [k,v] of Object.entries(original)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
 t.mock.method(Date,'now',()=>Date.parse('2026-11-19T09:00:00+09:00'));
 let result=Response.json(3);
 t.mock.method(globalThis,'fetch',async url=>{assert.equal(url,'https://example.supabase.co/rest/v1/rpc/gagok_kids_market_team_count');return result;});
 const get=()=>settingsHandler({method:'GET',headers:{}},{setHeader(){},status(c){this.c=c;return this;},json(d){return d;}});
 let d=await get();assert.equal(d.state,'open');assert.equal(d.remaining,7);
 result=Response.json(10);d=await get();assert.equal(d.state,'full');assert.equal(d.remaining,0);
 result=new Response(null,{status:404});d=await get();assert.equal(d.state,'paused');assert.deepEqual(d.issues,['SQL_CAPACITY_NOT_INSTALLED']);
 result=new Response(null,{status:401});d=await get();assert.deepEqual(d.issues,['SUPABASE_SECRET_KEY_REJECTED']);
 process.env.RETENTION_DAYS='';d=await get();assert.deepEqual(d.issues,['RETENTION_DAYS']);
 assert.ok(!JSON.stringify(d).includes('sb_secret'));
});
