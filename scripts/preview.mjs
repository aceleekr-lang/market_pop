import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const routes={
 '/':['index.html','text/html; charset=utf-8'],
 '/style.css':['style.css','text/css; charset=utf-8'],
 '/main.js':['main.js','text/javascript; charset=utf-8'],
 '/assets/kids-market.jpg':['assets/kids-market.jpg','image/jpeg'],
 '/assets/miryang.png':['assets/miryang.png','image/png'],
 '/assets/regeneration.png':['assets/regeneration.png','image/png']
};
const server=createServer(async(req,res)=>{
 const p=new URL(req.url,'http://localhost').pathname;
 if(p==='/api/settings'&&req.method==='GET'){
  res.writeHead(200,{'Content-Type':'application/json'});
  return res.end(JSON.stringify({state:'open',closeAt:null,capacity:10,remaining:7,retentionDays:30,contact:'',hours:''}));
 }
 if(p==='/api/apply'&&req.method==='POST'){
  res.writeHead(503,{'Content-Type':'application/json'});
  return res.end(JSON.stringify({error:'미리보기에서는 신청 정보가 저장되지 않습니다.'}));
 }
 if(!Object.hasOwn(routes,p)){res.writeHead(404);return res.end();}
 const [file,type]=routes[p];
 try{const data=await readFile(new URL('../public/'+file,import.meta.url));res.writeHead(200,{'Content-Type':type});res.end(data);}
 catch{res.writeHead(500);res.end();}
});
server.listen(3000,'127.0.0.1',()=>console.log('미리보기: http://127.0.0.1:3000 (저장하지 않음)'));
