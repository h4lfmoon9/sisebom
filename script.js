(() => {
  "use strict";

  /* ========================================
     시세봄 API 서버 주소
  ======================================== */

  const API_BASE = "https://sisebom.onrender.com";


  /* ========================================
     기본 함수
  ======================================== */

  const $ = (selector) =>
    document.querySelector(selector);

  const $$ = (selector) =>
    [...document.querySelectorAll(selector)];

  const won = (number) => {
    if (number === null || number === undefined) {
      return "정보 없음";
    }

    return (
      Math.round(number).toLocaleString("ko-KR") +
      "원"
    );
  };


  /* ========================================
     현재 선택된 스마트폰
  ======================================== */

  let currentPhone =
    typeof PHONE_DB !== "undefined" &&
    PHONE_DB.length
      ? PHONE_DB[0]
      : null;


  /* ========================================
     필터
  ======================================== */

  let filters = {

    platform: "all",

    storage: "all",

    min: null,

    max: null,

    sort: "cheap"

  };


  /* ========================================
     검색어 정리
  ======================================== */

  function normalize(text) {

    return String(text ?? "")
      .toLowerCase()
      .replace(/gb/g, "")
      .replace(/기가/g, "")
      .replace(/[\s\-_]/g, "");

  }


  /* ========================================
     검색어에서 용량 찾기
  ======================================== */

  function extractStorage(searchText) {

    const match =
      String(searchText).match(
        /(?:^|\s)(64|128|256|512|1024)\s*(?:gb|기가)?(?:\s|$)/i
      );

    return match
      ? Number(match[1])
      : null;

  }


  /* ========================================
     검색어에서 용량 제거
  ======================================== */

  function removeStorageFromSearch(searchText) {

    return String(searchText)

      .replace(
        /(?:^|\s)(64|128|256|512|1024)\s*(?:gb|기가)?(?:\s|$)/gi,
        " "
      )

      .trim();

  }


  /* ========================================
     로컬 DB 제품 찾기
     서버 장애 시 보조용
  ======================================== */

  function findLocalPhone(searchText) {

    if (
      typeof PHONE_DB === "undefined" ||
      !Array.isArray(PHONE_DB)
    ) {
      return null;
    }


    const cleaned =
      normalize(
        removeStorageFromSearch(searchText)
      );


    if (!cleaned) {
      return null;
    }


    let found =
      PHONE_DB.find((phone) => {

        const candidates = [

          phone.name,

          ...(phone.aliases || [])

        ].map(normalize);


        return candidates.includes(cleaned);

      });


    if (found) {
      return found;
    }


    found =
      PHONE_DB.find((phone) => {

        const candidates = [

          phone.name,

          ...(phone.aliases || [])

        ].map(normalize);


        return candidates.some(
          (candidate) =>

            candidate.includes(cleaned) ||

            cleaned.includes(candidate)

        );

      });


    return found ?? null;

  }


  /* ========================================
     현재 제품 매물
  ======================================== */

  function getListings() {

    return currentPhone?.listings ?? [];

  }


  /* ========================================
     매물 필터 적용
  ======================================== */

  function filteredListings() {

    let array =
      getListings().filter((item) => {


        if (
          filters.platform !== "all" &&
          item.platform !== filters.platform
        ) {
          return false;
        }


        if (
          filters.storage !== "all" &&
          item.storage !==
            Number(filters.storage)
        ) {
          return false;
        }


        if (
          filters.min !== null &&
          item.price < filters.min
        ) {
          return false;
        }


        if (
          filters.max !== null &&
          item.price > filters.max
        ) {
          return false;
        }


        return true;

      });


    array =
      [...array].sort((a, b) => {


        if (filters.sort === "cheap") {

          return a.price - b.price;

        }


        if (filters.sort === "high") {

          return b.price - a.price;

        }


        return (
          (a.minutes || 0) -
          (b.minutes || 0)
        );

      });


    return array;

  }


  /* ========================================
     중앙값
  ======================================== */

  function median(numbers) {

    if (!numbers.length) {
      return 0;
    }


    const sorted =
      [...numbers].sort(
        (a, b) => a - b
      );


    const middle =
      Math.floor(
        sorted.length / 2
      );


    return sorted.length % 2

      ? sorted[middle]

      : (
          sorted[middle - 1] +
          sorted[middle]
        ) / 2;

  }


  /* ========================================
     구매점수 계산
  ======================================== */

  function buyScoreFor(items) {

    if (!items.length) {
      return 0;
    }


    const prices =
      items.map(
        (item) => item.price
      );


    const avg =

      prices.reduce(
        (sum, price) =>
          sum + price,
        0
      ) / prices.length;


    const med =
      median(prices);


    const cheapCount =
      prices.filter(
        (price) =>
          price <= med * 0.95
      ).length;


    const spread =

      (
        Math.max(...prices) -
        Math.min(...prices)
      ) / avg;


    let score =

      72 +

      Math.min(
        16,
        cheapCount * 3
      ) -

      Math.min(
        22,
        spread * 18
      );


    return Math.max(

      0,

      Math.min(
        100,
        Math.round(score)
      )

    );

  }


  /* ========================================
     구매점수 색상
  ======================================== */

  function scoreClass(score) {

    if (score >= 70) {
      return "green";
    }


    if (score >= 40) {
      return "yellow";
    }


    return "red";

  }


  /* ========================================
     구매점수 설명
  ======================================== */

  function scoreText(score) {

    if (score >= 70) {

      return "현재는 구매하기 좋은 편이에요.";

    }


    if (score >= 40) {

      return "조건을 조금 더 비교해보는 게 좋아요.";

    }


    return "현재 가격대에서는 구매를 서두르지 않는 편이 좋아요.";

  }


  /* ========================================
     제품정보 표시
  ======================================== */

  function renderProduct() {

    if (!currentPhone) {
      return;
    }


    $("#productNameBadge").textContent =
      currentPhone.name;


    $("#specBrand").textContent =
      currentPhone.brand ?? "-";


    $("#specChipset").textContent =
      currentPhone.specs?.chipset ??
      "-";


    $("#specDisplay").textContent =
      currentPhone.specs?.display ??
      "-";


    $("#specCamera").textContent =
      currentPhone.specs?.camera ??
      "-";


    $("#specCharging").textContent =
      currentPhone.specs?.charging ??
      "-";


    $("#specFrame").textContent =
      currentPhone.specs?.frame ??
      "-";


    $("#specStorage").textContent =

      (currentPhone.storage ?? [])

        .map(
          (value) =>
            `${value}GB`
        )

        .join(" · ") ||

      "-";


    const scores =
      currentPhone.scores ?? {};


    $("#performanceScore").textContent =
      scores.performance ??
      "-";


    $("#dailyScore").textContent =
      scores.daily ??
      "-";


    $("#gamingScore").textContent =
      scores.gaming ??
      "-";


    $("#cameraScore").textContent =
      scores.camera ??
      "-";


    $("#dailyMeter").style.width =
      `${scores.daily ?? 0}%`;


    $("#gamingMeter").style.width =
      `${scores.gaming ?? 0}%`;


    $("#cameraMeter").style.width =
      `${scores.camera ?? 0}%`;


    renderColorButtons();

    renderStorageFilters();

    renderLaunchPrice();


    document.title =
      `시세봄 - ${currentPhone.name}`;

  }


  /* ========================================
     색상 버튼
  ======================================== */

  function renderColorButtons() {

    const container =
      $("#colorButtons");


    if (!container) {
      return;
    }


    const colors =
      currentPhone?.colors ??
      [];


    container.innerHTML =
      "";


    if (!colors.length) {

      $("#colorName").textContent =
        "색상 정보 없음";


      showPhoneImage(
        null,
        currentPhone?.name ??
          ""
      );


      return;

    }


    colors.forEach(
      (color, index) => {


        const button =
          document.createElement(
            "button"
          );


        button.className =
          "color-dynamic" +
          (
            index === 0
              ? " active"
              : ""
          );


        button.type =
          "button";


        button.title =
          color.name;


        button.style.background =
          color.hex ||
          "#dddddd";


        button.addEventListener(
          "click",
          () => {


            $$(
              "#colorButtons .color-dynamic"
            ).forEach(
              (item) =>
                item.classList.remove(
                  "active"
                )
            );


            button.classList.add(
              "active"
            );


            $("#colorName").textContent =
              color.name;


            showPhoneImage(

              color.image,

              `${currentPhone.name} ${color.name}`

            );

          }
        );


        container.appendChild(
          button
        );

      }
    );


    $("#colorName").textContent =
      colors[0].name;


    showPhoneImage(

      colors[0].image,

      `${currentPhone.name} ${colors[0].name}`

    );

  }


  /* ========================================
     제품 이미지
  ======================================== */

  function showPhoneImage(
    imageUrl,
    altText
  ) {

    const image =
      $("#phoneImage");


    const noImage =
      $("#noImage");


    if (!image || !noImage) {
      return;
    }


    if (imageUrl) {


      image.src =
        imageUrl;


      image.alt =
        altText;


      image.hidden =
        false;


      noImage.hidden =
        true;


    }

    else {


      image.removeAttribute(
        "src"
      );


      image.alt =
        "";


      image.hidden =
        true;


      noImage.hidden =
        false;

    }

  }


  /* ========================================
     용량 필터 생성
  ======================================== */

  function renderStorageFilters() {

    const container =
      $("#storageFilters");


    if (!container) {
      return;
    }


    const storages =
      currentPhone?.storage ??
      [];


    container.innerHTML = `

      <button
        class="chip ${
          filters.storage === "all"
            ? "active"
            : ""
        }"
        data-storage="all"
      >
        전체
      </button>


      ${

        storages

          .map(
            (storage) => `

              <button
                class="chip ${
                  String(
                    filters.storage
                  ) ===
                  String(storage)
                    ? "active"
                    : ""
                }"
                data-storage="${storage}"
              >
                ${storage}GB
              </button>

            `
          )

          .join("")

      }

    `;


    $$(
      "#storageFilters .chip"
    ).forEach(
      (button) => {


        button.addEventListener(
          "click",
          () => {


            filters.storage =
              button.dataset.storage;


            $$(
              "#storageFilters .chip"
            ).forEach(
              (item) =>
                item.classList.toggle(
                  "active",
                  item === button
                )
            );


            renderAll();

          }
        );

      }
    );

  }


  /* ========================================
     공식 출시가 표시
  ======================================== */

  function renderLaunchPrice() {

    if (!currentPhone) {
      return;
    }


    const storages =
      currentPhone.storage ??
      [];


    const selectedStorage =

      filters.storage === "all"

        ? storages[0]

        : Number(
            filters.storage
          );


    const price =
      currentPhone.launchPrices?.[
        selectedStorage
      ];


    $("#launchPrice").textContent =
      won(price);


    $("#launchPriceBasis").textContent =

      filters.storage === "all"

        ? `${selectedStorage ?? "-"}GB 기준 · 용량 선택 시 변경`

        : `${selectedStorage}GB 기준`;

  }


  /* ========================================
     시세 요약
  ======================================== */

  function renderSummary(items) {

    $("#visibleCount").textContent =
      items.length;


    if (!items.length) {


      $("#minPrice").textContent =
        "-";


      $("#avgPrice").textContent =
        "-";


      $("#maxPrice").textContent =
        "-";


      $("#buyScore").textContent =
        "0";


      $("#scoreCircle").className =
        "score-circle red";


      $("#aiHeadline").textContent =
        "조건에 맞는 매물이 없어요.";


      $("#aiText").textContent =
        "용량이나 가격 필터를 바꿔보세요.";


      $("#bars").innerHTML =
        "";


      return;

    }


    const prices =
      items.map(
        (item) =>
          item.price
      );


    const min =
      Math.min(
        ...prices
      );


    const max =
      Math.max(
        ...prices
      );


    const avg =

      prices.reduce(
        (sum, price) =>
          sum + price,
        0
      ) / prices.length;


    $("#minPrice").textContent =
      won(min);


    $("#avgPrice").textContent =
      won(avg);


    $("#maxPrice").textContent =
      won(max);


    const score =
      buyScoreFor(items);


    $("#buyScore").textContent =
      score;


    $("#scoreCircle").className =
      `score-circle ${scoreClass(score)}`;


    $("#aiHeadline").textContent =
      scoreText(score);


    const storageText =

      filters.storage === "all"

        ? "전체 용량"

        : `${filters.storage}GB`;


    $("#chartLabel").textContent =
      storageText;


    $("#aiText").textContent =

      `${currentPhone.name} ${storageText} 기준 평균가는 ${won(avg)}이며, ` +

      `현재 조건에서 가장 저렴한 매물은 ${won(min)}입니다.`;



    renderBars(prices);

  }


  /* ========================================
     가격 그래프
  ======================================== */

  function renderBars(prices) {

    if (!prices.length) {


      $("#bars").innerHTML =
        "";


      return;

    }


    const sorted =
      [...prices].sort(
        (a, b) =>
          a - b
      );


    const min =
      Math.min(
        ...sorted
      );


    const max =
      Math.max(
        ...sorted
      );


    $("#bars").innerHTML =

      sorted

        .map(
          (price) => {


            const ratio =

              (
                price - min
              ) /

              (
                max -
                min ||
                1
              );


            const height =

              45 +

              ratio *
                165;


            return `

              <div class="bar-wrap">

                <div
                  class="bar"
                  style="height:${height}px"
                ></div>

                <div class="bar-label">

                  ${
                    Math.round(
                      price /
                        10000
                    )
                  }만

                </div>

              </div>

            `;

          }
        )

        .join("");

  }


  /* ========================================
     매물 카드 색상
  ======================================== */

  function listingColorClass(
    index
  ) {

    return [

      "pink",

      "blue",

      "black",

      "greenish",

      "yellowish"

    ][index % 5];

  }


  /* ========================================
     매물 표시
  ======================================== */

  function renderListings() {

    const items =
      filteredListings();


    renderSummary(
      items
    );


    renderLaunchPrice();


    const grid =
      $("#listingGrid");


    if (!items.length) {


      grid.innerHTML = `

        <div class="empty-listings">

          조건에 맞는 매물이 없습니다.

        </div>

      `;


      return;

    }


    const avg =

      items.reduce(
        (sum, item) =>
          sum +
          item.price,
        0
      ) /
      items.length;


    grid.innerHTML =

      items

        .map(
          (item, index) => {


            const diff =

              (
                (
                  item.price -
                  avg
                ) /
                avg
              ) *
              100;


            let dealClass =
              "normal";


            let dealText =
              "적정 시세";


            if (diff <= -7) {


              dealClass =
                "good";


              dealText =

                `🔥 평균보다 ${Math.abs(diff).toFixed(0)}% 저렴`;

            }

            else if (
              diff >= 10
            ) {


              dealClass =
                "bad";


              dealText =

                `평균보다 ${diff.toFixed(0)}% 비쌈`;

            }


            return `

              <article class="listing">

                <div
                  class="listing-photo ${listingColorClass(index)}"
                >

                  <div class="mini-phone"></div>

                  <span class="platform-badge">
                    ${item.platform}
                  </span>

                  ${
                    item.platform === "당근" &&
                    item.buyNow

                      ? '<span class="buy-now">바로구매</span>'

                      : ""
                  }

                </div>


                <div class="listing-body">

                  <span class="listing-storage">

                    ${item.storage}GB

                  </span>


                  <h3 class="listing-title">

                    ${item.title}

                  </h3>


                  <b class="listing-price">

                    ${won(item.price)}

                  </b>


                  <div class="deal ${dealClass}">

                    ${dealText}

                  </div>


                  <div class="listing-meta">

                    <span>
                      ${item.region ?? "-"}
                    </span>

                    <span>
                      ${item.minutes ?? "-"}분 전
                    </span>

                  </div>


                  <a
                    class="listing-link"
                    href="${item.url}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >

                    원본 매물 보기 →

                  </a>

                </div>

              </article>

            `;

          }
        )

        .join("");

  }


  /* ========================================
     전체 다시 그리기
  ======================================== */

  function renderAll() {

    renderProduct();

    renderListings();

  }


  /* ========================================
     필터 초기화
  ======================================== */

  function resetFilters() {

    filters = {

      platform: "all",

      storage: "all",

      min: null,

      max: null,

      sort: "cheap"

    };


    if ($("#minInput")) {

      $("#minInput").value =
        "";

    }


    if ($("#maxInput")) {

      $("#maxInput").value =
        "";

    }


    if ($("#sortSelect")) {

      $("#sortSelect").value =
        "cheap";

    }


    $$(
      "#platformFilters .chip"
    ).forEach(
      (button) => {

        button.classList.toggle(

          "active",

          button.dataset.platform ===
            "all"

        );

      }
    );

  }


  /* ========================================
     서버에서 제품 검색
  ======================================== */

  async function searchPhone() {

    const query =
      $("#searchInput")
        .value
        .trim();


    if (!query) {


      $("#searchMessage").textContent =
        "검색어를 입력해주세요.";


      return;

    }


    $("#searchMessage").textContent =
      "서버에서 제품 정보를 불러오는 중...";


    $("#searchBtn").disabled =
      true;


    try {


      const response =
        await fetch(

          `${API_BASE}/api/search?q=${encodeURIComponent(query)}`

        );


      if (!response.ok) {


        $("#searchMessage").textContent =
          "등록되지 않은 스마트폰입니다.";


        return;

      }


      const phone =
        await response.json();


      currentPhone =
        phone;


      resetFilters();


      const requestedStorage =
        extractStorage(query);


      if (

        requestedStorage &&

        currentPhone.storage?.includes(
          requestedStorage
        )

      ) {

        filters.storage =
          String(
            requestedStorage
          );

      }


      $("#searchMessage").textContent =

        `${currentPhone.name}을(를) 서버에서 불러왔습니다.`;


      renderAll();


      $("#overview").scrollIntoView({

        behavior: "smooth"

      });


    }

    catch (error) {


      console.error(
        error
      );


      /*
        Render 무료 서버가 잠들어 있으면
        첫 요청이 늦을 수 있음.
        서버 연결 실패 시 로컬 DB도 확인.
      */


      const localPhone =
        findLocalPhone(query);


      if (localPhone) {


        currentPhone =
          localPhone;


        resetFilters();


        $("#searchMessage").textContent =

          "서버 응답이 없어 임시 제품 DB를 사용했습니다.";


        renderAll();

      }

      else {


        $("#searchMessage").textContent =

          "시세봄 서버에 연결할 수 없습니다.";

      }

    }

    finally {


      $("#searchBtn").disabled =
        false;

    }

  }


  /* ========================================
     플랫폼 필터
  ======================================== */

  function setupPlatformFilters() {

    $$(
      "#platformFilters .chip"
    ).forEach(
      (button) => {


        button.addEventListener(
          "click",
          () => {


            filters.platform =
              button.dataset.platform;


            $$(
              "#platformFilters .chip"
            ).forEach(
              (item) =>

                item.classList.toggle(

                  "active",

                  item === button

                )
            );


            renderListings();

          }
        );

      }
    );

  }


  /* ========================================
     비교하기
  ======================================== */

  function setupComparison() {

    if (
      typeof PHONE_DB ===
        "undefined" ||

      !PHONE_DB.length
    ) {
      return;
    }


    const options =

      PHONE_DB

        .map(
          (phone) =>

            `<option value="${phone.id}">${phone.name}</option>`

        )

        .join("");


    $("#compareA").innerHTML =
      options;


    $("#compareB").innerHTML =
      options;


    if (
      PHONE_DB.length > 1
    ) {

      $("#compareB").selectedIndex =
        1;

    }


    $("#compareBtn").addEventListener(
      "click",
      renderComparison
    );


    renderComparison();

  }


  /* ========================================
     기본 출시가
  ======================================== */

  function firstLaunchPrice(
    phone
  ) {

    const storage =
      phone.storage?.[0];


    return storage == null

      ? null

      : phone.launchPrices?.[
          storage
        ];

  }


  /* ========================================
     비교 결과
  ======================================== */

  function renderComparison() {

    if (
      typeof PHONE_DB ===
        "undefined" ||

      !PHONE_DB.length
    ) {
      return;
    }


    const phoneA =

      PHONE_DB.find(
        (phone) =>
          phone.id ===
          $("#compareA").value
      ) ??

      PHONE_DB[0];


    const phoneB =

      PHONE_DB.find(
        (phone) =>
          phone.id ===
          $("#compareB").value
      ) ??

      PHONE_DB[1] ??

      PHONE_DB[0];


    if (
      !phoneA ||
      !phoneB
    ) {
      return;
    }


    $("#compareNameA").textContent =
      phoneA.name;


    $("#compareNameB").textContent =
      phoneB.name;


    $("#comparePerformanceA").textContent =
      phoneA.scores?.performance ??
      "-";


    $("#comparePerformanceB").textContent =
      phoneB.scores?.performance ??
      "-";


    $("#compareCameraA").textContent =
      phoneA.scores?.camera ??
      "-";


    $("#compareCameraB").textContent =
      phoneB.scores?.camera ??
      "-";


    $("#comparePriceA").textContent =
      won(
        firstLaunchPrice(
          phoneA
        )
      );


    $("#comparePriceB").textContent =
      won(
        firstLaunchPrice(
          phoneB
        )
      );


    const perfA =
      phoneA.scores?.performance ??
      0;


    const perfB =
      phoneB.scores?.performance ??
      0;


    if (
      perfA === perfB
    ) {


      $("#compareText").textContent =

        "현재 등록된 성능점수는 비슷합니다. 가격과 카메라 등 다른 기준도 함께 비교하세요.";

    }

    else {


      const faster =

        perfA > perfB

          ? phoneA.name

          : phoneB.name;


      $("#compareText").textContent =

        `현재 등록된 성능점수 기준으로는 ${faster}이(가) 더 높습니다.`;

    }

  }


  /* ========================================
     이벤트 연결
  ======================================== */

  function setupEvents() {

    setupPlatformFilters();


    $("#searchBtn").addEventListener(
      "click",
      searchPhone
    );


    $("#searchInput").addEventListener(
      "keydown",
      (event) => {


        if (
          event.key ===
          "Enter"
        ) {

          searchPhone();

        }

      }
    );


    $("#priceApply").addEventListener(
      "click",
      () => {


        filters.min =

          $("#minInput").value

            ? Number(
                $("#minInput").value
              )

            : null;


        filters.max =

          $("#maxInput").value

            ? Number(
                $("#maxInput").value
              )

            : null;


        renderListings();

      }
    );


    $("#sortSelect").addEventListener(
      "change",
      (event) => {


        filters.sort =
          event.target.value;


        renderListings();

      }
    );


    $("#resetBtn").addEventListener(
      "click",
      () => {


        resetFilters();

        renderAll();

      }
    );


    $("#infoBtn").addEventListener(
      "click",
      () => {


        const box =
          $("#infoBox");


        box.style.display =

          box.style.display ===
            "block"

            ? "none"

            : "block";

      }
    );


    $("#goCompareBtn").addEventListener(
      "click",
      () => {


        if (
          currentPhone &&
          $("#compareA")
        ) {


          const exists =
            [...$("#compareA").options]
              .some(
                (option) =>
                  option.value ===
                  currentPhone.id
              );


          if (exists) {

            $("#compareA").value =
              currentPhone.id;

          }

        }


        renderComparison();


        $("#compare").scrollIntoView({

          behavior: "smooth"

        });

      }
    );

  }


  /* ========================================
     사이트 시작
  ======================================== */

  function init() {

    setupEvents();

    setupComparison();


    if (currentPhone) {

      renderAll();

    }


    console.log(
      "🌱 시세봄 프론트엔드 시작"
    );


    console.log(
      "API:",
      API_BASE
    );

  }


  document.addEventListener(

    "DOMContentLoaded",

    init

  );

})();