'use strict';

function text(v=''){ return String(v||'').trim(); }
function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
function isMissing(v){ return v == null || v === '' || v === '정보 확인 중'; }
function fill(base = {}, incoming = {}){
  const out = { ...base };
  for(const [k,v] of Object.entries(incoming||{})){
    if(isMissing(out[k]) && !isMissing(v)) out[k] = v;
  }
  return out;
}
function norm(phone={}){
  return `${text(phone.brand)} ${text(phone.series)} ${text(phone.name)} ${(phone.aliases||[]).join(' ')}`
    .toLowerCase()
    .replace(/\+/g,' plus ')
    .replace(/ultra/gi,' ultra ')
    .replace(/pro max/gi,' pro max ')
    .replace(/\s+/g,' ');
}
function numMatch(s, regex){ const m = s.match(regex); return m ? Number(m[1]) : null; }
function brandColor(brand=''){
  const b = String(brand||'').toLowerCase();
  if(/samsung|galaxy/.test(b)) return ['#0f5fe5','#071b45'];
  if(/xiaomi|redmi/.test(b)) return ['#ff7a00','#7a2800'];
  if(/poco/.test(b)) return ['#f7d000','#4d4300'];
  if(/motorola|moto/.test(b)) return ['#3557ff','#0f1537'];
  if(/google|pixel/.test(b)) return ['#34a853','#174a30'];
  if(/oneplus/.test(b)) return ['#e50012','#5b0007'];
  if(/oppo/.test(b)) return ['#0f9d58','#0a4427'];
  if(/vivo|iqoo/.test(b)) return ['#415fff','#15205f'];
  if(/realme/.test(b)) return ['#ffdb00','#6d5e00'];
  if(/honor/.test(b)) return ['#4d5cff','#1b2259'];
  if(/huawei/.test(b)) return ['#d6001c','#5a000c'];
  if(/sony|xperia/.test(b)) return ['#525252','#161616'];
  if(/lg/.test(b)) return ['#a50034','#430014'];
  if(/asus|rog/.test(b)) return ['#8a2be2','#2a1042'];
  if(/nothing|cmf/.test(b)) return ['#777','#222'];
  return ['#3d5a80','#1d2939'];
}
function svgData(phone={}){
  const [c1,c2]=brandColor(phone.brand);
  const brand = esc(text(phone.brand||'Smartphone'));
  const name = esc(text(phone.name||'Model'));
  const series = esc(text(phone.series||''));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="1200" height="1200" rx="80" fill="url(#g)"/><rect x="335" y="120" width="530" height="960" rx="58" fill="#ffffff" fill-opacity="0.08" stroke="#fff" stroke-opacity="0.28"/><rect x="370" y="200" width="460" height="720" rx="34" fill="#fff" fill-opacity="0.12" stroke="#fff" stroke-opacity="0.25"/><text x="600" y="140" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="52" text-anchor="middle" opacity="0.92">${brand}</text><text x="600" y="970" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="700" text-anchor="middle">${name}</text><text x="600" y="1030" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="34" text-anchor="middle" opacity="0.9">${series}</text></svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}
function esc(s=''){ return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

function defaultByTier(tier='mid'){
  if(tier==='flagship') return { chipset:'플래그십 칩셋', display:'OLED 120Hz 디스플레이', camera:'고급형 멀티 카메라', charging:'USB-C 고속충전', frame:'알루미늄 프레임' };
  if(tier==='fold') return { chipset:'플래그십 칩셋', display:'폴더블 OLED 120Hz 디스플레이', camera:'고급형 멀티 카메라', charging:'USB-C 고속충전', frame:'알루미늄 프레임' };
  if(tier==='entry') return { chipset:'보급형 칩셋', display:'LCD/OLED 디스플레이', camera:'듀얼 또는 싱글 카메라', charging:'USB-C 충전', frame:'플라스틱 프레임' };
  return { chipset:'중급형 칩셋', display:'OLED/LCD 120Hz 디스플레이', camera:'듀얼 또는 트리플 카메라', charging:'USB-C 고속충전', frame:'플라스틱 또는 알루미늄 프레임' };
}

function samsungSpecs(n){
  if(/s25 ultra/.test(n)) return { chipset:'Snapdragon 8 Elite for Galaxy', display:'6.9인치 Dynamic AMOLED 2X 120Hz', camera:'200MP 광각 + 멀티 카메라', charging:'45W 유선충전', frame:'티타늄 프레임' };
  if(/s25 plus|s25\+/.test(n)) return { chipset:'Snapdragon 8 Elite for Galaxy', display:'6.7인치 Dynamic AMOLED 2X 120Hz', camera:'50MP 트리플 카메라', charging:'45W 유선충전', frame:'아머 알루미늄 프레임' };
  if(/\bs25\b/.test(n)) return { chipset:'Snapdragon 8 Elite for Galaxy', display:'6.2인치 Dynamic AMOLED 2X 120Hz', camera:'50MP 트리플 카메라', charging:'25W 유선충전', frame:'아머 알루미늄 프레임' };
  if(/s24 ultra/.test(n)) return { chipset:'Snapdragon 8 Gen 3 for Galaxy', display:'6.8인치 Dynamic AMOLED 2X 120Hz', camera:'200MP 광각 + 멀티 카메라', charging:'45W 유선충전', frame:'티타늄 프레임' };
  if(/\b(?:s2[3-4]|s2[1-2])/.test(n)) return { chipset:'Galaxy S 플래그십 칩셋', display:'Dynamic AMOLED 2X 120Hz', camera:/ultra/.test(n)?'고급형 쿼드 카메라':'50MP 트리플 카메라', charging:/ultra|plus/.test(n)?'45W 유선충전':'25W 유선충전', frame:'아머 알루미늄 프레임' };
  if(/fold/.test(n)) return { chipset:'Galaxy Z 플래그십 칩셋', display:'폴더블 Dynamic AMOLED 2X 120Hz', camera:'트리플 카메라', charging:'25W 유선충전', frame:'아머 알루미늄 프레임' };
  if(/flip/.test(n)) return { chipset:'Galaxy Z 플래그십 칩셋', display:'폴더블 Dynamic AMOLED 2X 120Hz', camera:'듀얼 카메라', charging:'25W 유선충전', frame:'아머 알루미늄 프레임' };
  if(/note/.test(n)) return { chipset:'Galaxy Note 플래그십 칩셋', display:'AMOLED 디스플레이', camera:'트리플 카메라', charging:'USB-C 고속충전', frame:'메탈 프레임' };
  const a = n.match(/\ba\s?(\d{2})\b/);
  if(a){ const x=Number(a[1]); return x>=50 ? { chipset:'Exynos/Snapdragon 중급형 칩셋', display:'6.6~6.7인치 Super AMOLED 120Hz', camera:'50MP 트리플 카메라', charging:'25W 유선충전', frame:'플라스틱 프레임' } : x>=30 ? { chipset:'중급형 칩셋', display:'6.6인치 Super AMOLED 120Hz', camera:'50MP 트리플 카메라', charging:'25W 유선충전', frame:'플라스틱 프레임' } : defaultByTier('entry'); }
  if(/\bm\s?\d{2}\b|\bf\s?\d{2}\b|wide|jump|quantum|buddy|jean/.test(n)) return { chipset:'삼성 중급형 칩셋', display:'6.5~6.7인치 LCD/OLED 디스플레이', camera:'듀얼 또는 트리플 카메라', charging:'15W~25W 유선충전', frame:'플라스틱 프레임' };
  if(/xcover/.test(n)) return { chipset:'내구형 중급 칩셋', display:'LCD 디스플레이', camera:'듀얼 카메라', charging:'USB-C 충전', frame:'러기드 프레임' };
  return defaultByTier('mid');
}
function xiaomiSpecs(n){
  if(/xiaomi\s*15 ultra|샤오미\s*15\s*ultra|샤오미\s*15\s*울트라/.test(n)) return { chipset:'Snapdragon 8 Elite', display:'6.73인치 AMOLED 120Hz', camera:'라이카 쿼드 카메라', charging:'90W 유선충전', frame:'알루미늄 프레임' };
  if(/xiaomi\s*15|샤오미\s*15/.test(n)) return { chipset:'Snapdragon 8 Elite', display:'6.36인치 AMOLED 120Hz', camera:'라이카 트리플 카메라', charging:'90W 유선충전', frame:'알루미늄 프레임' };
  if(/xiaomi\s*14 ultra|샤오미\s*14\s*ultra|샤오미\s*14\s*울트라/.test(n)) return { chipset:'Snapdragon 8 Gen 3', display:'6.73인치 AMOLED 120Hz', camera:'라이카 쿼드 카메라', charging:'90W 유선충전', frame:'알루미늄 프레임' };
  if(/xiaomi\s*14|샤오미\s*14/.test(n)) return { chipset:'Snapdragon 8 Gen 3', display:'6.36인치 AMOLED 120Hz', camera:'라이카 트리플 카메라', charging:'90W 유선충전', frame:'알루미늄 프레임' };
  if(/xiaomi|샤오미/.test(n)){
    if(/mix fold|fold/.test(n)) return { chipset:'Snapdragon 플래그십 칩셋', display:'폴더블 AMOLED 120Hz', camera:'고급형 멀티 카메라', charging:'67W 이상 고속충전', frame:'알루미늄 프레임' };
    if(/mix flip|flip/.test(n)) return { chipset:'Snapdragon 플래그십 칩셋', display:'폴더블 AMOLED 120Hz', camera:'듀얼 카메라', charging:'67W 이상 고속충전', frame:'알루미늄 프레임' };
    if(/\bt\b|\bt pro\b/.test(n)) return { chipset:'상급 Snapdragon/Dimensity 칩셋', display:'AMOLED 120Hz 디스플레이', camera:'트리플 카메라', charging:'67W~120W 고속충전', frame:'알루미늄 프레임' };
    if(/ultra|pro/.test(n)) return { chipset:'Snapdragon 플래그십 칩셋', display:'AMOLED 120Hz 디스플레이', camera:'고급형 트리플 카메라', charging:'67W~120W 고속충전', frame:'알루미늄 프레임' };
    return { chipset:'상급형 Snapdragon 칩셋', display:'AMOLED 120Hz 디스플레이', camera:'트리플 카메라', charging:'67W~90W 고속충전', frame:'알루미늄 프레임' };
  }
  if(/redmi|레드미/.test(n)){
    if(/note/.test(n)){
      if(/pro\+|pro plus/.test(n)) return { chipset:'상급 Snapdragon/Dimensity 칩셋', display:'AMOLED 120Hz 디스플레이', camera:'200MP 고해상도 카메라', charging:'90W~120W 고속충전', frame:'플라스틱 또는 알루미늄 프레임' };
      if(/pro/.test(n)) return { chipset:'중상급 Snapdragon/Dimensity 칩셋', display:'AMOLED 120Hz 디스플레이', camera:'108MP~200MP 트리플 카메라', charging:'45W~67W 고속충전', frame:'플라스틱 프레임' };
      return { chipset:'중급형 칩셋', display:'AMOLED/LCD 120Hz 디스플레이', camera:'50MP~108MP 카메라', charging:'33W~45W 고속충전', frame:'플라스틱 프레임' };
    }
    if(/\bk\d|turbo/.test(n)) return { chipset:'고성능 Snapdragon 칩셋', display:'AMOLED 120Hz 디스플레이', camera:'듀얼 또는 트리플 카메라', charging:'67W~120W 고속충전', frame:'플라스틱 또는 알루미늄 프레임' };
    if(/\ba\d|\bc\d|go/.test(n)) return defaultByTier('entry');
    return defaultByTier('mid');
  }
  if(/poco|포코/.test(n)){
    if(/\bf\d/.test(n)) return { chipset:'고성능 Snapdragon 칩셋', display:'AMOLED 120Hz 디스플레이', camera:'듀얼 또는 트리플 카메라', charging:'67W~120W 고속충전', frame:'플라스틱 또는 알루미늄 프레임' };
    if(/\bx\d/.test(n)) return { chipset:'중상급 칩셋', display:'AMOLED/LCD 120Hz 디스플레이', camera:'듀얼 또는 트리플 카메라', charging:'45W~67W 고속충전', frame:'플라스틱 프레임' };
    if(/\bm\d/.test(n)) return { chipset:'중급형 칩셋', display:'LCD/AMOLED 90~120Hz 디스플레이', camera:'듀얼 카메라', charging:'33W~45W 고속충전', frame:'플라스틱 프레임' };
    return defaultByTier('entry');
  }
  return null;
}
function motorolaSpecs(n){
  if(/razr/.test(n)) return { chipset:'Snapdragon 플래그십 칩셋', display:'폴더블 pOLED 120~165Hz', camera:'듀얼 카메라', charging:'30W~45W 고속충전', frame:'알루미늄 프레임' };
  if(/edge/.test(n)) return /pro|ultra/.test(n)
    ? { chipset:'Snapdragon 상급 칩셋', display:'pOLED 144Hz 디스플레이', camera:'50MP 고급형 트리플 카메라', charging:'68W~125W 고속충전', frame:'알루미늄 또는 비건레더 마감' }
    : { chipset:'Snapdragon/Dimensity 중상급 칩셋', display:'pOLED 120~144Hz 디스플레이', camera:'50MP 듀얼/트리플 카메라', charging:'68W 고속충전', frame:'플라스틱 또는 알루미늄 프레임' };
  if(/moto g/.test(n)) return { chipset:'Snapdragon/Dimensity 중급 칩셋', display:'LCD/OLED 120Hz 디스플레이', camera:'듀얼 또는 트리플 카메라', charging:'30W~68W 고속충전', frame:'플라스틱 프레임' };
  if(/moto e/.test(n)) return defaultByTier('entry');
  if(/thinkphone/.test(n)) return { chipset:'Snapdragon 플래그십 칩셋', display:'pOLED 144Hz 디스플레이', camera:'50MP 트리플 카메라', charging:'68W 고속충전', frame:'아라미드/알루미늄 프레임' };
  if(/motorola one|moto one|\bone\b/.test(n)) return defaultByTier('mid');
  if(/defy/.test(n)) return { chipset:'중급형 칩셋', display:'LCD 디스플레이', camera:'듀얼 카메라', charging:'USB-C 충전', frame:'러기드 프레임' };
  return defaultByTier('mid');
}
function pixelSpecs(n){
  const gen = numMatch(n, /pixel\s*(\d{1,2})/);
  const tensor = gen ? `Tensor G${Math.max(1, gen-5)}` : 'Tensor 칩셋';
  if(/fold/.test(n)) return { chipset:tensor, display:'폴더블 OLED 120Hz 디스플레이', camera:'고급형 멀티 카메라', charging:'USB-C 고속충전', frame:'알루미늄 프레임' };
  if(/pro xl|pro/.test(n)) return { chipset:tensor, display:'OLED 120Hz 디스플레이', camera:'트리플 카메라', charging:'USB-C 고속충전', frame:'알루미늄 프레임' };
  if(/\ba\b/.test(n)) return { chipset:tensor, display:'OLED 90~120Hz 디스플레이', camera:'듀얼 카메라', charging:'USB-C 충전', frame:'알루미늄/플라스틱 프레임' };
  return { chipset:tensor, display:'OLED 120Hz 디스플레이', camera:'듀얼 카메라', charging:'USB-C 고속충전', frame:'알루미늄 프레임' };
}
function otherBrandSpecs(n, phone={}){
  const brand = (phone.brand||'').toLowerCase();
  if(/oneplus/.test(brand)) return /pro|ultra/.test(n)? defaultByTier('flagship') : { chipset:'Snapdragon 상급 칩셋', display:'AMOLED 120Hz 디스플레이', camera:'트리플 카메라', charging:'SUPERVOOC 고속충전', frame:'알루미늄 프레임' };
  if(/oppo|vivo|iqoo|realme|honor|huawei/.test(brand)) return /pro|ultra|x|magic|find/.test(n)? defaultByTier('flagship') : defaultByTier('mid');
  if(/sony|xperia/.test(brand)) return { chipset:'Snapdragon 상급 칩셋', display:'OLED 120Hz 디스플레이', camera:'고급형 멀티 카메라', charging:'USB-C 고속충전', frame:'알루미늄 프레임' };
  if(/lg/.test(brand)) return { chipset:'Snapdragon 칩셋', display:'OLED/LCD 디스플레이', camera:'듀얼 또는 트리플 카메라', charging:'USB-C 충전', frame:'메탈 또는 플라스틱 프레임' };
  if(/asus|rog/.test(brand)) return /rog/.test(n)? { chipset:'Snapdragon 플래그십 칩셋', display:'AMOLED 165Hz 디스플레이', camera:'듀얼/트리플 카메라', charging:'65W 고속충전', frame:'알루미늄 프레임' } : defaultByTier('flagship');
  return /pro|ultra|max|fold|flip/.test(n) ? defaultByTier('flagship') : /lite|c |a\d|e\d|go/.test(n) ? defaultByTier('entry') : defaultByTier('mid');
}

function inferSpecs(phone={}){
  const n = norm(phone);
  const b = String(phone.brand||'').toLowerCase();
  if(/apple|iphone/.test(b) || /iphone|아이폰/.test(n)) return null;
  if(/samsung/.test(b) || /galaxy|갤럭시/.test(n)) return samsungSpecs(n);
  if(/xiaomi|redmi|poco/.test(b) || /샤오미|redmi|레드미|poco|포코/.test(n)) return xiaomiSpecs(n);
  if(/motorola|moto/.test(b) || /motorola|모토로라|moto/.test(n)) return motorolaSpecs(n);
  if(/google/.test(b) || /pixel|픽셀/.test(n)) return pixelSpecs(n);
  return otherBrandSpecs(n, phone);
}

function applyVisualProfile(phone={}){
  const out = { ...phone };
  if(/apple/i.test(String(out.brand||'')) || /iphone|아이폰/i.test(String(out.name||''))) return out;

  const inferred = inferSpecs(out) || {};
  out.specs = fill({ chipset:null, display:null, camera:null, charging:null, frame:null, ...(out.specs||{}) }, inferred);

  for(const field of ['chipset','display','camera','charging','frame']){
    if(isMissing(out[field]) && !isMissing(out.specs[field])) out[field] = out.specs[field];
  }

  // FINAL V7: representative-image automation disabled by request.
  // Keep only an image that already exists in the catalog; do not generate one.
  if(out.imageVerified == null) out.imageVerified = false;
  return out;
}

function applyVisualProfileCatalog(phones=[]){ return (Array.isArray(phones)?phones:[]).map(applyVisualProfile); }

module.exports = { applyVisualProfile, applyVisualProfileCatalog, inferSpecs, svgData };
