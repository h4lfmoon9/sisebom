'use strict';
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const serverPath = path.join(root, 'server', 'server.js');
const scriptPath = path.join(root, 'script.js');
const stylePath = path.join(root, 'style.css');

function fail(msg){ console.error('\n[28단계] '+msg); process.exit(1); }
if(!fs.existsSync(serverPath)||!fs.existsSync(scriptPath)) fail('sisebom 저장소 루트에서 실행해 주세요.');

let server=fs.readFileSync(serverPath,'utf8');
let script=fs.readFileSync(scriptPath,'utf8');
let style=fs.existsSync(stylePath)?fs.readFileSync(stylePath,'utf8'):'';

if(!server.includes('STEP28_CATALOG')){
  const imp='const { diagnoseOne, diagnosePublicSearch } = require("./liveDiagnostics");';
  if(!server.includes(imp)) fail('server.js import 위치를 찾지 못했습니다.');
  server=server.replace(imp, imp+'\nconst { getStaticCatalog, getLiveCatalog, getCatalogStatus } = require("./catalog"); // STEP28_CATALOG');

  const getPhones=/function getPhones\(\) \{[\s\S]*?\n\}\n\nfunction normalize\(text\) \{/;
  if(!getPhones.test(server)) fail('server.js getPhones()를 찾지 못했습니다.');
  server=server.replace(getPhones,'function getPhones() {\n  return getStaticCatalog();\n}\n\nfunction normalize(text) {');

  const route='app.get("/api/phones", (req, res) => res.json(getPhones()));';
  if(!server.includes(route)) fail('/api/phones 라우트를 찾지 못했습니다.');

  server=server.replace(route,`app.get("/api/phones", async (req, res) => {
  const live = String(req.query.live || "") === "1";
  const force = String(req.query.refresh || "") === "1";

  if (!live) {
    res.set("Cache-Control", "public, max-age=300");
    return res.json(getPhones());
  }

  try {
    const phones = await getLiveCatalog({ force });
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    return res.json(phones);
  } catch (error) {
    console.error("자동 제품 카탈로그 갱신 오류:", error.message);
    return res.json(getPhones());
  }
});

app.get("/api/catalog/status", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(getCatalogStatus());
});`);
}

if(!script.includes('STEP28_DYNAMIC_CATALOG')){
  const first="const P=window.SISEBOM_PHONES||[],$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],won=n=>Number.isFinite(Number(n))&&Number(n)>0?Math.round(Number(n)).toLocaleString('ko-KR')+'원':'-';";
  if(!script.includes(first)) fail('script.js 데이터 선언을 찾지 못했습니다.');
  script=script.replace(first,"let P=[...(window.SISEBOM_PHONES||[])];const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],won=n=>Number.isFinite(Number(n))&&Number(n)>0?Math.round(Number(n)).toLocaleString('ko-KR')+'원':'-'; // STEP28_DYNAMIC_CATALOG");

  const aliasFn="function searchableAliases(p){return [p.name,...(p.aliases||[])].map(norm).filter(Boolean)}";
  if(!script.includes(aliasFn)) fail('searchableAliases()를 찾지 못했습니다.');

  const helpers=`
function apiPhoneToUi(p){
  const specs=p?.specs||{},scores=p?.scores||{};
  const perfRaw=p?.performance??scores?.performance;
  const perf=Number.isFinite(Number(perfRaw))?Number(perfRaw):null;
  const prices=Object.values(p?.launchPrices||{}).map(Number).filter(Number.isFinite);
  return {
    id:p.id,name:p.name,aliases:Array.isArray(p.aliases)?p.aliases:[],image:p.image||'',brand:p.brand||'',
    chipset:p.chipset??specs.chipset??'정보 확인 중',
    display:p.display??specs.display??'정보 확인 중',
    camera:p.camera??specs.camera??'정보 확인 중',
    charging:p.charging??specs.charging??'정보 확인 중',
    frame:p.frame??specs.frame??'정보 확인 중',
    storage:Array.isArray(p.storage)?p.storage:[],performance:perf,
    newPrice:Number(p.newPrice)||prices[0]||0,
    autoDiscovered:!!p.autoDiscovered,officialSource:p.officialSource||''
  };
}
function mergeCatalogPhones(apiPhones){
  const byId=new Map(P.map((p,i)=>[p.id,i]));
  for(const raw of apiPhones||[]){
    if(!raw?.id||!raw?.name)continue;
    const incoming=apiPhoneToUi(raw),idx=byId.get(incoming.id);
    if(idx==null){byId.set(incoming.id,P.length);P.push(incoming);continue}
    const old=P[idx];
    P[idx]={...incoming,...old,
      aliases:[...new Set([...(incoming.aliases||[]),...(old.aliases||[])])],
      storage:(old.storage&&old.storage.length)?old.storage:incoming.storage,
      autoDiscovered:old.autoDiscovered||incoming.autoDiscovered,
      officialSource:old.officialSource||incoming.officialSource
    };
  }
  window.SISEBOM_PHONES=P;
}
async function hydrateCatalog(){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),55000);
  try{
    const r=await fetch(\`\${API_BASE}/api/phones?live=1\`,{headers:{accept:'application/json'},signal:controller.signal});
    if(!r.ok)return;
    const phones=await r.json();
    if(!Array.isArray(phones))return;
    mergeCatalogPhones(phones);
    renderModels();
  }catch(e){console.warn('자동 제품 카탈로그 갱신 생략:',e?.message||e)}
  finally{clearTimeout(timer)}
}`;
  script=script.replace(aliasFn,aliasFn+helpers);

  const oldSet="function setImage(p){const im=$('#productImage'),fb=$('#imageFallback');im.onerror=()=>{im.hidden=true;fb.hidden=false};im.src=p.image;im.hidden=false;fb.hidden=true}";
  const newSet="function setImage(p){const im=$('#productImage'),fb=$('#imageFallback');if(!p?.image){im.hidden=true;im.removeAttribute('src');fb.hidden=false;return}im.onerror=()=>{im.hidden=true;fb.hidden=false};im.src=p.image;im.hidden=false;fb.hidden=true}";
  if(!script.includes(oldSet)) fail('setImage()를 찾지 못했습니다.');
  script=script.replace(oldSet,newSet);

  const oldPerf="function perfSub(p){const base=p.performance||50;return {daily:Math.min(100,base+3),game:Math.max(0,base-3),camera:Math.min(100,Math.max(20,base+(p.name.includes('Pro')?4:-4)))} }";
  const newPerf="function perfSub(p){if(!Number.isFinite(Number(p?.performance)))return {daily:null,game:null,camera:null};const base=Number(p.performance);return {daily:Math.min(100,base+3),game:Math.max(0,base-3),camera:Math.min(100,Math.max(20,base+(p.name.includes('Pro')?4:-4)))} }";
  if(!script.includes(oldPerf)) fail('perfSub()를 찾지 못했습니다.');
  script=script.replace(oldPerf,newPerf);

  script=script
    .replace("$('#perfScore').textContent=p.performance;","$('#perfScore').textContent=p.performance??'-';")
    .replace("$('#dailyScore').textContent=s.daily;","$('#dailyScore').textContent=s.daily??'-';")
    .replace("$('#gameScore').textContent=s.game;","$('#gameScore').textContent=s.game??'-';")
    .replace("$('#cameraScore').textContent=s.camera;","$('#cameraScore').textContent=s.camera??'-';")
    .replace("$('#dailyBar').style.width=s.daily+'%';","$('#dailyBar').style.width=(s.daily??0)+'%';")
    .replace("$('#gameBar').style.width=s.game+'%';","$('#gameBar').style.width=(s.game??0)+'%';")
    .replace("$('#cameraBar').style.width=s.camera+'%';","$('#cameraBar').style.width=(s.camera??0)+'%';");

  const init="renderModels();renderProduct();loadLiveListings();\n})();";
  if(!script.includes(init)) fail('script.js 초기화 위치를 찾지 못했습니다.');
  script=script.replace(init,"renderModels();renderProduct();loadLiveListings();hydrateCatalog();\n})();");
}

if(!style.includes('STEP28_AUTO_CATALOG')){
  style+=`\n/* STEP28_AUTO_CATALOG */\n.model-card img[src=""]{visibility:hidden}\n`;
}

fs.writeFileSync(serverPath,server,'utf8');
fs.writeFileSync(scriptPath,script,'utf8');
fs.writeFileSync(stylePath,style,'utf8');

console.log('✅ 시세봄 28단계 적용 완료');
console.log('GitHub Desktop에서 Commit / Push 하세요.');
