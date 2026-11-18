import {test} from 'node:test';
import assert from 'node:assert/strict';
import {settings,parseRegistration} from '../lib/application.js';
import handler from '../api/apply.js';
const env={APPLICATIONS_OPEN:'true',APPLICATION_CLOSE_AT:'2026-11-20T23:00:00+09:00',RETENTION_DAYS:'30',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test'};
const input={guardianName:'김가곡',phone:'010-1234-5678',kids:'2',items:'동화책과 장난감',consent:true};
test('접수 기간, 중지 및 필수 설정 검증',()=>{
 assert.equal(settings(env,Date.parse('2026-11-20T22:59:59+09:00')).state,'open');
 assert.equal(settings(env,Date.parse(env.APPLICATION_CLOSE_AT)).state,'closed');
 for(const overrides of [{APPLICATIONS_OPEN:'false'},{RETENTION_DAYS:''},{SUPABASE_SECRET_KEY:''},{APPLICATION_CLOSE_AT:'2026-11-22T00:00:00+09:00'}]){
  assert.equal(settings({...env,...overrides},Date.parse('2026-11-19T00:00:00+09:00')).state,'paused');
 }
 assert.ok(!JSON.stringify(settings(env)).includes('sb_secret'));
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
 let saved, result=new Response(null,{status:201}), calls=0;
 t.mock.method(globalThis,'fetch',async (url,options)=>{
  calls++;assert.equal(url,'https://example.supabase.co/rest/v1/gagok_kids_market_applications');assert.equal(options.headers.apikey,env.SUPABASE_SECRET_KEY);assert.equal(options.headers.Prefer,'return=minimal');saved=JSON.parse(options.body);return result;
 });
 async function send(body=input,extra={}){
  const res={setHeader(){},status(code){this.code=code;return this;},json(data){return {code:this.code,data};}};
  return handler({method:'POST',headers:{'content-type':'application/json'},body,...extra},res);
 }
 assert.deepEqual(await send(),{code:200,data:{ok:true}});
 assert.deepEqual(saved,{guardian_name:'김가곡',phone:'01012345678',children_count:2,items:'동화책과 장난감',consent_version:'2026-11-18-v1',retention_days:30});
 result=new Response(JSON.stringify({code:'23505'}),{status:409});
 assert.deepEqual(await send(),{code:200,data:{ok:true}});
 assert.equal((await send({...input,consent:false})).code,422);
 assert.equal((await send(input,{headers:{'content-type':'application/json','sec-fetch-site':'cross-site'}})).code,415);
 result=new Response(null,{status:500});assert.equal((await send()).code,503);
 process.env.APPLICATIONS_OPEN='false';assert.equal((await send()).code,409);assert.equal(calls,3);
});
