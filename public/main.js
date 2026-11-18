const byId=id=>document.getElementById(id);
const form=byId('application'), status=byId('status'), alert=byId('error');
try{
 const response=await fetch('/api/settings',{cache:'no-store'});
 if(!response.ok)throw Error();
 const data=await response.json();
 if(data.hours)byId('hours').textContent=data.hours;
 if(data.contact){const el=byId('contact');el.textContent='문의: '+data.contact;el.hidden=false;}
 if(data.state==='open'){
   status.textContent='신청서 1건은 1팀으로 접수됩니다.'+(Number.isInteger(data.remaining)?' 남은 자리 '+data.remaining+'팀':'');
   byId('retention').textContent='보유 기간: 행사 종료 후 '+data.retentionDays+'일';
   form.hidden=false;
   const remaining = Date.parse(data.closeAt)-Date.now();
   if(Number.isFinite(remaining)&&remaining>0&&remaining<=2147483647)setTimeout(()=>{
     form.hidden=true;
     if(!status.classList.contains('complete'))status.textContent='모집이 마감되었습니다. 운영 여부는 문자로 안내합니다.';
   },remaining);
 }else status.textContent=data.state==='full'?'선착순 '+(data.capacity||10)+'팀 모집이 마감되었습니다. 운영 여부는 문자로 안내합니다.':data.state==='closed'?'모집이 마감되었습니다. 운영 여부는 문자로 안내합니다.':data.state==='upcoming'?'11월 18일(수)부터 신청할 수 있습니다.':'현재 신청을 받지 않습니다. 모집 안내를 확인해 주세요.';
}catch{status.textContent='접수 상태를 확인하지 못했습니다. 잠시 뒤 다시 접속해 주세요.';}
form.addEventListener('submit',async event=>{
 event.preventDefault();
 const button=form.querySelector('button');
 if(button.disabled)return;
 button.disabled=true;button.textContent='접수 중…';alert.hidden=true;
 const fields=Object.fromEntries(new FormData(form));
 try{
   const response=await fetch('/api/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...fields,consent:fields.consent==='on'})});
   const result=await response.json();
   if(result.full){form.hidden=true;status.textContent=result.error+' 운영 여부는 문자로 안내합니다.';return;}
   if(!response.ok || !result.ok)throw Error(result.error||'접수하지 못했습니다.');
   form.reset();form.hidden=true;
   status.textContent='신청이 접수되었습니다. 마감 후 운영 여부를 문자로 안내합니다.';
   status.classList.add('complete');status.tabIndex=-1;status.focus();
 }catch(error){alert.textContent=error.message;alert.hidden=false;}
 finally{button.disabled=false;button.textContent='참여 신청하기';}
});
