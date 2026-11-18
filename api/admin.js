import {dbHeaders} from '../lib/db.js';
import {buildXlsx} from '../lib/xlsx.js';
import {config,equal,issueSession,validSession,sessionCookie,SESSION_SECONDS} from '../lib/admin.js';

export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 const closed=()=>res.status(503).json({error:'관리자 기능을 사용할 수 없습니다. 운영 설정을 확인해 주세요.'});
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'허용되지 않은 요청입니다.'});}
 if(['cross-site','same-site'].includes(req.headers['sec-fetch-site']))return res.status(403).json({error:'관리자 화면에서 다시 시도해 주세요.'});
 const c=config();
 if(!c)return closed();
 const request=(path,options={})=>fetch(c.url+'/rest/v1/'+path,{...options,headers:dbHeaders(c.dbKey,options.headers),signal:AbortSignal.timeout(8000)});
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
 const params=new URL(req.url,'https://example.invalid').searchParams;
 if(params.get('format')==='xlsx'){
  // 전체 접수자(취소 포함)를 접수 순서대로 엑셀로 내려받습니다.
  try{
   const db=await request('gagok_kids_market_applications?select=guardian_name,phone,children_count,items,status,created_at&order=created_at.asc,id.asc&limit=1000');
   if(!db.ok)return closed();
   const list=await db.json();
   if(!Array.isArray(list))return closed();
   const states={received:'접수',confirmed:'확정',withdrawn:'취소'};
   const kst=v=>{const d=new Date(v);if(!Number.isFinite(d.getTime()))return '';const k=new Date(d.getTime()+9*3600e3).toISOString();return k.slice(0,10)+' '+k.slice(11,19);};
   const phone=v=>String(v??'').replace(/^(01\d)(\d{3,4})(\d{4})$/,'$1-$2-$3');
   let n=0;
   const rows=list.map(r=>[r.status==='withdrawn'?'':++n,kst(r.created_at),r.guardian_name,phone(r.phone),r.children_count,r.items,states[r.status]??r.status]);
   const file=buildXlsx({sheetName:'접수자',headers:['정원순번','접수 시각(KST)','보호자','휴대전화','참여 인원','물품','상태'],rows,widths:[9,20,12,15,9,48,8]});
   const stamp=kst(Date.now()).replace(/[-: ]/g,'').slice(0,12);
   res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
   res.setHeader('Content-Disposition',`attachment; filename="kids-market-${stamp}.xlsx"; filename*=UTF-8''${encodeURIComponent('키즈마켓_접수자_'+stamp+'.xlsx')}`);
   return res.status(200).send(file);
  }catch{return closed();}
 }
 const q=params.get('page')??'1';
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
