import { settings } from '../lib/application.js';
import { TEAM_CAPACITY, dbUrl, dbKey, dbHeaders, dbIssue } from '../lib/db.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'허용되지 않은 요청입니다.'});}
  const data=settings();
  if(data.state!=='open')return res.status(200).json(data);
  // 접수 중일 때만 DB에서 현재 팀 수(취소 제외)를 확인해 정원 마감 여부를 판단합니다.
  try{
    const key=dbKey();
    const r=await fetch(dbUrl()+'/rest/v1/rpc/gagok_kids_market_team_count',{method:'POST',headers:dbHeaders(key,{'Content-Type':'application/json'}),body:'{}',signal:AbortSignal.timeout(5000)});
    if(!r.ok)return res.status(200).json({...data,state:'paused',issues:[dbIssue(r.status)]});
    const teams=Number(await r.json());
    if(!Number.isInteger(teams)||teams<0)return res.status(200).json({...data,state:'paused',issues:['DB_UNREACHABLE']});
    const remaining=Math.max(TEAM_CAPACITY-teams,0);
    return res.status(200).json({...data,state:remaining?'open':'full',remaining});
  }catch{return res.status(200).json({...data,state:'paused',issues:['DB_UNREACHABLE']});}
}
