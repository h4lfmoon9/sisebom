/*
  시세봄 스마트폰 데이터베이스

  핵심:
  - 사이트 코드는 특정 아이폰 하나에 묶여 있지 않습니다.
  - 아래 PHONE_DB에 같은 형식으로 제품을 추가하면 검색/필터/비교에 자동 반영됩니다.
  - 공식 제품 이미지를 사용할 수 있을 때만 colors[].image에 이미지 URL을 넣으세요.
  - 공식 이미지가 없으면 image: null 그대로 두면 "예시 이미지 없음"이 표시됩니다.
  - 아래 가격/점수/매물은 프로토타입 테스트용입니다. 공개 서비스 전 공식 자료로 검증하세요.
*/

const PHONE_DB = [
  {
    id: "iphone15",
    name: "아이폰 15",
    brand: "Apple",
    series: "iPhone",
    aliases: ["아이폰15", "iphone 15", "iphone15"],
    storage: [128, 256, 512],
    launchPrices: {
      128: 1250000,
      256: 1400000,
      512: 1700000
    },
    specs: {
      chipset: "A16 Bionic",
      display: "6.1인치",
      camera: "듀얼 카메라",
      charging: "USB-C",
      frame: "알루미늄"
    },
    scores: {
      performance: 86,
      daily: 94,
      gaming: 86,
      camera: 84
    },
    colors: [
      { name: "핑크", key: "pink", hex: "#e8c7cf", image: null },
      { name: "블랙", key: "black", hex: "#303331", image: null },
      { name: "블루", key: "blue", hex: "#bfd2dc", image: null },
      { name: "그린", key: "green", hex: "#cadbc8", image: null },
      { name: "옐로", key: "yellow", hex: "#e8ddb8", image: null }
    ],
    listings: [
      {platform:"당근", storage:128, price:430000, minutes:64, title:"아이폰 15 128GB 블랙 사용감 있음", buyNow:false, region:"서울", url:"https://example.com/iphone15-1"},
      {platform:"번개장터", storage:128, price:475000, minutes:7, title:"아이폰 15 128GB 핑크 풀박스", buyNow:false, region:"전국", url:"https://example.com/iphone15-2"},
      {platform:"중고나라", storage:128, price:490000, minutes:21, title:"아이폰 15 128GB 블루 상태 좋음", buyNow:false, region:"전국", url:"https://example.com/iphone15-3"},
      {platform:"당근", storage:256, price:535000, minutes:5, title:"아이폰 15 256GB 자급제", buyNow:true, region:"경기", url:"https://example.com/iphone15-4"},
      {platform:"번개장터", storage:256, price:565000, minutes:9, title:"아이폰 15 256GB 풀박스", buyNow:false, region:"전국", url:"https://example.com/iphone15-5"},
      {platform:"중고나라", storage:512, price:635000, minutes:11, title:"아이폰 15 512GB 상태 양호", buyNow:false, region:"전국", url:"https://example.com/iphone15-6"},
      {platform:"당근", storage:512, price:720000, minutes:52, title:"아이폰 15 512GB 미개봉급", buyNow:true, region:"부산", url:"https://example.com/iphone15-7"}
    ]
  },

  {
    id: "galaxy-s24",
    name: "갤럭시 S24",
    brand: "Samsung",
    series: "Galaxy S",
    aliases: ["갤럭시s24", "galaxy s24", "s24"],
    storage: [256, 512],
    launchPrices: {
      256: 1155000,
      512: 1298000
    },
    specs: {
      chipset: "Exynos 2400",
      display: "6.2인치",
      camera: "트리플 카메라",
      charging: "USB-C",
      frame: "알루미늄"
    },
    scores: {
      performance: 91,
      daily: 95,
      gaming: 91,
      camera: 87
    },
    colors: [
      { name: "블랙", key: "black", hex: "#343536", image: null },
      { name: "그레이", key: "gray", hex: "#b9b8b0", image: null },
      { name: "바이올렛", key: "violet", hex: "#c9c0dc", image: null },
      { name: "옐로", key: "yellow", hex: "#ebe2ad", image: null }
    ],
    listings: [
      {platform:"당근", storage:256, price:390000, minutes:12, title:"갤럭시 S24 256GB 상태 좋음", buyNow:true, region:"서울", url:"https://example.com/s24-1"},
      {platform:"번개장터", storage:256, price:425000, minutes:18, title:"갤럭시 S24 256GB 자급제", buyNow:false, region:"전국", url:"https://example.com/s24-2"},
      {platform:"중고나라", storage:256, price:450000, minutes:35, title:"갤럭시 S24 256기가 판매", buyNow:false, region:"전국", url:"https://example.com/s24-3"},
      {platform:"당근", storage:512, price:495000, minutes:8, title:"갤럭시 S24 512GB 풀박스", buyNow:false, region:"경기", url:"https://example.com/s24-4"},
      {platform:"번개장터", storage:512, price:530000, minutes:44, title:"갤럭시 S24 512GB A급", buyNow:false, region:"전국", url:"https://example.com/s24-5"}
    ]
  },

  {
    id: "xiaomi14",
    name: "샤오미 14",
    brand: "Xiaomi",
    series: "Xiaomi",
    aliases: ["샤오미14", "xiaomi 14", "xiaomi14"],
    storage: [256, 512],
    launchPrices: {
      256: null,
      512: null
    },
    specs: {
      chipset: "Snapdragon 8 Gen 3",
      display: "6.36인치",
      camera: "트리플 카메라",
      charging: "USB-C",
      frame: "알루미늄"
    },
    scores: {
      performance: 93,
      daily: 94,
      gaming: 93,
      camera: 88
    },
    colors: [
      { name: "블랙", key: "black", hex: "#262626", image: null },
      { name: "화이트", key: "white", hex: "#eeeeec", image: null },
      { name: "그린", key: "green", hex: "#b7c7b3", image: null }
    ],
    listings: [
      {platform:"번개장터", storage:256, price:490000, minutes:17, title:"샤오미 14 256GB 판매", buyNow:false, region:"전국", url:"https://example.com/xiaomi14-1"},
      {platform:"중고나라", storage:256, price:520000, minutes:28, title:"샤오미 14 256기가 상태 양호", buyNow:false, region:"전국", url:"https://example.com/xiaomi14-2"},
      {platform:"당근", storage:512, price:590000, minutes:9, title:"샤오미 14 512GB 풀박스", buyNow:false, region:"서울", url:"https://example.com/xiaomi14-3"},
      {platform:"번개장터", storage:512, price:625000, minutes:41, title:"샤오미 14 512GB 판매", buyNow:false, region:"전국", url:"https://example.com/xiaomi14-4"}
    ]
  }
];
