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

  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, options);
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  }

  function extractStorage(text) {
    const m = String(text).match(/(?:^|\s)(64|128|256|512|1024)\s*(?:gb|기가)?(?:\s|$)/i);
    return m ? Number(m[1]) : null;
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
    $("#specStorage").textContent = (currentPhone.storage ?? []).map((x) => `${x}GB`).join(" · ") || "-";

    const s = currentPhone.scores ?? {};
    $("#performanceScore").textContent = s.performance ?? "-";
    $("#dailyScore").textContent = s.daily ?? "-";
    $("#gamingScore").textContent = s.gaming ?? "-";
    $("#cameraScore").textContent = s.camera ?? "-";
    $("#dailyMeter").style.width = `${s.daily ?? 0}%`;
    $("#gamingMeter").style.width = `${s.gaming ?? 0}%`;
    $("#cameraMeter").style.width = `${s.camera ?? 0}%`;

    renderColors();
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

  function renderColors() {
    const box = $("#colorButtons");
    const colors = currentPhone?.colors ?? [];
    box.innerHTML = "";

    if (!colors.length) {
      $("#colorName").textContent = currentPhone?.heroImage ? "대표 이미지" : "색상 정보 없음";
      showImage(currentPhone?.heroImage ?? null, currentPhone?.name ?? "");
      return;
    }

    colors.forEach((color, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `color-dynamic${i === 0 ? " active" : ""}`;
      b.title = color.name;
      b.style.background = color.hex || "#ddd";
      b.addEventListener("click", () => {
        $$("#colorButtons .color-dynamic").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        $("#colorName").textContent = color.name;
        showImage(color.image || currentPhone?.heroImage || null, `${currentPhone.name} ${color.name}`);
      });
      box.appendChild(b);
    });

    $("#colorName").textContent = colors[0].name;
    showImage(colors[0].image || currentPhone?.heroImage || null, `${currentPhone.name} ${colors[0].name}`);
  }

  function showImage(url, alt) {
    const img = $("#phoneImage");
    const none = $("#noImage");
    if (url) {
      img.src = url;
      img.alt = alt;
      img.hidden = false;
      none.hidden = true;
    } else {
      img.removeAttribute("src");
      img.hidden = true;
      none.hidden = false;
    }
  }

  function renderStorageFilters() {
    const box = $("#storageFilters");
    box.innerHTML = `<button class="chip ${filters.storage === "all" ? "active" : ""}" data-storage="all">전체</button>` +
      (currentPhone.storage ?? []).map((x) => `<button class="chip ${String(filters.storage) === String(x) ? "active" : ""}" data-storage="${x}">${x}GB</button>`).join("");

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
      ? `${selected ?? "-"}GB 기준 · 용량 선택 시 변경`
      : `${selected}GB 기준`;
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
    $("#chartLabel").textContent = filters.storage === "all" ? "전체 용량" : `${filters.storage}GB`;
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
          <span class="listing-storage">${item.storage}GB</span>
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
