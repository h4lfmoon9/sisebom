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
    "iphone-original": "images/apple/classic-batch1/iphone-original.png",
    "iphone-3g": "images/apple/classic-batch1/iphone-3g.png",
    "iphone-3gs": "images/apple/classic-batch1/iphone-3gs.png",
    "iphone-4": "images/apple/classic-batch1/iphone-4.png",
    "iphone-5": "images/apple/classic-batch1/iphone-5.png",
    "iphone-6": "images/apple/classic-batch1/iphone-6.png",
    "iphone-7": "images/apple/classic-batch1/iphone-7.png",
    "iphone-8": "images/apple/classic-batch1/iphone-8.png",
    "iphone-x": "images/apple/classic-batch1/iphone-x.png",
    "iphone-xr": "images/apple/classic-batch1/iphone-xr.png"
  };

  function localModelImage(phone) {
    return phone?.id ? LOCAL_MODEL_IMAGES[phone.id] || null : null;
  }


  const LOCAL_COLOR_SETS = {
  "iphone-original": {
    "base": "images/apple/classic-batch1/iphone-original.png",
    "colors": [
      {
        "name": "실버",
        "hex": "#c8c8c8"
      }
    ]
  },
  "iphone-3g": {
    "base": "images/apple/classic-batch1/iphone-3g.png",
    "colors": [
      {
        "name": "블랙",
        "hex": "#171717"
      },
      {
        "name": "화이트",
        "hex": "#eeeeee"
      }
    ]
  },
  "iphone-3gs": {
    "base": "images/apple/classic-batch1/iphone-3gs.png",
    "colors": [
      {
        "name": "블랙",
        "hex": "#171717"
      },
      {
        "name": "화이트",
        "hex": "#eeeeee"
      }
    ]
  },
  "iphone-4": {
    "base": "images/apple/classic-batch1/iphone-4.png",
    "colors": [
      {
        "name": "블랙",
        "hex": "#171717"
      },
      {
        "name": "화이트",
        "hex": "#eeeeee"
      }
    ]
  },
  "iphone-5": {
    "base": "images/apple/classic-batch1/iphone-5.png",
    "colors": [
      {
        "name": "블랙 & 슬레이트",
        "hex": "#34383c"
      },
      {
        "name": "화이트 & 실버",
        "hex": "#e6e6e6"
      }
    ]
  },
  "iphone-6": {
    "base": "images/apple/classic-batch1/iphone-6.png",
    "colors": [
      {
        "name": "스페이스 그레이",
        "hex": "#767676"
      },
      {
        "name": "실버",
        "hex": "#c7c7c7"
      },
      {
        "name": "골드",
        "hex": "#d8c08d"
      }
    ]
  },
  "iphone-7": {
    "base": "images/apple/classic-batch1/iphone-7.png",
    "colors": [
      {
        "name": "블랙",
        "hex": "#262626"
      },
      {
        "name": "제트 블랙",
        "hex": "#070707"
      },
      {
        "name": "실버",
        "hex": "#d9d9d9"
      },
      {
        "name": "골드",
        "hex": "#dcc38f"
      },
      {
        "name": "로즈 골드",
        "hex": "#d7a8a4"
      },
      {
        "name": "레드",
        "hex": "#c62828"
      }
    ]
  },
  "iphone-8": {
    "base": "images/apple/classic-batch1/iphone-8.png",
    "colors": [
      {
        "name": "스페이스 그레이",
        "hex": "#5a5957"
      },
      {
        "name": "실버",
        "hex": "#d8d8d6"
      },
      {
        "name": "골드",
        "hex": "#d6bf98"
      },
      {
        "name": "레드",
        "hex": "#c62828"
      }
    ]
  },
  "iphone-x": {
    "base": "images/apple/classic-batch1/iphone-x.png",
    "colors": [
      {
        "name": "스페이스 그레이",
        "hex": "#646464"
      },
      {
        "name": "실버",
        "hex": "#d7d7d5"
      }
    ]
  },
  "iphone-xr": {
    "base": "images/apple/classic-batch1/iphone-xr.png",
    "colors": [
      {
        "name": "블랙",
        "hex": "#252525"
      },
      {
        "name": "화이트",
        "hex": "#ededeb"
      },
      {
        "name": "블루",
        "hex": "#5caaff"
      },
      {
        "name": "옐로",
        "hex": "#f0c94a"
      },
      {
        "name": "코랄",
        "hex": "#ff8476"
      },
      {
        "name": "레드",
        "hex": "#d83333"
      }
    ]
  }
};
  const LOCAL_COLOR_CACHE = new Map();

  function hexToRgb(hex) {
    const raw = String(hex || "#888888").replace("#", "");
    const v = raw.length === 3
      ? raw.split("").map((x) => x + x).join("")
      : raw.padEnd(6, "8").slice(0, 6);
    return {
      r: parseInt(v.slice(0, 2), 16),
      g: parseInt(v.slice(2, 4), 16),
      b: parseInt(v.slice(4, 6), 16)
    };
  }

  function saturationOf(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max === 0 ? 0 : (max - min) / max;
  }

  async function makeLocalColorImage(basePath, hex) {
    const key = `${basePath}|${hex}`;
    if (LOCAL_COLOR_CACHE.has(key)) return LOCAL_COLOR_CACHE.get(key);

    const target = hexToRgb(hex);
    const src = new URL(basePath, document.baseURI).href;

    const result = await new Promise((resolve) => {
      const source = new Image();
      source.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = source.naturalWidth;
          canvas.height = source.naturalHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(source, 0, 0);

          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = img.data;
          const xSolid = canvas.width * 0.38;
          const xEnd = canvas.width * 0.56;
          const targetAvg = (target.r + target.g + target.b) / 3;
          const lightColor = targetAvg > 195;
          const darkColor = targetAvg < 65;

          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < xEnd; x++) {
              const idx = (y * canvas.width + x) * 4;
              const a = d[idx + 3];
              if (a === 0) continue;

              const r = d[idx];
              const g = d[idx + 1];
              const b = d[idx + 2];
              const sat = saturationOf(r, g, b);
              const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

              // Keep saturated screen / wallpaper areas unchanged.
              if (sat > 0.28 && lum > 0.08) continue;

              const fade = x <= xSolid ? 1 : Math.max(0, Math.min(1, (xEnd - x) / (xEnd - xSolid)));
              const baseMix = lightColor ? 0.84 : darkColor ? 0.80 : 0.88;
              const mix = baseMix * fade;
              const minBrightness = lightColor ? 0.58 : darkColor ? 0.08 : 0.27;
              const brightness = minBrightness + (1 - minBrightness) * lum;

              d[idx] = Math.max(0, Math.min(255, (1 - mix) * r + mix * target.r * brightness));
              d[idx + 1] = Math.max(0, Math.min(255, (1 - mix) * g + mix * target.g * brightness));
              d[idx + 2] = Math.max(0, Math.min(255, (1 - mix) * b + mix * target.b * brightness));
            }
          }

          ctx.putImageData(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch (error) {
          console.warn("색상 이미지 생성 실패", error);
          resolve(src);
        }
      };
      source.onerror = () => resolve(src);
      source.src = src;
    });

    LOCAL_COLOR_CACHE.set(key, result);
    return result;
  }

  async function showLocalColorImage(set, color, alt) {
    const img = $("#phoneImage");
    const none = $("#noImage");
    if (!img || !none) return;

    none.hidden = false;
    none.textContent = "색상 이미지 준비 중...";
    img.hidden = true;

    try {
      const url = await makeLocalColorImage(set.base, color.hex);
      img.onload = () => {
        img.hidden = false;
        none.hidden = true;
      };
      img.onerror = () => {
        const fallback = new URL(set.base, document.baseURI).href;
        if (img.src !== fallback) {
          img.src = fallback;
        } else {
          img.hidden = true;
          none.hidden = false;
          none.textContent = "이미지 로딩 실패";
        }
      };
      img.alt = alt;
      img.src = url;
    } catch (error) {
      showImage(set.base, alt);
    }
  }


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
    const localSet = LOCAL_COLOR_SETS[currentPhone?.id];
    const serverColors = currentPhone?.colors ?? [];
    const fallback = localModelImage(currentPhone);

    box.innerHTML = "";

    // Classic batch: always use the local color set so Render cache/stale DB cannot break colors.
    if (localSet) {
      localSet.colors.forEach((color, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = `color-dynamic${i === 0 ? " active" : ""}`;
        b.title = color.name;
        b.style.background = color.hex;
        b.addEventListener("click", () => {
          $$("#colorButtons .color-dynamic").forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
          $("#colorName").textContent = color.name;
          showLocalColorImage(localSet, color, `${currentPhone.name} ${color.name}`);
        });
        box.appendChild(b);
      });

      const first = localSet.colors[0];
      $("#colorName").textContent = first.name;
      showLocalColorImage(localSet, first, `${currentPhone.name} ${first.name}`);
      return;
    }

    if (!serverColors.length) {
      if (fallback) {
        $("#colorName").textContent = "기본 색상";
        showImage(fallback, currentPhone?.name || "");
      } else {
        $("#colorName").textContent = "색상 정보 없음";
        showImage(null, "");
      }
      return;
    }

    serverColors.forEach((color, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `color-dynamic${i === 0 ? " active" : ""}`;
      b.title = color.name;
      b.style.background = color.hex || "#ddd";
      b.addEventListener("click", () => {
        $$("#colorButtons .color-dynamic").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        $("#colorName").textContent = color.name;
        showImage(color.image || fallback, `${currentPhone.name} ${color.name}`);
      });
      box.appendChild(b);
    });

    $("#colorName").textContent = serverColors[0].name;
    showImage(serverColors[0].image || fallback, `${currentPhone.name} ${serverColors[0].name}`);
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
