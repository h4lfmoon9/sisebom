(() => {
  "use strict";

  const ONLINE_API = "https://sisebom.onrender.com";
  const LOCAL_API = "http://localhost:3000";
  const API_BASE = ["localhost", "127.0.0.1"].includes(location.hostname)
    ? LOCAL_API
    : ONLINE_API;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const won = (n) => n == null ? "정보 없음" : `${Math.round(Number(n)).toLocaleString("ko-KR")}원`;

  let phoneList = [];
  let currentPhone = null;
  let filters = { platform: "all", storage: "all", min: null, max: null, sort: "cheap" };


  const LOCAL_MODEL_IMAGES = {
  "iphone-original": "images/apple/provided/iphone-original.png",
  "iphone-3g": "images/apple/provided/iphone-3g.png",
  "iphone-3gs": "images/apple/provided/iphone-3gs.png",
  "iphone-4": "images/apple/provided/iphone-4.png",
  "iphone-4s": "images/apple/provided/iphone-4s.png",
  "iphone-5": "images/apple/provided/iphone-5.png",
  "iphone-5c": "images/apple/provided/iphone-5c.png",
  "iphone-5s": "images/apple/provided/iphone-5s.png",
  "iphone-6": "images/apple/provided/iphone-6.png",
  "iphone-6-plus": "images/apple/provided/iphone-6-plus.png",
  "iphone-6s": "images/apple/provided/iphone-6s.png",
  "iphone-6s-plus": "images/apple/provided/iphone-6s-plus.png",
  "iphone-se-1": "images/apple/provided/iphone-se-1.png",
  "iphone-7": "images/apple/provided/iphone-7.png",
  "iphone-7-plus": "images/apple/provided/iphone-7-plus.png",
  "iphone-8": "images/apple/provided/iphone-8.png",
  "iphone-8-plus": "images/apple/provided/iphone-8-plus.png",
  "iphone-x": "images/apple/provided/iphone-x.png",
  "iphone-xr": "images/apple/provided/iphone-xr.png",
  "iphone-xs": "images/apple/provided/iphone-xs.png",
  "iphone-xs-max": "images/apple/provided/iphone-xs-max.png",
  "iphone-11": "images/apple/provided/iphone-11.png",
  "iphone-11-pro": "images/apple/provided/iphone-11-pro.png",
  "iphone-11-pro-max": "images/apple/provided/iphone-11-pro-max.png",
  "iphone-se-2": "images/apple/provided/iphone-se-2.png",
  "iphone-12-mini": "images/apple/provided/iphone-12-mini.png",
  "iphone-12": "images/apple/provided/iphone-12.png",
  "iphone-12-pro": "images/apple/provided/iphone-12-pro.png",
  "iphone-12-pro-max": "images/apple/provided/iphone-12-pro-max.png",
  "iphone-13-mini": "images/apple/provided/iphone-13-mini.png",
  "iphone-13": "images/apple/provided/iphone-13.png",
  "iphone-13-pro": "images/apple/provided/iphone-13-pro.png",
  "iphone-13-pro-max": "images/apple/provided/iphone-13-pro-max.png",
  "iphone-se-3": "images/apple/provided/iphone-se-3.png",
  "iphone-14": "images/apple/provided/iphone-14.png",
  "iphone-14-plus": "images/apple/provided/iphone-14-plus.png",
  "iphone-14-pro": "images/apple/provided/iphone-14-pro.png",
  "iphone-14-pro-max": "images/apple/provided/iphone-14-pro-max.png",
  "iphone15": "images/apple/provided/iphone15.png",
  "iphone-15-plus": "images/apple/provided/iphone-15-plus.png",
  "iphone-15-pro": "images/apple/provided/iphone-15-pro.png",
  "iphone-15-pro-max": "images/apple/provided/iphone-15-pro-max.png",
  "iphone-16": "images/apple/provided/iphone-16.png",
  "iphone-16-plus": "images/apple/provided/iphone-16-plus.png",
  "iphone-16-pro": "images/apple/provided/iphone-16-pro.png",
  "iphone-16-pro-max": "images/apple/provided/iphone-16-pro-max.png",
  "iphone-16e": "images/apple/provided/iphone-16e.png",
  "iphone-17": "images/apple/provided/iphone-17.png",
  "iphone-air": "images/apple/provided/iphone-air.png",
  "iphone-17-pro": "images/apple/provided/iphone-17-pro.png",
  "iphone-17-pro-max": "images/apple/provided/iphone-17-pro-max.png",
  "iphone-17e": "images/apple/provided/iphone-17e.png",
  "iphone-18-pro": "images/apple/provided/iphone-18-pro.png",
  "iphone-18-pro-max": "images/apple/provided/iphone-18-pro-max.png"
};

  function localModelImage(phone) {
    return phone?.id ? LOCAL_MODEL_IMAGES[phone.id] || null : null;
  }

  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, options);
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  }

  function formatStorage(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    return n >= 1024 ? `${n / 1024}TB` : `${n}GB`;
  }

  function extractStorage(text) {
    const raw = String(text || "");
    const tb = raw.match(/(?:^|\s)(1|2)\s*tb(?:\s|$)/i);
    if (tb) return Number(tb[1]) * 1024;
    const gb = raw.match(/(?:^|\s)(4|8|16|32|64|128|256|512|1024|2048)\s*(?:gb|기가)?(?:\s|$)/i);
    return gb ? Number(gb[1]) : null;
  }

  function resetFilters() {
    filters = { platform: "all", storage: "all", min: null, max: null, sort: "cheap" };
    if ($("#minInput")) $("#minInput").value = "";
    if ($("#maxInput")) $("#maxInput").value = "";
    if ($("#sortSelect")) $("#sortSelect").value = "cheap";
    $$("#platformFilters .chip").forEach((b) => b.classList.toggle("active", b.dataset.platform === "all"));
  }

  function renderProduct() {
    if (!currentPhone) return;
    $("#productNameBadge").textContent = currentPhone.name;
    $("#specBrand").textContent = currentPhone.brand ?? "-";
    $("#specChipset").textContent = currentPhone.specs?.chipset ?? "-";
    $("#specDisplay").textContent = currentPhone.specs?.display ?? "-";
    $("#specCamera").textContent = currentPhone.specs?.camera ?? "-";
    $("#specCharging").textContent = currentPhone.specs?.charging ?? "-";
    $("#specFrame").textContent = currentPhone.specs?.frame ?? "-";
    $("#specStorage").textContent = (currentPhone.storage ?? []).map(formatStorage).join(" · ") || "-";

    const s = currentPhone.scores ?? {};
    $("#performanceScore").textContent = s.performance ?? "-";
    $("#dailyScore").textContent = s.daily ?? "-";
    $("#gamingScore").textContent = s.gaming ?? "-";
    $("#cameraScore").textContent = s.camera ?? "-";
    $("#dailyMeter").style.width = `${s.daily ?? 0}%`;
    $("#gamingMeter").style.width = `${s.gaming ?? 0}%`;
    $("#cameraMeter").style.width = `${s.camera ?? 0}%`;

    renderProductImage();
    renderStorageFilters();
    renderLaunchPrice();
    document.title = `시세봄 - ${currentPhone.name}`;
  }

  function renderOfficialSource() {
    const link = $("#officialSourceLink");
    if (!link) return;

    if (currentPhone?.officialSource) {
      link.href = currentPhone.officialSource;
      link.hidden = false;
    } else {
      link.removeAttribute("href");
      link.hidden = true;
    }
  }

  function renderProductImage() {
    const image = currentPhone?.image || localModelImage(currentPhone) || currentPhone?.colors?.[0]?.image || null;
    showImage(image, currentPhone?.name || "");
  }

  function showImage(url, alt) {
    const img = $("#phoneImage");
    const none = $("#noImage");

    if (url) {
      const resolvedUrl = new URL(url, document.baseURI).href;
      img.src = resolvedUrl;
      img.alt = alt;
      img.hidden = false;
      none.hidden = true;

      img.onerror = () => {
        img.hidden = true;
        none.hidden = false;
        none.textContent = "이미지 로딩 실패";
      };
    } else {
      img.removeAttribute("src");
      img.alt = "";
      img.hidden = true;
      none.hidden = false;
      none.textContent = "예시 이미지 없음";
    }
  }

  function renderStorageFilters() {
    const box = $("#storageFilters");
    box.innerHTML = `<button class="chip ${filters.storage === "all" ? "active" : ""}" data-storage="all">전체</button>` +
      (currentPhone.storage ?? []).map((x) => `<button class="chip ${String(filters.storage) === String(x) ? "active" : ""}" data-storage="${x}">${formatStorage(x)}</button>`).join("");

    $$("#storageFilters .chip").forEach((b) => {
      b.addEventListener("click", async () => {
        filters.storage = b.dataset.storage;
        $$("#storageFilters .chip").forEach((x) => x.classList.toggle("active", x === b));
        renderLaunchPrice();
        await refreshMarketAndListings();
      });
    });
  }

  function renderLaunchPrice() {
    if (!currentPhone) return;
    const selected = filters.storage === "all" ? currentPhone.storage?.[0] : Number(filters.storage);
    const price = currentPhone.launchPrices?.[String(selected)] ?? currentPhone.launchPrices?.[selected];
    $("#launchPrice").textContent = won(price);
    $("#launchPriceBasis").textContent = filters.storage === "all"
      ? `${formatStorage(selected)} 기준 · 용량 선택 시 변경`
      : `${formatStorage(selected)} 기준`;
  }

  function queryString() {
    const p = new URLSearchParams();
    if (filters.platform !== "all") p.set("platform", filters.platform);
    if (filters.storage !== "all") p.set("storage", filters.storage);
    if (filters.min != null) p.set("min", filters.min);
    if (filters.max != null) p.set("max", filters.max);
    p.set("sort", filters.sort);
    return `?${p.toString()}`;
  }

  function renderMarket(data) {
    const m = data.market ?? {};
    const j = data.judgement ?? {};
    $("#visibleCount").textContent = m.count ?? 0;
    $("#minPrice").textContent = won(m.min);
    $("#avgPrice").textContent = won(m.average);
    $("#maxPrice").textContent = won(m.max);

    const score = Number(m.buyScore ?? 0);
    $("#buyScore").textContent = score;
    $("#scoreCircle").className = `score-circle ${score >= 70 ? "green" : score >= 40 ? "yellow" : "red"}`;
    $("#aiHeadline").textContent = j.title ?? "분석 결과 없음";
    $("#aiText").textContent = j.text ?? "조건을 바꿔보세요.";
    $("#chartLabel").textContent = filters.storage === "all" ? "전체 용량" : formatStorage(filters.storage);
  }

  function renderBars(items) {
    const prices = (items ?? []).map((x) => Number(x.price)).filter(Number.isFinite).sort((a,b) => a-b);
    if (!prices.length) { $("#bars").innerHTML = ""; return; }
    const min = Math.min(...prices), max = Math.max(...prices);
    $("#bars").innerHTML = prices.map((p) => {
      const ratio = (p-min)/(max-min || 1);
      return `<div class="bar-wrap"><div class="bar" style="height:${45+ratio*165}px"></div><div class="bar-label">${Math.round(p/10000)}만</div></div>`;
    }).join("");
  }

  const cardColor = (i) => ["pink","blue","black","greenish","yellowish"][i%5];

  function renderListings(items) {
    const grid = $("#listingGrid");
    $("#visibleCount").textContent = items.length;
    if (!items.length) {
      grid.innerHTML = `<div class="empty-listings">조건에 맞는 매물이 없습니다.</div>`;
      return;
    }
    const avg = items.reduce((s,x) => s+Number(x.price),0)/items.length;
    grid.innerHTML = items.map((item,i) => {
      const diff = ((Number(item.price)-avg)/avg)*100;
      let cls="normal", txt="적정 시세";
      if (diff <= -7) { cls="good"; txt=`🔥 평균보다 ${Math.abs(diff).toFixed(0)}% 저렴`; }
      else if (diff >= 10) { cls="bad"; txt=`평균보다 ${diff.toFixed(0)}% 비쌈`; }
      return `<article class="listing">
        <div class="listing-photo ${cardColor(i)}">
          <div class="mini-phone"></div><span class="platform-badge">${item.platform}</span>
          ${item.platform === "당근" && item.buyNow ? '<span class="buy-now">바로구매</span>' : ''}
        </div>
        <div class="listing-body">
          <span class="listing-storage">${formatStorage(item.storage)}</span>
          <h3 class="listing-title">${item.title}</h3>
          <b class="listing-price">${won(item.price)}</b>
          <div class="deal ${cls}">${txt}</div>
          <div class="listing-meta"><span>${item.region ?? "-"}</span><span>${item.minutes ?? "-"}분 전</span></div>
          <a class="listing-link" href="${item.url}" target="_blank" rel="noopener noreferrer">원본 매물 보기 →</a>
        </div>
      </article>`;
    }).join("");
  }

  async function refreshMarketAndListings() {
    if (!currentPhone) return;
    try {
      const q = queryString();
      const [market, listings] = await Promise.all([
        api(`/api/market/${encodeURIComponent(currentPhone.id)}${q}`),
        api(`/api/listings/${encodeURIComponent(currentPhone.id)}${q}`)
      ]);
      renderMarket(market);
      renderListings(listings.listings ?? []);
      renderBars(listings.listings ?? []);
    } catch (e) {
      console.error(e);
      $("#listingGrid").innerHTML = `<div class="empty-listings">서버에서 데이터를 불러오지 못했습니다.</div>`;
    }
  }

  async function searchPhone() {
    const q = $("#searchInput").value.trim();
    if (!q) return;
    $("#searchBtn").disabled = true;
    $("#searchMessage").textContent = "제품 정보를 불러오는 중...";
    try {
      currentPhone = await api(`/api/search?q=${encodeURIComponent(q)}`);
      resetFilters();
      const s = extractStorage(q);
      if (s && (currentPhone.storage ?? []).includes(s)) filters.storage = String(s);
      renderProduct();
      await refreshMarketAndListings();
      $("#searchMessage").textContent = `${currentPhone.name}을(를) 서버에서 불러왔습니다.`;
      $("#overview").scrollIntoView({behavior:"smooth"});
    } catch (e) {
      $("#searchMessage").textContent = e.message;
    } finally {
      $("#searchBtn").disabled = false;
    }
  }

  async function loadPhoneList() {
    phoneList = await api("/api/phones");
    const options = phoneList.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
    $("#compareA").innerHTML = options;
    $("#compareB").innerHTML = options;
    if (phoneList.length > 1) $("#compareB").selectedIndex = 1;
  }

  function firstPrice(phone) {
    const s = phone.storage?.[0];
    return s == null ? null : (phone.launchPrices?.[String(s)] ?? phone.launchPrices?.[s]);
  }

  async function comparePhones() {
    const a = $("#compareA").value, b = $("#compareB").value;
    if (!a || !b) return;
    try {
      const data = await api(`/api/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
      const A=data.phoneA, B=data.phoneB;
      $("#compareNameA").textContent=A.name; $("#compareNameB").textContent=B.name;
      $("#comparePerformanceA").textContent=A.scores?.performance ?? "-";
      $("#comparePerformanceB").textContent=B.scores?.performance ?? "-";
      $("#compareCameraA").textContent=A.scores?.camera ?? "-";
      $("#compareCameraB").textContent=B.scores?.camera ?? "-";
      $("#comparePriceA").textContent=won(firstPrice(A)); $("#comparePriceB").textContent=won(firstPrice(B));
      const pa=Number(A.scores?.performance ?? 0), pb=Number(B.scores?.performance ?? 0);
      $("#compareText").textContent = pa===pb
        ? "현재 등록된 성능점수는 비슷합니다. 다른 기준도 함께 비교하세요."
        : `현재 등록된 성능점수 기준으로는 ${pa>pb?A.name:B.name}이(가) 더 높습니다.`;
    } catch(e) { $("#compareText").textContent = `비교 실패: ${e.message}`; }
  }

  function setupEvents() {
    $("#searchBtn").addEventListener("click", searchPhone);
    $("#searchInput").addEventListener("keydown", (e) => { if (e.key === "Enter") searchPhone(); });
    $$("#platformFilters .chip").forEach((b) => b.addEventListener("click", async () => {
      filters.platform=b.dataset.platform;
      $$("#platformFilters .chip").forEach((x) => x.classList.toggle("active", x===b));
      await refreshMarketAndListings();
    }));
    $("#priceApply").addEventListener("click", async () => {
      filters.min = $("#minInput").value ? Number($("#minInput").value) : null;
      filters.max = $("#maxInput").value ? Number($("#maxInput").value) : null;
      await refreshMarketAndListings();
    });
    $("#sortSelect").addEventListener("change", async (e) => { filters.sort=e.target.value; await refreshMarketAndListings(); });
    $("#resetBtn").addEventListener("click", async () => { resetFilters(); renderProduct(); await refreshMarketAndListings(); });
    $("#infoBtn").addEventListener("click", () => {
      const x=$("#infoBox"); x.style.display = x.style.display === "block" ? "none" : "block";
    });
    $("#compareBtn").addEventListener("click", comparePhones);
    $("#goCompareBtn").addEventListener("click", async () => {
      if (currentPhone && [...$("#compareA").options].some((o)=>o.value===currentPhone.id)) $("#compareA").value=currentPhone.id;
      await comparePhones(); $("#compare").scrollIntoView({behavior:"smooth"});
    });
  }

  async function init() {
    console.log("🌱 시세봄 시작", API_BASE);
    setupEvents();
    try { await loadPhoneList(); await comparePhones(); await searchPhone(); }
    catch(e) { console.error(e); $("#searchMessage").textContent=`서버 연결 실패: ${e.message}`; }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
