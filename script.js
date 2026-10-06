(()=>{'use strict';

let P=[...(window.SISEBOM_PHONES||[])];
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const won=n=>Number.isFinite(Number(n))&&Number(n)>0?Math.round(Number(n)).toLocaleString('ko-KR')+'원':'-';

const ONLINE_API='https://sisebom.onrender.com';
const LOCAL_API='http://localhost:3000';
const API_BASE=['localhost','127.0.0.1'].includes(location.hostname)?LOCAL_API:ONLINE_API;

let current=P.find(x=>x.id==='iphone15'||x.id==='iphone-15')||P[0];
let filters={platform:'all',storage:'all',min:null,max:null,sort:'cheap'};
let liveListings=[];
let liveState={loading:false,error:'',fetchedAt:'',providers:{},analysis:null,collecting:false};
let requestSeq=0;
let autoRefreshRounds=0;
let autoRefreshTimer=null;
let brandFilter='all';
let listingPage=1;
const LISTINGS_PER_PAGE=9;

function norm(s){
  return String(s||'')
    .toLowerCase()
    .replace(/iphone/g,'아이폰')
    .replace(/galaxy/g,'갤럭시')
    .replace(/xiaomi/g,'xiaomi')
    .replace(/샤오미/g,'xiaomi')
    .replace(/redmi/g,'redmi')
    .replace(/레드미/g,'redmi')
    .replace(/poco/g,'poco')
    .replace(/포코/g,'poco')
    .replace(/motorola/g,'모토로라')
    .replace(/울트라/g,'ultra')
    .replace(/폴드/g,'fold')
    .replace(/플립/g,'flip')
    .replace(/프로\s*맥스/g,'promax')
    .replace(/pro\s*max/g,'promax')
    .replace(/프로/g,'pro')
    .replace(/플러스/g,'plus')
    .replace(/\+/g,'plus')
    .replace(/미니/g,'mini')
    .replace(/에어/g,'air')
    .replace(/에스\s*이/g,'se')
    .replace(/gb/g,'')
    .replace(/기가/g,'')
    .replace(/[\s_\-/().]/g,'');
}

function searchableAliases(p){
  return [p?.name,...(p?.aliases||[])].filter(Boolean).map(norm).filter(Boolean);
}

function appleImageCandidates(p){
  if(String(p?.brand||'').toLowerCase()!=='apple')return [];

  const id=String(p?.id||'').trim();
  if(!id)return [];

  const ids=[id];
  if(id==='iphone15')ids.push('iphone-15');

  const out=[];
  for(const key of ids){
    out.push(`images/apple/${key}.png`);
    out.push(`images/apple/provided/${key}.png`);
  }

  return [...new Set(out)];
}

function productImageCandidates(p){
  return [...new Set([
    p?.image||'',
    ...(Array.isArray(p?.imageCandidates)?p.imageCandidates:[]),
    ...appleImageCandidates(p)
  ].filter(Boolean))];
}

function apiPhoneToUi(p){
  const specs=p?.specs||{},scores=p?.scores||{};
  const perfRaw=p?.performance??scores?.performance;
  const perf=Number.isFinite(Number(perfRaw))?Number(perfRaw):null;
  const launchPrices=p?.launchPrices||{};
  const priceValues=Object.values(launchPrices).map(Number).filter(x=>Number.isFinite(x)&&x>0);

  return {
    id:p.id,
    name:p.name,
    aliases:Array.isArray(p.aliases)?p.aliases:[],
    image:p.image||'',
    imageCandidates:Array.isArray(p.imageCandidates)?p.imageCandidates:[],
    imageMode:p.imageMode||'',
    imageVerified:!!p.imageVerified,
    scoreSource:p.scoreSource||'',
    brand:p.brand||'',
    series:p.series||'',
    chipset:p.chipset??specs.chipset??'정보 확인 중',
    display:p.display??specs.display??'정보 확인 중',
    camera:p.camera??specs.camera??'정보 확인 중',
    charging:p.charging??specs.charging??'정보 확인 중',
    frame:p.frame??specs.frame??'정보 확인 중',
    storage:Array.isArray(p.storage)?p.storage:[],
    performance:perf,
    scores,
    launchPrices,
    newPrice:Number(p.newPrice)||priceValues[0]||0,
    autoDiscovered:!!p.autoDiscovered,
    officialSource:p.officialSource||''
  };
}

function mergeCatalogPhones(apiPhones){
  const byId=new Map(P.map((p,i)=>[p.id,i]));

  for(const raw of apiPhones||[]){
    if(!raw?.id||!raw?.name)continue;
    const incoming=apiPhoneToUi(raw);
    const idx=byId.get(incoming.id);

    if(idx==null){
      byId.set(incoming.id,P.length);
      P.push(incoming);
      continue;
    }

    const old=P[idx];
    const merged={
      ...incoming,
      ...old,
      aliases:[...new Set([...(incoming.aliases||[]),...(old.aliases||[])])],
      storage:(old.storage&&old.storage.length)?old.storage:incoming.storage,
      launchPrices:Object.keys(old.launchPrices||{}).length?old.launchPrices:incoming.launchPrices,
      autoDiscovered:old.autoDiscovered||incoming.autoDiscovered,
      officialSource:old.officialSource||incoming.officialSource
    };

    const missing=v=>v==null||v===''||v==='정보 확인 중';
    for(const field of ['chipset','display','camera','charging','frame']){
      if(missing(old[field])&&!missing(incoming[field]))merged[field]=incoming[field];
    }
    if(!Number.isFinite(Number(old.performance))&&Number.isFinite(Number(incoming.performance))){
      merged.performance=incoming.performance;
    }
    merged.scores={...(incoming.scores||{}),...(old.scores||{})};
    for(const [k,v] of Object.entries(incoming.scores||{})){
      if(!Number.isFinite(Number(old.scores?.[k]))&&Number.isFinite(Number(v)))merged.scores[k]=v;
    }

    merged.image=old.image||incoming.image||appleImageCandidates(merged)[0]||'';
    merged.imageMode=old.imageMode||incoming.imageMode||'';
    merged.imageVerified=old.imageVerified||incoming.imageVerified;
    merged.scoreSource=old.scoreSource||incoming.scoreSource||'';
    merged.imageCandidates=[...new Set([
      ...(old.imageCandidates||[]),
      ...(incoming.imageCandidates||[]),
      ...appleImageCandidates(merged)
    ])];

    P[idx]=merged;
  }

  window.SISEBOM_PHONES=P;
}

async function hydrateCatalog(){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),9000);

  try{
    // 29단계부터 서버는 공식 제조사 스캔을 뒤에서 시작하고 현재 카탈로그를 즉시 반환한다.
    const r=await fetch(`${API_BASE}/api/phones?live=1`,{
      headers:{accept:'application/json'},
      signal:controller.signal
    });

    if(!r.ok)return;
    const phones=await r.json();
    if(!Array.isArray(phones))return;

    mergeCatalogPhones(phones);
    renderBrandFilters();
    renderModels();
    renderCompare();
  }catch(e){
    console.warn('자동 제품 카탈로그 갱신 생략:',e?.message||e);
  }finally{
    clearTimeout(timer);
  }
}

function findPhone(q){
  let nq=norm(q);
  if(nq==='아이폰9')nq=norm('iPhone X');
  if(!nq)return current;

  let exact=P.find(p=>searchableAliases(p).some(a=>a===nq));
  if(exact)return exact;

  let best=null,bestScore=-Infinity;
  for(const p of P){
    for(const a of searchableAliases(p)){
      if(['아이폰','갤럭시','xiaomi','redmi','poco','모토로라'].includes(a))continue;
      let score=-Infinity;
      if(nq.includes(a))score=5000+a.length;
      else if(a.includes(nq))score=3000-(a.length-nq.length);
      if(score>bestScore){bestScore=score;best=p}
    }
  }
  return best||null;
}

function selectableStorage(p){
  const raw=(Array.isArray(p?.storage)?p.storage:[])
    .map(Number)
    .filter(x=>Number.isFinite(x)&&x>0&&x<=512);

  const unique=[...new Set(raw)].sort((a,b)=>a-b);
  if(unique.length)return unique;

  // DB에 용량 정보가 아직 없는 자동등록 모델도 필터를 바로 쓸 수 있게 한다.
  return [128,256,512];
}

function storageText(p){
  return (p?.storage||[]).map(x=>x>=1024?(x/1024)+'TB':x+'GB').join(' · ')||'-';
}

function updateImageNote(p,src=''){
  const note=$('#imageNote');
  if(!note)return;
  if(p?.imageMode==='live-listing')note.textContent='실제 중고 매물의 첫 사진';
  else if(p?.imageVerified)note.textContent='공식 제조사 공개 이미지';
  else if(/^images\//.test(src||p?.image||''))note.textContent='등록된 대표 이미지';
  else note.textContent='공식 제조사 이미지 우선 · 없으면 실제 매물 사진';
}

function setImage(p){
  const im=$('#productImage'),fb=$('#imageFallback');
  const candidates=productImageCandidates(p);
  let index=0;

  const tryNext=()=>{
    if(index>=candidates.length){
      im.hidden=true;
      im.removeAttribute('src');
      fb.hidden=false;
      return;
    }

    const src=candidates[index++];
    im.onerror=tryNext;
    im.onload=()=>{
      im.hidden=false;
      fb.hidden=true;
      if(p&&!p.image)p.image=src;
      updateImageNote(p,src);
    };
    im.src=src;
    im.hidden=false;
    fb.hidden=true;
  };

  tryNext();
}

function perfSub(p){
  const scores=p?.scores||{};
  const base=Number(p?.performance);
  if(Number.isFinite(base)){
    return {
      daily:Number.isFinite(Number(scores.daily))?Number(scores.daily):Math.min(100,base+3),
      game:Number.isFinite(Number(scores.gaming))?Number(scores.gaming):Math.max(0,base-3),
      camera:Number.isFinite(Number(scores.camera))?Number(scores.camera):Math.min(100,Math.max(20,base+(/pro|ultra/i.test(p.name)?4:-4)))
    };
  }
  return {
    daily:Number.isFinite(Number(scores.daily))?Number(scores.daily):null,
    game:Number.isFinite(Number(scores.gaming))?Number(scores.gaming):null,
    camera:Number.isFinite(Number(scores.camera))?Number(scores.camera):null
  };
}

function quantile(sorted,q){
  if(!sorted.length)return 0;
  const pos=(sorted.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos);
  if(lo===hi)return sorted[lo];
  return sorted[lo]+(sorted[hi]-sorted[lo])*(pos-lo);
}

function robustMarketStats(listings){
  const valid=listings.filter(x=>Number.isFinite(Number(x.price))&&Number(x.price)>0);
  const prices=valid.map(x=>Number(x.price)).sort((a,b)=>a-b);

  if(!prices.length)return {count:0,usedCount:0,outlierCount:0,min:0,average:0,max:0,median:0,q1:0,q3:0,spread:0};

  const q1=quantile(prices,.25),q3=quantile(prices,.75),iqr=q3-q1;
  let used=valid;

  if(prices.length>=5&&iqr>0){
    const low=Math.max(1000,q1-1.5*iqr),high=q3+1.5*iqr;
    const core=valid.filter(x=>Number(x.price)>=low&&Number(x.price)<=high);
    if(core.length>=Math.max(3,Math.ceil(valid.length*.6)))used=core;
  }

  const up=used.map(x=>Number(x.price)).sort((a,b)=>a-b);
  const average=up.reduce((a,b)=>a+b,0)/up.length;
  const median=quantile(up,.5);
  const uq1=quantile(up,.25),uq3=quantile(up,.75);

  return {
    count:valid.length,
    usedCount:used.length,
    outlierCount:valid.length-used.length,
    min:Math.min(...up),
    average,
    max:Math.max(...up),
    median,
    q1:uq1,
    q3:uq3,
    spread:median>0?(uq3-uq1)/median:0
  };
}

function localAnalysis(arr){
  const stats=robustMarketStats(arr);
  const platformCount=new Set(arr.map(x=>x.platform).filter(Boolean)).size;
  const recent=arr.filter(x=>Number.isFinite(Number(x.minutes))&&Number(x.minutes)<=1440).length;

  if(!stats.usedCount){
    return {score:0,judgement:{status:'none',title:'분석 대기'},confidence:{level:'low',label:'신뢰도 낮음'},stats,summary:'현재 조건에서 분석할 판매중 매물이 없습니다.'};
  }

  let score=50;
  score+=Math.min(14,stats.usedCount*.65);
  score+=Math.min(7.5,platformCount*2.5);
  score+=Math.min(6,recent*.35);
  score-=Math.min(14,Math.max(0,stats.spread-.18)*24);
  if(stats.usedCount<5)score-=10;
  score=Math.max(1,Math.min(100,Math.round(score)));

  const judgement=score>=70?{status:'green',title:'구매하기 좋은 편'}:score>=40?{status:'yellow',title:'조금 더 비교'}:{status:'red',title:'구매 비추천'};
  const confPoints=Math.min(100,Math.round(stats.usedCount*2.2+platformCount*12+(stats.outlierCount<=Math.max(2,stats.count*.2)?15:7)));
  const confidence=confPoints>=75?{level:'high',label:'신뢰도 높음'}:confPoints>=45?{level:'medium',label:'신뢰도 보통'}:{level:'low',label:'신뢰도 낮음'};

  return {
    score,
    judgement,
    confidence,
    stats,
    summary:`${current?.name||'검색 제품'} 판매중 매물 ${stats.count}개 중 ${stats.usedCount}개를 시세 계산에 사용했습니다. 중앙값은 ${won(stats.median)}이며 ${confidence.label}입니다.`
  };
}

function htmlEscape(s){
  return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function buildListingQuery(p){
  const aliases=p?.aliases||[];
  const korean=aliases.find(a=>/[가-힣]/.test(a)&&!/\b(?:gb|tb|기가)\b/i.test(a));
  return String(korean||p?.name||'')
    .replace(/Pro Max/ig,'프로맥스')
    .replace(/Pro/ig,'프로')
    .replace(/Plus/ig,'플러스')
    .replace(/mini/ig,'미니')
    .replace(/Ultra/ig,'울트라');
}

function liveSearchQuery(){
  const base=buildListingQuery(current);
  if(filters.storage==='all')return base;
  const n=Number(filters.storage);
  return `${base} ${n>=1024?n/1024+'TB':n+'GB'}`;
}

function availableOnly(x){
  return !/(예약\s*중|판매\s*완료|거래\s*완료|판매종료|거래종료)/i.test(`${x?.status||''} ${x?.title||''}`);
}

function filteredListings(){
  let a=liveListings.filter(availableOnly);
  if(filters.platform!=='all')a=a.filter(x=>x.platform===filters.platform);
  // FINAL V7: selected capacities are strict buckets. Unknown-capacity cards
  // are no longer shown in every 128/256/512GB tab.
  if(filters.storage!=='all')a=a.filter(x=>String(x.storage)===String(filters.storage));
  if(filters.min!=null)a=a.filter(x=>Number(x.price)>=filters.min);
  if(filters.max!=null)a=a.filter(x=>Number(x.price)<=filters.max);

  if(filters.sort==='cheap')a.sort((x,y)=>Number(x.price)-Number(y.price));
  if(filters.sort==='high')a.sort((x,y)=>Number(y.price)-Number(x.price));
  if(filters.sort==='new')a.sort((x,y)=>Number(x.minutes??999999)-Number(y.minutes??999999));
  return a;
}

function renderProduct(){
  if(!current)return;
  const p=current,s=perfSub(p);
  $('#resultName').textContent=p.name;
  $('#productHeading').textContent=p.name+' 제품 정보';
  $('#specManufacturer').textContent=p.brand||'-';
  $('#specChipset').textContent=p.chipset||'정보 확인 중';
  $('#specDisplay').textContent=p.display||'정보 확인 중';
  $('#specCamera').textContent=p.camera||'정보 확인 중';
  $('#specCharging').textContent=p.charging||'정보 확인 중';
  $('#specFrame').textContent=p.frame||'정보 확인 중';
  $('#specStorage').textContent=storageText(p);
  $('#perfScore').textContent=p.performance??'-';
  $('#dailyScore').textContent=s.daily??'-';
  $('#gameScore').textContent=s.game??'-';
  $('#cameraScore').textContent=s.camera??'-';
  $('#dailyBar').style.width=(s.daily??0)+'%';
  $('#gameBar').style.width=(s.game??0)+'%';
  $('#cameraBar').style.width=(s.camera??0)+'%';
  setImage(p);
  document.title='시세봄 - '+p.name;
  renderStorage();
  renderCompare();
}

function renderStorage(){
  const box=$('#storageFilters');
  if(!box||!current)return;
  const options=selectableStorage(current);
  box.innerHTML='<button class="chip '+(filters.storage==='all'?'active':'')+'" data-storage="all">전체</button>'+
    (options.map(s=>`<button class="chip ${String(filters.storage)===String(s)?'active':''}" data-storage="${s}">${s}GB</button>`).join(''));

  box.querySelectorAll('button').forEach(b=>b.onclick=async()=>{
    const next=b.dataset.storage;
    if(String(filters.storage)===String(next))return;
    filters.storage=next;
    listingPage=1;
    autoRefreshRounds=0;
    renderStorage();
    await loadLiveListings();
  });
}

function analysisFor(arr){
  const noExtraClientFilter=filters.platform==='all'&&filters.min==null&&filters.max==null;
  if(noExtraClientFilter&&liveState.analysis&&Number(liveState.analysis?.stats?.count)===arr.length){
    return liveState.analysis;
  }
  return localAnalysis(arr);
}

function renderMarket(){
  const arr=filteredListings();
  const stats=robustMarketStats(arr);
  const analysis=analysisFor(arr);

  $('#resultCount').textContent=arr.length;
  $('#visibleCount').textContent=arr.length;
  $('#minPrice').textContent=won(stats.min);
  $('#avgPrice').textContent=won(stats.average);
  $('#maxPrice').textContent=won(stats.max);

  let newPrice=filters.storage!=='all'
    ?Number(current?.launchPrices?.[String(filters.storage)]||0)
    :Number(current?.newPrice)||0;
  $('#newPrice').textContent=newPrice?won(newPrice):'정보 없음';

  const note=$('#marketDataNote');
  if(note){
    if(!arr.length)note.textContent=liveState.loading?'실제 매물을 불러오는 중입니다.':'시세를 계산할 매물이 없습니다.';
    else note.textContent=`판매중 ${arr.length}개 중 ${stats.usedCount}개로 시세 계산${stats.outlierCount?` · 극단값 ${stats.outlierCount}개 제외`:''}${liveState.collecting?' · 추가 매물 수집 중':''}`;
  }

  const confidence=$('#analysisConfidence');
  if(confidence){
    confidence.textContent=analysis?.confidence?.label||'분석 중';
    confidence.className=`confidence ${analysis?.confidence?.level||'low'}`;
  }

  if(!stats.usedCount){
    $('#buyScore').textContent='-';
    $('#scoreCircle').className='score-circle';
    $('#buyBadge').className='buy-badge';
    $('#buyBadge').textContent=liveState.loading?'불러오는 중':'분석 대기';
    $('#aiHeadline').textContent=liveState.loading?'실제 매물 불러오는 중':liveState.error?'매물 불러오기 실패':'매물 없음';
    $('#aiText').textContent=liveState.loading?'공개 검색 페이지에서 실제 매물을 수집하고 있습니다.':liveState.error?liveState.error:'현재 조건에 맞는 판매중 매물이 없습니다.';
  }else{
    const score=Number(analysis?.score)||0;
    const status=analysis?.judgement?.status||'yellow';
    const title=analysis?.judgement?.title||'조금 더 비교';

    $('#buyScore').textContent=score;
    $('#scoreCircle').className='score-circle '+status;
    $('#buyBadge').className='buy-badge '+status;
    $('#buyBadge').textContent=title;
    $('#aiHeadline').textContent=title;
    $('#aiText').textContent=analysis?.summary||`${current.name} 판매중 매물 ${arr.length}개를 분석했습니다.`;
  }

  $('#chartLabel').textContent=filters.storage==='all'?'전체 용량':(Number(filters.storage)>=1024?Number(filters.storage)/1024+'TB':filters.storage+'GB');
  renderBars(arr);
  renderListings(arr,stats);
}

function renderBars(arr){
  if(!arr.length){
    $('#bars').innerHTML='<div class="muted listing-empty">표시할 가격 데이터가 없습니다.</div>';
    return;
  }

  const sorted=[...arr].sort((a,b)=>Number(a.price)-Number(b.price)).slice(0,30);
  const ps=sorted.map(x=>Number(x.price)).filter(Number.isFinite);
  const mn=Math.min(...ps),mx=Math.max(...ps);

  $('#bars').innerHTML=sorted.map(x=>`<div class="bar-wrap" title="${won(x.price)}"><div class="bar" style="height:${40+((Number(x.price)-mn)/(mx-mn||1))*150}px"></div><div class="bar-label">${Math.round(Number(x.price)/10000)}만</div></div>`).join('');
}

function cleanListingTitle(x){
  let t=String(x?.title||'').replace(/^Title:\s*/i,'').replace(/\s+/g,' ').trim();
  t=t.replace(/\s*\|\s*디지털기기\s*\|\s*당근\s*중고거래.*$/i,'');
  t=t.replace(/\s*\|\s*중고나라\s*-\s*안심되는\s*중고거래.*$/i,'');
  if(x?.platform==='번개장터')t=t.replace(/\s+상품상태\b[\s\S]*$/i,'').replace(/\s+제품정보\b[\s\S]*$/i,'');
  if(t.length>72)t=t.slice(0,69).trimEnd()+'…';
  return t||`${x?.platform||'중고'} 매물`;
}

function listingMetaText(x){
  const bits=[];
  if(String(x?.region||'').trim())bits.push(String(x.region).trim());
  if(String(x?.timeText||'').trim())bits.push(String(x.timeText).trim());
  return bits.join(' · ')||'상세 정보는 원본에서 확인';
}

function platformCountText(items){
  return ['당근','번개장터','중고나라'].map(name=>`${name} ${items.filter(x=>x.platform===name).length}개`).join(' · ');
}

function maybeAdoptLiveRepresentativeImage(){
  // FINAL V7: 대표이미지 자동 삽입 중단. 기존에 등록된 이미지만 사용한다.
  return false;
}

function providerIssueSummary(providers){
  const blocked=[];
  const failed=[];

  for(const [name,status] of Object.entries(providers||{})){
    if(status?.blocked)blocked.push(name);
    else if(status?.ok===false)failed.push(name);
  }

  const parts=[];
  if(blocked.length)parts.push(`${blocked.join('·')} 공개 페이지 접근 제한`);
  if(failed.length)parts.push(`${failed.join('·')} 일시 오류`);

  return {blocked,failed,text:parts.join(' · ')};
}

function bindListingImageFallbacks(grid){
  grid.querySelectorAll('img[data-listing-image]').forEach(img=>{
    img.addEventListener('error',()=>{
      const fallback=document.createElement('div');
      fallback.className='listing-image placeholder';
      fallback.innerHTML='<b>사진 없음</b><span>원본 매물에서 확인</span>';
      img.replaceWith(fallback);
    },{once:true});
  });
}

function ensureListingPagination(){
  let box=$('#listingPagination');
  if(box)return box;

  box=document.createElement('nav');
  box.id='listingPagination';
  box.className='listing-pagination';
  box.setAttribute('aria-label','매물 페이지 선택');
  $('#listingGrid')?.insertAdjacentElement('afterend',box);
  return box;
}

function paginationNumbers(totalPages,currentPage){
  if(totalPages<=7)return Array.from({length:totalPages},(_,i)=>i+1);

  const nums=new Set([1,totalPages,currentPage,currentPage-1,currentPage+1]);
  if(currentPage<=3){nums.add(2);nums.add(3);nums.add(4)}
  if(currentPage>=totalPages-2){nums.add(totalPages-1);nums.add(totalPages-2);nums.add(totalPages-3)}
  return [...nums].filter(x=>x>=1&&x<=totalPages).sort((a,b)=>a-b);
}

function renderListingPagination(totalPages,totalCount){
  const box=ensureListingPagination();
  if(!box)return;

  if(totalPages<=1){
    box.hidden=true;
    box.innerHTML='';
    return;
  }

  box.hidden=false;
  const pages=paginationNumbers(totalPages,listingPage);
  let previous=0;
  let html=`<button data-page="${Math.max(1,listingPage-1)}" ${listingPage===1?'disabled':''}>이전</button>`;

  for(const page of pages){
    if(previous&&page-previous>1)html+='<span class="page-gap">…</span>';
    html+=`<button class="${page===listingPage?'active':''}" data-page="${page}" aria-current="${page===listingPage?'page':'false'}">${page}</button>`;
    previous=page;
  }

  html+=`<button data-page="${Math.min(totalPages,listingPage+1)}" ${listingPage===totalPages?'disabled':''}>다음</button>`;
  html+=`<span class="page-count">총 ${totalCount}개 · ${listingPage}/${totalPages}페이지</span>`;
  box.innerHTML=html;

  box.querySelectorAll('button[data-page]').forEach(btn=>btn.onclick=()=>{
    const page=Number(btn.dataset.page);
    if(!Number.isFinite(page)||page===listingPage)return;
    listingPage=page;
    renderMarket();
    $('#listingGrid')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
}

function renderListings(a,marketStats=robustMarketStats(a)){
  const grid=$('#listingGrid');
  const pager=ensureListingPagination();

  if(liveState.loading&&!a.length){
    if(pager)pager.hidden=true;
    grid.innerHTML='<div class="listing-state"><b>실제 중고 매물 수집 중...</b><span>첫 결과가 준비되면 바로 표시하고, 뒤에서 추가 매물을 계속 모읍니다.</span></div>';
    return;
  }

  if(liveState.error&&!a.length){
    if(pager)pager.hidden=true;
    grid.innerHTML=`<div class="listing-state error"><b>매물을 불러오지 못했습니다.</b><span>${htmlEscape(liveState.error)}</span></div>`;
    return;
  }

  if(!a.length){
    if(pager)pager.hidden=true;
    grid.innerHTML='<div class="listing-state"><b>아직 확인된 판매중 매물이 없습니다.</b><span>관련 매물을 더 수집하는 중입니다. 잠시 후 자동으로 다시 확인합니다.</span></div>';
    return;
  }

  const totalPages=Math.max(1,Math.ceil(a.length/LISTINGS_PER_PAGE));
  listingPage=Math.max(1,Math.min(listingPage,totalPages));

  const startIndex=(listingPage-1)*LISTINGS_PER_PAGE;
  const pageItems=a.slice(startIndex,startIndex+LISTINGS_PER_PAGE);
  const avg=marketStats.average||a.reduce((s,x)=>s+Number(x.price),0)/a.length;

  grid.innerHTML=pageItems.map(x=>{
    const d=avg?(Number(x.price)-avg)/avg*100:0;
    const dc=d<=-7?'good':d>=10?'bad':'';
    const dt=d<=-7?`평균보다 ${Math.abs(d).toFixed(0)}% 저렴`:d>=10?`평균보다 ${d.toFixed(0)}% 비쌈`:'적정 시세';
    const storage=x.storage?(x.storage>=1024?x.storage/1024+'TB':x.storage+'GB'):'용량 미표기';
    const title=cleanListingTitle(x);
    const meta=listingMetaText(x);
    const img=x.image
      ?`<img class="listing-image" data-listing-image="1" src="${htmlEscape(x.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      :'<div class="listing-image placeholder"><b>사진 없음</b><span>원본 매물에서 확인</span></div>';

    return `<article class="listing">${img}<div class="listing-body"><div class="listing-top"><span class="platform-badge">${htmlEscape(x.platform)}</span><span>${storage}</span></div><h3 title="${htmlEscape(title)}">${htmlEscape(title)}</h3><b class="listing-price">${won(x.price)}</b><div class="deal ${dc}">${dt}</div><div class="listing-meta"><span>${htmlEscape(meta)}</span><a href="${htmlEscape(x.url)}" target="_blank" rel="noopener noreferrer">원본 매물 보기 ↗</a></div></div></article>`;
  }).join('');

  bindListingImageFallbacks(grid);
  renderListingPagination(totalPages,a.length);
}

function renderCompare(){
  const sel=$('#compareSelect');
  if(!sel||!current)return;

  const previous=sel.value;
  sel.innerHTML=P.map(p=>`<option value="${htmlEscape(p.id)}">${htmlEscape(p.name)}</option>`).join('');

  if(previous&&P.some(p=>p.id===previous)&&previous!==current.id)sel.value=previous;
  else sel.value=P.find(x=>x.id!==current.id)?.id||current.id;

  const b=P.find(x=>x.id===sel.value)||P[0];
  if(!b)return;

  $('#compareAName').textContent=current.name;
  $('#compareAChip').textContent=current.chipset||'정보 확인 중';
  $('#compareBChip').textContent=b.chipset||'정보 확인 중';
  $('#compareADisplay').textContent=current.display||'정보 확인 중';
  $('#compareBDisplay').textContent=b.display||'정보 확인 중';
  $('#compareAPerf').textContent=current.performance??'-';
  $('#compareBPerf').textContent=b.performance??'-';
  $('#compareAStorage').textContent=storageText(current);
  $('#compareBStorage').textContent=storageText(b);

  const aPerf=Number(current.performance),bPerf=Number(b.performance);
  if(!Number.isFinite(aPerf)||!Number.isFinite(bPerf)){
    $('#compareText').textContent='둘 중 하나의 성능점수가 아직 준비되지 않아 수치 비교는 보류합니다.';
  }else{
    const diff=aPerf-bPerf;
    $('#compareText').textContent=diff===0?'두 제품의 내부 성능점수는 같습니다.':diff>0?`${current.name}이 내부 성능점수 기준 ${diff}점 높습니다.`:`${b.name}이 내부 성능점수 기준 ${-diff}점 높습니다.`;
  }
}

function parseStorage(q,p){
  const raw=String(q||'');
  let m=raw.match(/(1|2)\s*tb/i),v=m?Number(m[1])*1024:null;
  if(v==null){
    m=raw.match(/(32|64|128|256|512|1024|2048)\s*(gb|g|기가)?/i);
    v=m?Number(m[1]):null;
  }
  return v!=null&&v<=512&&selectableStorage(p).includes(v)?String(v):'all';
}

function collectingFromProviders(providers){
  return Object.values(providers||{}).some(v=>v?.ok&&v?.collecting);
}

function scheduleDeepRefresh(){
  clearTimeout(autoRefreshTimer);

  const needsRescue=liveListings.length===0;
  const maxRounds=needsRescue?4:2;
  if((!liveState.collecting&&!needsRescue)||autoRefreshRounds>=maxRounds)return;

  const delay=needsRescue
    ?[7000,12000,18000,25000][autoRefreshRounds]||25000
    :(autoRefreshRounds===0?15000:25000);
  autoRefreshTimer=setTimeout(async()=>{
    autoRefreshRounds++;
    // When zero listings were found, force a brand-new provider job instead
    // of reading the same completed/failed cached job again.
    await loadLiveListings(needsRescue,true);
  },delay);
}

async function loadLiveListings(force=false,background=false){
  if(!current)return;

  const previousListings=[...liveListings];
  const seq=++requestSeq;
  const q=liveSearchQuery();
  const sourceText=$('#listingSourceText');
  const refreshBtn=$('#refreshListingsBtn');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);

  if(!background){
    listingPage=1;
    liveListings=[];
    liveState={loading:true,error:'',fetchedAt:'',providers:{},analysis:null,collecting:false};
    if(refreshBtn){refreshBtn.disabled=true;refreshBtn.textContent='새로고침 중...'}
    if(sourceText)sourceText.textContent='공개 검색 페이지에서 실제 판매중 매물을 수집하고 있습니다.';
    renderMarket();
  }else if(sourceText){
    sourceText.textContent=`현재 ${liveListings.length}개 표시 · 뒤에서 추가 매물을 계속 수집하는 중입니다.`;
  }

  try{
    const refresh=force?'&refresh=1':'';
    const r=await fetch(`${API_BASE}/api/live/combined?q=${encodeURIComponent(q)}&limit=50${refresh}`,{
      headers:{accept:'application/json'},
      signal:controller.signal
    });
    const data=await r.json().catch(()=>({}));

    if(seq!==requestSeq)return;
    if(!r.ok)throw new Error(data.error||`HTTP ${r.status}`);

    const next=(Array.isArray(data.listings)?data.listings:[]).filter(availableOnly);

    // 심층수집 재확인에서 더 적은 임시 결과가 오면 기존 결과를 유지한다.
    if(!background||next.length>=liveListings.length)liveListings=next;
    maybeAdoptLiveRepresentativeImage();

    const providers=data.providers||{};
    const issues=providerIssueSummary(providers);
    const excluded=data.excluded||{};
    const excludedCount=Object.values(excluded).reduce((s,v)=>s+(Number(v)||0),0);
    const fresh=data.fetchedAt?new Date(data.fetchedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}):'';
    const collecting=collectingFromProviders(providers);

    liveState={
      loading:false,
      error:issues.text,
      fetchedAt:data.fetchedAt||'',
      providers,
      excluded,
      stale:!!data.stale,
      analysis:data.analysis||null,
      collecting
    };

    if(sourceText){
      sourceText.textContent=`실제 판매중 ${liveListings.length}개 · ${platformCountText(liveListings)}${collecting?' · 추가 매물 수집 중':''}${issues.text?` · ${issues.text}`:''}${excludedCount?` · 관련없는 매물 ${excludedCount}개 제외`:''}${fresh?` · ${fresh} 기준`:''}`;
    }

    scheduleDeepRefresh();
  }catch(e){
    if(seq!==requestSeq)return;

    const keepExisting=previousListings.length>0;
    if(keepExisting)liveListings=previousListings;
    else if(!background)liveListings=[];

    const detail=e?.name==='AbortError'?'응답 시간이 길어 요청을 종료했습니다.':(e.message||'알 수 없는 오류');
    liveState={
      ...liveState,
      loading:false,
      error:`${detail} · 공개 페이지 차단은 우회하지 않습니다.`,
      collecting:false
    };

    if(sourceText){
      sourceText.textContent=keepExisting
        ?`새로고침에 실패해 기존 매물 ${liveListings.length}개를 유지합니다.`
        :background
          ?'추가 수집 확인 중 오류가 발생했지만 기존 매물은 유지합니다.'
          :'실제 매물을 불러오지 못했습니다.';
    }
  }finally{
    clearTimeout(timer);
    if(refreshBtn){refreshBtn.disabled=false;refreshBtn.textContent='매물 새로고침'}
  }

  renderMarket();
}

async function search(){
  const q=$('#searchInput').value;
  const p=findPhone(q);

  if(!p){
    const box=$('#suggestions');
    box.hidden=false;
    box.innerHTML='<div class="suggestion-empty">등록된 제품을 찾지 못했습니다. 모델명을 조금 더 정확히 입력해 주세요.</div>';
    return;
  }

  current=p;
  listingPage=1;
  filters.storage=parseStorage(q,p);
  autoRefreshRounds=0;
  clearTimeout(autoRefreshTimer);
  renderProduct();
  await loadLiveListings();
  window.scrollTo({top:$('#market').offsetTop-70,behavior:'smooth'});
}

function suggestions(){
  const q=norm($('#searchInput').value),box=$('#suggestions');
  if(!q){box.hidden=true;return}

  const arr=P
    .map(p=>{
      let best=0;
      for(const a of searchableAliases(p)){
        if(a===q)best=Math.max(best,10000);
        else if(a.startsWith(q))best=Math.max(best,6000-q.length+a.length);
        else if(a.includes(q))best=Math.max(best,4000-q.length+a.length);
        else if(q.includes(a))best=Math.max(best,3000+a.length);
      }
      return {p,score:best};
    })
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,10)
    .map(x=>x.p);

  box.innerHTML=arr.map(p=>`<button data-id="${htmlEscape(p.id)}"><b>${htmlEscape(p.name)}</b><span>${htmlEscape(p.brand||p.series||'')}</span></button>`).join('');
  box.hidden=!arr.length;

  box.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    const p=P.find(x=>x.id===b.dataset.id);
    if(!p)return;
    $('#searchInput').value=p.name;
    box.hidden=true;
    search();
  });
}

function renderBrandFilters(){
  const box=$('#brandFilters');
  if(!box)return;

  const brands=[...new Set(P.map(p=>String(p.brand||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
  const preferred=['Apple','Samsung','Xiaomi','POCO','Motorola','Google'];
  const ordered=[...preferred.filter(x=>brands.includes(x)),...brands.filter(x=>!preferred.includes(x))];

  box.innerHTML=`<button class="chip ${brandFilter==='all'?'active':''}" data-brand="all">전체</button>`+
    ordered.map(b=>`<button class="chip ${brandFilter===b?'active':''}" data-brand="${htmlEscape(b)}">${htmlEscape(b)}</button>`).join('');

  box.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{
    brandFilter=btn.dataset.brand;
    renderBrandFilters();
    renderModels();
  });
}

function renderModels(){
  const g=$('#modelGrid');
  if(!g)return;

  const shown=brandFilter==='all'?P:P.filter(p=>p.brand===brandFilter);
  $('#modelCount').textContent=shown.length;

  g.innerHTML=shown.map(p=>{
    const candidates=productImageCandidates(p);
    const image=candidates.length
      ?`<img src="${htmlEscape(candidates[0])}" data-model-id="${htmlEscape(p.id)}" data-image-index="0" alt="${htmlEscape(p.name)}" loading="lazy">`
      :'<div class="model-image-placeholder">이미지 준비중</div>';

    return `<article class="model-card" data-id="${htmlEscape(p.id)}">${image}<b>${htmlEscape(p.name)}</b><span>${htmlEscape(p.chipset||p.brand||'정보 확인 중')}</span></article>`;
  }).join('');

  g.querySelectorAll('img[data-model-id]').forEach(img=>{
    img.addEventListener('error',()=>{
      const p=P.find(x=>x.id===img.dataset.modelId);
      const candidates=productImageCandidates(p);
      const next=Number(img.dataset.imageIndex||0)+1;

      if(next<candidates.length){
        img.dataset.imageIndex=String(next);
        img.src=candidates[next];
        return;
      }

      const fallback=document.createElement('div');
      fallback.className='model-image-placeholder';
      fallback.textContent='이미지 준비중';
      img.replaceWith(fallback);
    });
  });

  g.querySelectorAll('.model-card').forEach(c=>c.onclick=async()=>{
    current=P.find(p=>p.id===c.dataset.id);
    if(!current)return;
    listingPage=1;
    filters.storage='all';
    autoRefreshRounds=0;
    $('#searchInput').value=current.name;
    renderProduct();
    await loadLiveListings();
    window.scrollTo({top:$('#market').offsetTop-70,behavior:'smooth'});
  });
}

$('#searchBtn').onclick=search;
$('#searchInput').addEventListener('input',suggestions);
$('#searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')search()});

$$('[data-quick]').forEach(b=>b.onclick=()=>{
  $('#searchInput').value=b.dataset.quick;
  search();
});

$$('#platformFilters .chip').forEach(b=>b.onclick=()=>{
  listingPage=1;
  filters.platform=b.dataset.platform;
  $$('#platformFilters .chip').forEach(x=>x.classList.toggle('active',x===b));
  renderMarket();
});

$('#priceApply').onclick=()=>{
  listingPage=1;
  filters.min=$('#minInput').value?Number($('#minInput').value):null;
  filters.max=$('#maxInput').value?Number($('#maxInput').value):null;
  renderMarket();
};

$('#refreshListingsBtn').onclick=()=>{
  autoRefreshRounds=0;
  clearTimeout(autoRefreshTimer);
  loadLiveListings(true);
};

$('#sortSelect').onchange=e=>{
  listingPage=1;
  filters.sort=e.target.value;
  renderMarket();
};

$('#resetBtn').onclick=async()=>{
  const storageChanged=filters.storage!=='all';
  listingPage=1;
  filters={platform:'all',storage:'all',min:null,max:null,sort:'cheap'};
  $('#minInput').value='';
  $('#maxInput').value='';
  $('#sortSelect').value='cheap';
  $$('#platformFilters .chip').forEach((b,i)=>b.classList.toggle('active',i===0));
  renderStorage();
  if(storageChanged)await loadLiveListings();
  else renderMarket();
};

$('#compareSelect').onchange=renderCompare;

renderBrandFilters();
renderModels();
renderProduct();
loadLiveListings();
hydrateCatalog();

// 첫 공식 카탈로그 스캔이 뒤에서 끝났을 가능성이 있을 때 한 번만 다시 병합.
setTimeout(()=>hydrateCatalog(),60000);

})();
