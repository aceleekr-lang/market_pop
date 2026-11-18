const el=id=>document.getElementById(id);
const form=el('login'), panel=el('panel'), message=el('message'), rows=el('rows'), pin=el('pin');
let entryKey=new URLSearchParams(location.hash.slice(1)).get('key')??'';
if(location.hash)history.replaceState(null,'',location.pathname+location.search);
let page=1, pending=false;
const tell=(text,error=false)=>{message.textContent=text;message.dataset.error=String(error);};
const fmt=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'});
const states={received:'접수',confirmed:'확정',withdrawn:'취소'};
const privateLink=()=>/^[a-f0-9]{64}$/.test(entryKey);
const post=async data=>fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),cache:'no-store'});
const resetPanel=()=>{panel.hidden=true;rows.replaceChildren();};
async function load(wanted){
 if(pending)return;
 pending=true;el('refresh').disabled=true;el('previous').disabled=true;el('next').disabled=true;
 tell('신청 내역을 불러오고 있습니다.');
 try{
  const response=await fetch('/api/admin?page='+wanted,{cache:'no-store'});
  const data=await response.json();
  if(response.status===401){resetPanel();form.hidden=!privateLink();tell(privateLink()?'관리자 비밀번호를 입력해 주세요.':'운영자가 받은 전용 링크로 접속해 주세요.');return;}
  if(!response.ok)throw Error(data.error||'신청 내역을 불러오지 못했습니다.');
  form.hidden=true;panel.hidden=false;page=data.page;rows.replaceChildren();
  for(const [i,item] of data.applications.entries()){
   const tr=document.createElement('tr');
   const time=new Date(item.created_at);
   const phone=String(item.phone??'').replace(/^(01\d)(\d{3,4})(\d{4})$/,'$1-$2-$3');
   const values=[(page-1)*50+i+1,Number.isFinite(time.getTime())?fmt.format(time):'—',item.guardian_name,phone,item.children_count,item.items,states[item.status]??'—'];
   for(const value of values){const td=document.createElement('td');td.textContent=String(value??'');tr.append(td);}
   rows.append(tr);
  }
  el('range').textContent=data.applications.length?((page-1)*50+1)+'~'+((page-1)*50+data.applications.length)+'번째 신청':'표시할 신청 내역이 없습니다.';
  el('previous').disabled=page===1;el('next').disabled=!data.hasNext;tell('');
 }catch(error){resetPanel();tell(error.message||'다시 접속해 주세요.',true);}
 finally{pending=false;el('refresh').disabled=false;}
}
form.addEventListener('submit',async event=>{
 event.preventDefault();
 const button=form.querySelector('button');
 if(button.disabled)return;
 button.disabled=true;
 try{
  const resp=await post({action:'login',entryKey,pin:pin.value});const data=await resp.json();
  if(!resp.ok)throw Error(data.error||'로그인하지 못했습니다.');
  form.reset();el('download').addEventListener('click',async ()=>{
 const button=el('download');
 if(button.disabled)return;
 button.disabled=true;tell('엑셀 파일을 만들고 있습니다.');
 try{
  const response=await fetch('/api/admin?format=xlsx',{cache:'no-store'});
  if(response.status===401){resetPanel();form.hidden=!privateLink();tell('로그인이 만료되었습니다. 관리자 전용 링크로 다시 접속해 주세요.',true);return;}
  if(!response.ok)throw Error();
  const url=URL.createObjectURL(await response.blob());
  const name=decodeURIComponent((response.headers.get('Content-Disposition')??'').match(/filename\*=UTF-8''([^;]+)/)?.[1]??'키즈마켓_접수자.xlsx');
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
  tell('엑셀 파일을 내려받았습니다. 개인정보가 담긴 파일이니 보관에 주의해 주세요.');
 }catch{tell('엑셀 파일을 만들지 못했습니다. 다시 시도해 주세요.',true);}
 finally{button.disabled=false;}
});
await load(1);
 }catch(err){tell(err.message||'다시 시도해 주세요.',true);pin.value='';pin.focus();}
 finally{button.disabled=false;}
});
el('refresh').addEventListener('click',()=>load(page));
el('previous').addEventListener('click',()=>load(page-1));
el('next').addEventListener('click',()=>load(page+1));
el('logout').addEventListener('click',async ()=>{
 if(pending)return;
 try{const response=await post({action:'logout'});if(!response.ok)throw Error(); entryKey='';resetPanel();form.hidden=true;tell('로그아웃했습니다. 다시 로그인하려면 관리자 전용 링크를 열어 주세요.');}
 catch{tell('로그아웃하지 못했습니다. 다시 시도해 주세요.',true);}
});
el('download').addEventListener('click',async ()=>{
 const button=el('download');
 if(button.disabled)return;
 button.disabled=true;tell('엑셀 파일을 만들고 있습니다.');
 try{
  const response=await fetch('/api/admin?format=xlsx',{cache:'no-store'});
  if(response.status===401){resetPanel();form.hidden=!privateLink();tell('로그인이 만료되었습니다. 관리자 전용 링크로 다시 접속해 주세요.',true);return;}
  if(!response.ok)throw Error();
  const url=URL.createObjectURL(await response.blob());
  const name=decodeURIComponent((response.headers.get('Content-Disposition')??'').match(/filename\*=UTF-8''([^;]+)/)?.[1]??'키즈마켓_접수자.xlsx');
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
  tell('엑셀 파일을 내려받았습니다. 개인정보가 담긴 파일이니 보관에 주의해 주세요.');
 }catch{tell('엑셀 파일을 만들지 못했습니다. 다시 시도해 주세요.',true);}
 finally{button.disabled=false;}
});
await load(1);
