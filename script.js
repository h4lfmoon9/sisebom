const listings = [
  {platform:"당근", storage:128, price:430000, minutes:64, title:"아이폰 15 128GB 블랙 사용감 있음", color:"black", buyNow:false, region:"서울", url:"https://example.com/daangn-1"},
  {platform:"번개장터", storage:128, price:475000, minutes:7, title:"아이폰15 128GB 핑크 풀박스", color:"pink", buyNow:false, region:"전국", url:"https://example.com/bunjang-1"},
  {platform:"중고나라", storage:128, price:490000, minutes:21, title:"아이폰 15 128기가 블루 상태좋음", color:"blue", buyNow:false, region:"전국", url:"https://example.com/joongna-1"},
  {platform:"당근", storage:128, price:515000, minutes:13, title:"아이폰15 128GB 그린 자급제", color:"greenish", buyNow:true, region:"경기", url:"https://example.com/daangn-2"},
  {platform:"번개장터", storage:256, price:535000, minutes:5, title:"아이폰15 256GB 블랙 배터리 양호", color:"black", buyNow:false, region:"전국", url:"https://example.com/bunjang-2"},
  {platform:"중고나라", storage:256, price:550000, minutes:29, title:"아이폰 15 256기가 핑크 A급", color:"pink", buyNow:false, region:"전국", url:"https://example.com/joongna-2"},
  {platform:"당근", storage:256, price:565000, minutes:9, title:"아이폰 15 256GB 블루 풀박스", color:"blue", buyNow:true, region:"부산", url:"https://example.com/daangn-3"},
  {platform:"번개장터", storage:256, price:590000, minutes:41, title:"아이폰15 256GB 옐로 상태 최상", color:"yellowish", buyNow:false, region:"전국", url:"https://example.com/bunjang-3"},
  {platform:"중고나라", storage:512, price:610000, minutes:18, title:"아이폰15 512GB 블랙 판매", color:"black", buyNow:false, region:"전국", url:"https://example.com/joongna-3"},
  {platform:"당근", storage:512, price:635000, minutes:11, title:"아이폰15 512GB 그린", color:"greenish", buyNow:true, region:"대구", url:"https://example.com/daangn-4"},
  {platform:"번개장터", storage:512, price:665000, minutes:33, title:"아이폰 15 512기가 블루 풀박스", color:"blue", buyNow:false, region:"전국", url:"https://example.com/bunjang-4"},
  {platform:"중고나라", storage:512, price:720000, minutes:52, title:"아이폰15 512GB 미개봉급", color:"pink", buyNow:false, region:"전국", url:"https://example.com/joongna-4"}
];

const launchPrices = {
  128: 1250000,
  256: 1400000,
  512: 1700000
};

let filters = {
  platform:"all",
  storage:"all",
  min:null,
  max:null,
  sort:"cheap"
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const won = n => Math.round(n).toLocaleString("ko-KR") + "원";

function filteredListings(){
  let arr = listings.filter(x => {
    if(filters.platform !== "all" && x.platform !== filters.platform) return false;
    if(filters.storage !== "all" && x.storage !== Number(filters.storage)) return false;
    if(filters.min !== null && x.price < filters.min) return false;
    if(filters.max !== null && x.price > filters.max) return false;
    return true;
  });

  arr.sort((a,b)=>{
    if(filters.sort === "cheap") return a.price-b.price;
    if(filters.sort === "high") return b.price-a.price;
    return a.minutes-b.minutes;
  });

  return arr;
}

function median(arr){
  const s=[...arr].sort((a,b)=>a-b);
  const m=Math.floor(s.length/2);
  return s.length%2?s[m]:(s[m-1]+s[m])/2;
}

function buyScoreFor(arr){
  if(!arr.length) return 0;
  const prices=arr.map(x=>x.price);
  const avg=prices.reduce((a,b)=>a+b,0)/prices.length;
  const med=median(prices);
  const cheap=prices.filter(p=>p<=med*.95).length;
  const spread=(Math.max(...prices)-Math.min(...prices))/avg;

  let score=72 + Math.min(16, cheap*3) - Math.min(22, spread*18);
  return Math.max(0,Math.min(100,Math.round(score)));
}

function scoreClass(score){
  if(score>=70) return "green";
  if(score>=40) return "yellow";
  return "red";
}

function scoreText(score){
  if(score>=70) return ["구매하기 좋은 편","현재는 구매하기 좋은 편이에요."];
  if(score>=40) return ["조금 더 비교 추천","조건을 조금 더 비교해보는 게 좋아요."];
  return ["구매 비추천","현재 가격대에서는 구매를 서두르지 않는 편이 좋아요."];
}

function renderSummary(arr){
  $("#visibleCount").textContent=arr.length;

  if(!arr.length){
    $("#minPrice").textContent="-";
    $("#avgPrice").textContent="-";
    $("#maxPrice").textContent="-";
    $("#buyScore").textContent="0";
    $("#aiHeadline").textContent="조건에 맞는 매물이 없어요.";
    $("#aiText").textContent="가격 또는 용량 필터를 조정해보세요.";
    $("#bars").innerHTML="";
    $("#scoreCircle").className="score-circle red";
    return;
  }

  const prices=arr.map(x=>x.price);
  const min=Math.min(...prices);
  const max=Math.max(...prices);
  const avg=prices.reduce((a,b)=>a+b,0)/prices.length;
  $("#minPrice").textContent=won(min);
  $("#avgPrice").textContent=won(avg);
  $("#maxPrice").textContent=won(max);

  const score=buyScoreFor(arr);
  const cls=scoreClass(score);
  const [shortText,longText]=scoreText(score);

  $("#buyScore").textContent=score;
  $("#scoreCircle").className="score-circle "+cls;
  $("#aiHeadline").textContent=longText;

  const storageText = filters.storage==="all" ? "전체 용량" : `${filters.storage}GB`;
  $("#chartLabel").textContent=storageText;
  $("#aiText").textContent = `${storageText} 기준 평균가는 ${won(avg)}이며, 현재 조건에서 가장 저렴한 매물은 ${won(min)}입니다.`;

  renderBars(prices);
}

function renderBars(prices){
  const sorted=[...prices].sort((a,b)=>a-b);
  const min=Math.min(...sorted), max=Math.max(...sorted);
  $("#bars").innerHTML=sorted.map(p=>{
    const ratio=(p-min)/(max-min||1);
    const h=45+ratio*165;
    return `<div class="bar-wrap"><div class="bar" style="height:${h}px"></div><div class="bar-label">${Math.round(p/10000)}만</div></div>`;
  }).join("");
}

function renderLaunchPrice(){
  const selected = filters.storage === "all" ? 128 : Number(filters.storage);
  const price = launchPrices[selected] ?? launchPrices[128];
  const priceEl = $("#launchPrice");
  const basisEl = $("#launchPriceBasis");

  if(priceEl) priceEl.textContent = won(price);
  if(basisEl) basisEl.textContent =
    filters.storage === "all" ? "128GB 기준 · 용량 선택 시 변경" : `${selected}GB 기준`;
}

function renderListings(){
  renderLaunchPrice();
  const arr=filteredListings();
  renderSummary(arr);

  $("#listingGrid").innerHTML = arr.length ? arr.map(item=>{
    const refArr = arr.length ? arr : listings;
    const avg = refArr.reduce((s,x)=>s+x.price,0)/refArr.length;
    const diff=(item.price-avg)/avg*100;

    let cls="normal", label="적정 시세";
    if(diff<=-7){ cls="good"; label=`🔥 평균보다 ${Math.abs(diff).toFixed(0)}% 저렴`; }
    else if(diff>=10){ cls="bad"; label=`평균보다 ${diff.toFixed(0)}% 비쌈`; }

    return `
      <article class="listing">
        <div class="listing-photo ${item.color}">
          <div class="mini-phone"></div>
          <span class="platform-badge">${item.platform}</span>
          ${item.platform==="당근" && item.buyNow ? '<span class="buy-now">바로구매</span>' : ''}
        </div>
        <div class="listing-body">
          <span class="listing-storage">${item.storage}GB</span>
          <h3 class="listing-title">${item.title}</h3>
          <b class="listing-price">${won(item.price)}</b>
          <div class="deal ${cls}">${label}</div>
          <div class="listing-meta">
            <span>${item.region}</span>
            <span>${item.minutes}분 전</span>
          </div>
          <a class="listing-link" href="${item.url}" target="_blank" rel="noopener noreferrer">원본 매물 보기 →</a>
        </div>
      </article>
    `;
  }).join("") : `<div style="grid-column:1/-1;padding:40px;text-align:center;color:#758078;background:#fff;border:1px dashed #e2e9e4;border-radius:18px">조건에 맞는 매물이 없습니다.</div>`;
}

function bindChipGroup(selector, key, dataKey){
  $$(selector+" .chip").forEach(btn=>{
    btn.addEventListener("click",()=>{
      $$(selector+" .chip").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      filters[key]=btn.dataset[dataKey];
      renderListings();
    });
  });
}

bindChipGroup("#platformFilters","platform","platform");
bindChipGroup("#storageFilters","storage","storage");

$("#priceApply").addEventListener("click",()=>{
  const min=Number($("#minInput").value);
  const max=Number($("#maxInput").value);
  filters.min = $("#minInput").value ? min : null;
  filters.max = $("#maxInput").value ? max : null;
  renderListings();
});

$("#sortSelect").addEventListener("change",e=>{
  filters.sort=e.target.value;
  renderListings();
});

$("#resetBtn").addEventListener("click",()=>{
  filters={platform:"all",storage:"all",min:null,max:null,sort:"cheap"};
  $("#minInput").value="";
  $("#maxInput").value="";
  $("#sortSelect").value="cheap";
  $$("#platformFilters .chip").forEach((x,i)=>x.classList.toggle("active",i===0));
  $$("#storageFilters .chip").forEach((x,i)=>x.classList.toggle("active",i===0));
  renderListings();
});

$$(".color").forEach(btn=>{
  btn.addEventListener("click",()=>{
    $$(".color").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    $("#phoneMock").className="phone "+btn.dataset.color;
    $("#colorName").textContent=btn.dataset.name;
  });
});

$("#infoBtn").addEventListener("click",()=>{
  const box=$("#infoBox");
  box.style.display=box.style.display==="block"?"none":"block";
});

$("#searchBtn").addEventListener("click",()=>{
  const q=$("#searchInput").value.trim();
  if(q.toLowerCase().includes("256")){
    filters.storage="256";
    $$("#storageFilters .chip").forEach(x=>x.classList.toggle("active",x.dataset.storage==="256"));
  }else if(q.toLowerCase().includes("512")){
    filters.storage="512";
    $$("#storageFilters .chip").forEach(x=>x.classList.toggle("active",x.dataset.storage==="512"));
  }else if(q.toLowerCase().includes("128")){
    filters.storage="128";
    $$("#storageFilters .chip").forEach(x=>x.classList.toggle("active",x.dataset.storage==="128"));
  }else{
    filters.storage="all";
    $$("#storageFilters .chip").forEach(x=>x.classList.toggle("active",x.dataset.storage==="all"));
  }
  renderListings();
  document.querySelector("#overview").scrollIntoView({behavior:"smooth"});
});

renderListings();
