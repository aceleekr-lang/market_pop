import {config,equal,issueSession,validSession,sessionCookie,SESSION_SECONDS} from '../lib/admin.js';

export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 const closed=()=>res.status(503).json({error:'관리자 기능을 사용할 수 없습니다. 운영 설정을 확인해 주세요.'});
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'허용되지 않은 요청입니다.'});}
 if(['cross-site','same-site'].includes(req.headers['sec-fetch-site']))return res.status(403).json({error:'관리자 화면에서 다시 시도해 주세요.'});
 const c=config();
 if(!c)return closed();
 const request=(path,options={})=>fetch(c.url+'/rest/v1/'+path,{...options,headers:{apikey:c.dbKey,...options.headers},signal:AbortSignal.timeout(8000)});
 if(req.method==='POST'){
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']??''))return res.status(415).json({error:'관리자 화면에서 다시 시도해 주세요.'});
  let body=req.body;
  if(typeof body==='string'){try{body=JSON.parse(body);}catch{return res.status(400).json({error:'요청을 확인해 주세요.'});}}
  if(body?.action==='logout'){
   res.setHeader('Set-Cookie',sessionCookie('',0));return res.status(200).json({ok:true});
  }
  if(body?.action!=='login'||!equal(body.entryKey,c.entryKey))return res.status(401).json({error:'관리자 전용 링크와 비밀번호를 확인해 주세요.'});
  try{
   const check=await request('rpc/gagok_admin_login_allowed',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   if(!check.ok)return closed();
   const allowed=await check.json();
   if(allowed===false){res.setHeader('Retry-After','600');return res.status(429).json({error:'시도 횟수를 초과했습니다. 10분 뒤 다시 시도해 주세요.'});}
   if(allowed!==true)return closed();
   if(!equal(body.pin,c.pin))return res.status(401).json({error:'관리자 전용 링크와 비밀번호를 확인해 주세요.'});
   res.setHeader('Set-Cookie',sessionCookie(issueSession(c),SESSION_SECONDS));
   return res.status(200).json({ok:true});
  }catch{return closed();}
 }
 if(!validSession(req.headers.cookie,c))return res.status(401).json({error:'관리자 로그인이 필요합니다.'});
 const q=new URL(req.url,'https://example.invalid').searchParams.get('page')??'1';
 if(!/^[1-9]\d{0,2}$/.test(q))return res.status(400).json({error:'페이지 번호를 확인해 주세요.'});
 const page=Number(q),size=50;
 const fields='guardian_name,phone,children_count,items,status,created_at';
 try{
  const db=await request('gagok_kids_market_applications?select='+fields+'&order=created_at.asc,id.asc&limit=51&offset='+(page-1)*size);
  if(!db.ok)return closed();
  const rows=await db.json();
  if(!Array.isArray(rows))return closed();
  return res.status(200).json({applications:rows.slice(0,size),page,hasNext:rows.length>size});
 }catch{return closed();}
}
