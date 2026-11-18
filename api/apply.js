import { parseRegistration, settings } from '../lib/application.js';
import { TEAM_CAPACITY, dbUrl, dbKey, dbHeaders } from '../lib/db.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'허용되지 않은 요청입니다.'});}
  if (req.headers['sec-fetch-site']==='cross-site' || !/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')) return res.status(415).json({error:'신청 페이지에서 다시 제출해 주세요.'});
  const config=settings();
  if (config.state!=='open') return res.status(409).json({error:config.state==='closed'?'모집이 마감되었습니다.':config.state==='upcoming'?'11월 18일(수)부터 접수합니다.':'아직 접수를 받을 수 없습니다.'});
  let data=req.body;
  if(typeof data==='string'){try{data=JSON.parse(data);}catch{return res.status(400).json({error:'신청 정보를 확인해 주세요.'});}}
  if(JSON.stringify(data??null).length>4096) return res.status(413).json({error:'입력 내용이 너무 깁니다.'});
  const parsed=parseRegistration(data);
  if(parsed.error)return res.status(422).json({error:parsed.error});
  try{
    const key=dbKey(), v=parsed.value;
    // DB 함수가 잠금 안에서 중복 확인 → 10팀 정원 확인 → 저장을 한 번에 처리합니다(동시 제출에도 최대 10팀).
    const r=await fetch(dbUrl()+'/rest/v1/rpc/gagok_kids_market_apply',{
      method:'POST',headers:dbHeaders(key,{'Content-Type':'application/json'}),
      body:JSON.stringify({p_guardian_name:v.guardian_name,p_phone:v.phone,p_children_count:v.children_count,p_items:v.items,p_consent_version:v.consent_version,p_retention_days:config.retentionDays}),
      signal:AbortSignal.timeout(8000)
    });
    const outcome=r.ok?await r.json().catch(()=>null):null;
    // 같은 연락처의 접수 여부를 외부에서 알아낼 수 없게 중복도 동일한 응답을 보냅니다.
    if(outcome==='ok'||outcome==='duplicate')return res.status(200).json({ok:true});
    if(outcome==='full')return res.status(409).json({error:'선착순 '+TEAM_CAPACITY+'팀 모집이 마감되었습니다.',full:true});
  }catch{/* 개인 정보와 DB 응답을 로그에 남기지 않습니다. */}
  return res.status(503).json({error:'접수 처리 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.'});
}
