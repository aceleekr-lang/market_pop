import { parseRegistration, settings } from '../lib/application.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'허용되지 않은 요청입니다.'});}
  if (req.headers['sec-fetch-site']==='cross-site' || !/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')) return res.status(415).json({error:'신청 페이지에서 다시 제출해 주세요.'});
  const config=settings();
  if (config.state!=='open') return res.status(409).json({error:config.state==='closed'?'모집이 마감되었습니다.':'아직 접수를 받을 수 없습니다.'});
  let data=req.body;
  if(typeof data==='string'){try{data=JSON.parse(data);}catch{return res.status(400).json({error:'신청 정보를 확인해 주세요.'});}}
  if(JSON.stringify(data??null).length>4096) return res.status(413).json({error:'입력 내용이 너무 깁니다.'});
  const parsed=parseRegistration(data);
  if(parsed.error)return res.status(422).json({error:parsed.error});
  const url=process.env.SUPABASE_URL.replace(/\/$/,'');
  try{
    const r=await fetch(url+'/rest/v1/gagok_kids_market_applications',{
      method:'POST',headers:{apikey:process.env.SUPABASE_SECRET_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},
      body:JSON.stringify({...parsed.value,retention_days:config.retentionDays}),signal:AbortSignal.timeout(8000)
    });
    if(r.ok || r.status===409 && (await r.json().catch(()=>({}))).code==='23505'){
      // 같은 연락처의 접수 여부를 외부에서 알아낼 수 없게 동일한 응답을 보냅니다.
      return res.status(200).json({ok:true});
    }
  }catch{/* 개인 정보와 DB 응답을 로그에 남기지 않습니다. */}
  return res.status(503).json({error:'접수 처리 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.'});
}
