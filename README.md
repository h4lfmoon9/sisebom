# 시세봄 전체 프로젝트 완성본

지금까지 만든 시세봄을 한 번에 다시 정리한 버전입니다.

## 구조

```text
sisebom
├─ index.html
├─ style.css
├─ script.js
├─ favicon.svg
├─ .gitignore
├─ README.md
└─ server
   ├─ server.js
   ├─ phones.json
   ├─ package.json
   └─ .env.example
```

## 프론트엔드

GitHub Pages에서 동작합니다.

온라인 API:
`https://sisebom.onrender.com`

로컬에서 `localhost`로 열면 자동으로:
`http://localhost:3000`

을 사용합니다.

## Render 서버 설정

- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Plan: Free

## 주요 API

- `GET /api/health`
- `GET /api/phones`
- `GET /api/search?q=아이폰15`
- `GET /api/phones/:id`
- `GET /api/listings/:id`
- `GET /api/market/:id`
- `GET /api/compare?a=iphone15&b=galaxy-s24`
- `POST /api/ai/judge`

## 적용 방법

기존 `Documents/GitHub/sisebom` 폴더 안에 ZIP의 파일을 전부 덮어씁니다.

예전에 만든 `phones.js`는 삭제해도 됩니다. 새 버전은 서버의 `phones.json`을 사용합니다.

그다음 GitHub Desktop에서:

1. Changes 확인
2. Summary에 `전체 프로젝트 구조 정리`
3. Commit to main
4. Push origin

Render가 GitHub 저장소를 자동 배포하도록 설정돼 있으면 서버도 같이 갱신됩니다.

## 폰 추가

`server/phones.json`에 같은 형식으로 제품을 추가하면 검색, 제품정보, 시세, 비교에 자동 반영됩니다.

## 공식 이미지

각 색상의 `image`에 사용 가능한 제조사 공식 이미지 URL을 넣으면 해당 색상 버튼을 누를 때 이미지가 바뀝니다.

공식 이미지가 없으면:

```json
"image": null
```

그대로 두면 `예시 이미지 없음`이 표시됩니다.

## 현재 테스트 데이터

- 아이폰 15
- 갤럭시 S24
- 샤오미 14

현재 매물/점수 일부는 프로토타입 테스트용입니다.

## 실제 서비스에서 추가로 필요한 것

아래는 외부 권한/데이터가 있어야 실제 연결할 수 있습니다.

- 당근 실제 매물
- 번개장터 실제 매물
- 중고나라 실제 매물
- 제조사 전체 스마트폰 DB 자동 수집
- 공식 이미지 실제 등록
- 실제 AI API 연결

공개 페이지라고 해서 자동 수집/재사용 권한이 자동으로 생기는 것은 아니므로 각 서비스의 허용 방식/API/정책에 맞춰 연결해야 합니다.

AI API 키는 절대 `script.js`나 공개 GitHub 저장소에 넣지 말고 Render Environment Variables 또는 `server/.env`에만 저장해야 합니다.


## 공식 제품 이미지 v1

- 아이폰 15: Apple 공식 Newsroom 이미지 연결
- 갤럭시 S24: Samsung 공식 제품 이미지 연결
- 샤오미 14: 공식 이미지 URL을 아직 넣지 않았으므로 `예시 이미지 없음`
- 제품 이미지 아래에 `공식 이미지 출처 보기 →` 링크 추가
- 색상별 개별 공식 이미지는 다음 단계에서 제조사별 공식 이미지 URL을 색상마다 따로 연결하면 됩니다.

주의: 현재 Apple/Samsung은 우선 공식 대표 이미지 1장을 각 색상 버튼에 공통 연결한 상태입니다.


## 제조사별 DB v1

서버 DB를 하나의 `phones.json`에서 제조사별 JSON으로 분리했습니다.

현재 등록된 검색용 제품 수: 133

- Apple: 26
- Samsung: 38
- Xiaomi: 14
- POCO: 15
- Redmi: 12
- Motorola: 13
- Google Pixel: 15

중요:
모델명을 많이 등록했지만, 확인하지 않은 출시가/스펙/이미지를 임의로 만들지 않았습니다.
세부 정보가 검증되지 않은 제품은 `verified:false`이며 정보가 비어 있습니다.
사이트 검색 구조와 서버는 모든 JSON 파일을 자동으로 합칩니다.


## 색상별 공식 이미지 v2

- iPhone 15:
  - 핑크 / 블랙 / 블루 / 그린 / 옐로
  - 각 버튼마다 서로 다른 Apple 공식 CDN 제품 이미지를 연결
  - 투명 PNG 제품 컷이라 배경 없이 폰만 표시
- Galaxy S24:
  - 이전처럼 같은 대표 이미지를 모든 색상에 반복하지 않도록 수정
  - 색상별 공식 이미지가 별도로 검증되기 전까지 `예시 이미지 없음`
- 공식 이미지 URL 로딩 실패 시에도 자동으로 `예시 이미지 없음` 표시

원칙:
공식 색상 이미지가 확인된 경우에만 `colors[].image`에 URL을 넣습니다.
확인되지 않은 모델은 같은 사진을 억지로 색상별로 반복하지 않습니다.


## iPhone 전체 검색 DB v1
- 초대 iPhone부터 iPhone 17e까지 52개 모델 검색 지원
- mini / Plus / Pro / Pro Max / Air / e / SE 포함
- 확인되지 않은 세부 스펙·가격·이미지는 임의 생성하지 않고 비워둠
- 기존 iPhone 15/최신 배치 누끼 이미지는 그대로 유지
