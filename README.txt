시세봄 FINAL V5 — 전체 스마트폰 카탈로그 대확장

기준
- FINAL V4의 용량 선택 / 3×3 9개 페이지 / 이전·다음 / 페이지 번호 / 판매완료 제외 기능을 그대로 유지
- 스마트폰만 추가 (태블릿, 워치, 이어폰 제외)
- 기존에 검증된 제품 데이터/이미지는 덮어쓰지 않고 V5 시드와 자동 병합
- V5 시드 이미지 값은 비워 둠: 제품 이미지 정책과 충돌하지 않도록 새 이미지를 임의 추가하지 않음

추가 규모
- V5 시드 모델: 2,088개
- 브랜드: 39개
- 시리즈/패밀리: 164개
- 브랜드별: Samsung 346, Xiaomi 257, Motorola 181, OPPO 141, realme 136, vivo 100, Huawei 87, Sony 75, LG 68, OnePlus 62, HONOR 58, POCO 58, Nokia 51, TECNO 39, Google 38, iQOO 35, Meizu 35, Infinix 33, ASUS 30, HTC 29, Sharp 27, ZTE 23, itel 21, Lenovo 19, nubia 19, TCL 17, Microsoft 15, Black Shark 14, BlackBerry 13, Alcatel 12, REDMAGIC 12, HMD 10, Fairphone 7, Nothing 7, Legion 4, ZUK 4, CMF 2, Razer 2, Essential 1

핵심 확장
1) Samsung
   Galaxy S / Z / Note / A / M / F / J / C / On / Grand / Core / Ace / Young / Y /
   Mega / E / Trend / Pocket / Beam / XCover / Folder / W
   + 한국 통신사 계열 Wide / Jump / Quantum / Buddy / Jean
   + 2026 S26 / S26+ / S26 Ultra / S26 FE
   + 2026 Z Fold8 / Z Fold8 Ultra / Z Flip8

2) Xiaomi 그룹
   Xiaomi/Mi 숫자형, T, MIX/Fold/Flip, Civi, Mi Note, Mi Max, Mi A, CC/Play
   Redmi 숫자형/A/Go, Redmi Note, K, Turbo
   POCO F/X/M/C
   Black Shark

3) Motorola
   Edge / Razr / Moto G / Moto E / Motorola One / Moto X / Moto Z / Moto C / Moto M /
   Defy / ThinkPhone / Signature / Droid

4) 그 외
   Google Pixel, LG, Sony Xperia, OnePlus, OPPO, vivo, iQOO, realme, HONOR, Huawei,
   ASUS, Nothing, CMF, Nokia, HMD, ZTE, nubia, REDMAGIC, Meizu, TCL, Alcatel, Sharp,
   HTC, Lenovo, ZUK, Legion, TECNO, Infinix, itel, Fairphone, BlackBerry, Lumia,
   Essential, Razer Phone

검색 개선
- 판매자가 브랜드를 빼고 "S24", "점프3", "와이드7", "edge 50", "픽셀9"처럼 적어도 인식 범위 확대
- Wide/Jump/Quantum/Buddy 한국어/영문 별칭 추가
- Redmi Note / POCO / Motorola / Pixel 등 축약 검색 보강
- 기본형 검색에 Ultra/Pro/Plus/FE 등이 섞이는 것을 계속 차단

적용 방법
1. 이 ZIP을 sisebom 저장소 루트에 풀고 덮어쓰기
2. PowerShell:
   node apply-final-v5.js
3. 서버 테스트:
   cd server
   npm test
4. GitHub Desktop
   Summary: 전체 스마트폰 카탈로그 FINAL V5
5. Commit to main -> Push origin
6. Render 배포 완료 확인

추천 확인 모델
- 갤럭시 와이드7
- 갤럭시 점프3
- 갤럭시 퀀텀5
- 갤럭시 버디3
- 갤럭시 A55 / A56
- 갤럭시 S26 Ultra
- 갤럭시 Z Fold8 Ultra
- Xiaomi 17 Ultra
- Redmi Note 14 Pro / Note 17
- POCO F6 / F9 Pro
- Motorola Edge 50 / Edge 70
- Motorola Razr 60 Ultra
- Pixel 11 Pro Fold
- Sony Xperia VIII
- OnePlus 15
- OPPO Find N6

중요
- "모든 스마트폰"은 지역별 파생명/통신사 리브랜딩이 계속 생기기 때문에 완전히 고정된 목록이 될 수 없음.
  그래서 V5는 대규모 정적 시드 + 기존 공식 카탈로그 자동 발견 구조를 같이 유지함.
- 새 모델은 공식 카탈로그 자동 발견으로 추가될 수 있고, 정적 시드는 중고 검색에서 자주 쓰이는 역사적/지역 모델을 넓게 보완함.

[FINAL V6]
- 아이폰 제외 전 브랜드 모델에 제품정보/대표이미지 자동 보강 로직 추가
- 빈 제품정보는 브랜드/시리즈 기반으로 자동 채움
- 대표 이미지가 없으면 모델명 기반 이미지 자동 생성

[FINAL V8]
- 중고 매물 검색에서 용량 조건 제거
- 아이폰15 포함 전 모델을 모델명 중심으로 검색
- 새 매물이 더 이상 나오지 않을 때까지 심층 수집
- 플랫폼당 5,000개 안전 상한 / 최대 10,000개 환경변수 조정 가능
- 프론트는 심층 수집 완료까지 주기적으로 결과 갱신

[FINAL V8.1]
- 중고나라 명시적 page=N 페이지네이션 전체 순회
- 플랫폼당 기본 20,000개 안전 상한 / 최대 50,000개 환경설정
- 심층 수집 기본 30분, 중고나라 총 결과수 기반 마지막 페이지 계산

[FINAL V8.2]
- 중고나라 동적 검색 결과: 직렬화 items + 공개 XHR/fetch + 장기 스크롤 수집으로 보강
