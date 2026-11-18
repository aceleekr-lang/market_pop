import { settings } from '../lib/application.js';
export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'허용되지 않은 요청입니다.'});}
  return res.status(200).json(settings());
}
