
'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),cp=require('child_process'),{URL}=require('url');
const ROOT=path.resolve(__dirname,'..'), M=__dirname, R=path.join(M,'runtime'), L=path.join(M,'logs'), B=path.join(ROOT,'backups');
for(const d of [R,L,B]) fs.mkdirSync(d,{recursive:true});
const pidFile=path.join(R,'sisebom.pid'), outLog=path.join(L,'sisebom-output.log'), errLog=path.join(L,'sisebom-error.log'), mgrLog=path.join(L,'manager.log');
const HOST='127.0.0.1', PORT=3131, APP_PORT=3000;
function log(s){fs.appendFileSync(mgrLog,`${new Date().toISOString()} ${s}\n`)}
function pid(){try{return Number(fs.readFileSync(pidFile,'utf8'))||null}catch{return null}}
function alive(p){try{process.kill(p,0);return true}catch{return false}}
function kill(p){if(!p)return; if(process.platform==='win32')cp.spawnSync('taskkill',['/PID',String(p),'/T','/F'],{windowsHide:true});else try{process.kill(p,'SIGTERM')}catch{}}
function entry(){for(const p of [path.join(ROOT,'server','server.js'),path.join(ROOT,'server.js')])if(fs.existsSync(p))return p;return null}
function start(){
 const p=pid(); if(p&&alive(p))return {ok:true,pid:p,already:true};
 const e=entry(); if(!e)return {ok:false,error:'server/server.js를 찾지 못했습니다.'};
 const o=fs.openSync(outLog,'a'), er=fs.openSync(errLog,'a');
 const c=cp.spawn(process.execPath,[path.basename(e)],{cwd:path.dirname(e),detached:true,windowsHide:true,stdio:['ignore',o,er],env:{...process.env,PORT:String(APP_PORT),NODE_ENV:'production'}});
 c.unref();fs.writeFileSync(pidFile,String(c.pid));log('start '+c.pid);return {ok:true,pid:c.pid}
}
function stop(){const p=pid();if(p)kill(p);try{fs.unlinkSync(pidFile)}catch{};log('stop '+(p||''));return {ok:true}}
function tail(f,n=12000){try{const b=fs.readFileSync(f);return b.slice(Math.max(0,b.length-n)).toString('utf8')}catch{return ''}}
function psq(s){return "'"+String(s).replace(/'/g,"''")+"'"}
function ps(script){return cp.spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',script],{cwd:ROOT,encoding:'utf8',windowsHide:true,maxBuffer:20*1024*1024})}
function stamp(){return new Date().toISOString().replace(/[-:T.Z]/g,'').slice(0,14)}
function backup(){
 const dest=path.join(B,`sisebom-backup-${stamp()}.zip`);
 const s=`$r=${psq(ROOT)};$d=${psq(dest)};$t=Join-Path $env:TEMP ('sb-'+[guid]::NewGuid());New-Item -ItemType Directory -Force -Path $t|Out-Null;Get-ChildItem -LiteralPath $r -Force|Where-Object{$_.Name -notin @('node_modules','backups','.git')}|ForEach-Object{Copy-Item -LiteralPath $_.FullName -Destination $t -Recurse -Force};Compress-Archive -Path (Join-Path $t '*') -DestinationPath $d -Force;Remove-Item $t -Recurse -Force`;
 const r=ps(s); if(r.status!==0||!fs.existsSync(dest))throw Error('백업 실패: '+(r.stderr||r.stdout)); return dest
}
function latestApply(){return fs.readdirSync(ROOT).filter(x=>/^apply-.*\.js$/i.test(x)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).pop()||null}
function applyZip(zip){
 stop();const b=backup(), stage=path.join(R,'stage-'+Date.now());fs.mkdirSync(stage,{recursive:true});
 let r=ps(`Expand-Archive -LiteralPath ${psq(zip)} -DestinationPath ${psq(stage)} -Force`);if(r.status!==0)throw Error('압축 해제 실패: '+(r.stderr||r.stdout));
 r=ps(`$s=${psq(stage)};$r=${psq(ROOT)};Get-ChildItem -LiteralPath $s -Force|Where-Object{$_.Name -ne 'manager'}|ForEach-Object{Copy-Item -LiteralPath $_.FullName -Destination $r -Recurse -Force}`);
 if(r.status!==0)throw Error('파일 적용 실패: '+(r.stderr||r.stdout));
 const a=latestApply();let code=null;if(a){const q=cp.spawnSync(process.execPath,[a],{cwd:ROOT,encoding:'utf8',windowsHide:true,maxBuffer:20*1024*1024});code=q.status;fs.appendFileSync(mgrLog,`\nAPPLY ${a}\n${q.stdout||''}\n${q.stderr||''}\n`)}
 try{fs.rmSync(stage,{recursive:true,force:true});fs.unlinkSync(zip)}catch{}
 start();return {ok:true,backup:path.basename(b),apply:a,applyExitCode:code}
}
function json(res,c,o){res.writeHead(c,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(o))}
function local(req){const a=req.socket.remoteAddress||'';return a==='127.0.0.1'||a==='::1'||a.endsWith('127.0.0.1')}
async function health(){return new Promise(ok=>{const q=http.get({host:'127.0.0.1',port:APP_PORT,path:'/',timeout:1800},r=>{r.resume();ok({ok:true,status:r.statusCode})});q.on('timeout',()=>{q.destroy();ok({ok:false,error:'timeout'})});q.on('error',e=>ok({ok:false,error:e.message}))})}
const srv=http.createServer(async(req,res)=>{
 if(!local(req)){res.writeHead(403);return res.end('local only')}
 const u=new URL(req.url,`http://${HOST}:${PORT}`);
 try{
  if(req.method==='GET'&&u.pathname==='/'){const f=path.join(M,'public','index.html');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(fs.readFileSync(f))}
  if(req.method==='GET'&&u.pathname==='/api/status'){const p=pid();return json(res,200,{ok:true,running:!!(p&&alive(p)),pid:p,health:await health(),errorLog:tail(errLog),managerLog:tail(mgrLog)})}
  if(req.method==='POST'&&u.pathname==='/api/start')return json(res,200,start());
  if(req.method==='POST'&&u.pathname==='/api/stop')return json(res,200,stop());
  if(req.method==='POST'&&u.pathname==='/api/restart'){stop();return json(res,200,start())}
  if(req.method==='POST'&&u.pathname==='/api/update'){
   const name=(u.searchParams.get('filename')||'update.zip').replace(/[^a-zA-Z0-9._-]/g,'_');if(!name.toLowerCase().endsWith('.zip'))return json(res,400,{ok:false,error:'ZIP만 가능'});
   const f=path.join(R,'upload-'+Date.now()+'-'+name),w=fs.createWriteStream(f);let n=0,bad=false;
   req.on('data',c=>{n+=c.length;if(n>300*1024*1024){bad=true;req.destroy();w.destroy()}else w.write(c)});
   req.on('end',()=>{if(bad)return;w.end();try{json(res,200,applyZip(f))}catch(e){log(e.stack||e.message);json(res,500,{ok:false,error:e.message})}});return
  }
  res.writeHead(404);res.end('not found')
 }catch(e){log(e.stack||e.message);json(res,500,{ok:false,error:e.message})}
});
srv.listen(PORT,HOST,()=>{log('manager start');console.log(`http://${HOST}:${PORT}`);start()});
