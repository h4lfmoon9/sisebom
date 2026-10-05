시세봄 29단계 - 시세분석/AI 구매판단/검색/UI 최종 통합

큰 마무리 2/3.

이번 단계 핵심
1. 시세 계산을 server/marketAnalysis.js로 통합
   - IQR 극단값 제거
   - 최저/평균/최고/중앙값
   - 표본 수
   - 플랫폼 수
   - 최근 24시간 매물 수
   - 분석 신뢰도
   - 구매점수 0~100
2. /api/live/combined 응답에 analysis 추가
3. 심층수집 진행상태를 프론트에 전달
   - collecting
   - candidateCount
   - targetCount
   - collectionStatus
4. 첫 결과 표시 후 뒤에서 계속 수집
   - 약 15초 후 자동 재확인
   - 필요하면 한 번 더 자동 재확인
   - 사용자가 계속 새로고침할 필요 없음
5. 28단계 공식 신제품 스캔을 비동기화
   - /api/phones?live=1이 1분씩 기다리지 않음
   - 현재 DB는 즉시 반환
   - 제조사 공식 페이지 확인은 뒤에서 진행
6. 멀티브랜드 검색/UI
   - Apple
   - Samsung
   - Xiaomi / Redmi / POCO
   - Motorola
   - 기타 DB 브랜드도 브랜드 필터에 자동 표시
7. 비교하기를 iPhone 전용에서 스마트폰 전체 비교로 변경
8. script.js의 STEP28 변수 중복 문제 수정
9. 당근 카드 지역이 "삼성2동 ·"처럼 시간 없이 보여도 지역 추출
10. 검색 카드의 img/srcset/background-image까지 확인해 첫 사진 확보율 개선
11. 사진을 못 확인한 매물은 임의 사진을 만들지 않고 사진 없음 유지

적용 방법
1. ZIP을 sisebom 저장소 루트에 풉니다.
   - script.js 덮어쓰기
   - server 폴더 덮어쓰기
   - apply-step29.js는 루트에 위치
2. PowerShell에서 sisebom 폴더:
   node apply-step29.js
3. 아래 문구 확인:
   ✅ 시세봄 29단계 적용 완료
4. GitHub Desktop Summary:
   시세분석 검색 UI 통합 29단계
5. Commit to main -> Push origin
6. Render 배포 완료 확인

배포 후 확인
https://sisebom.onrender.com/api/live/combined?q=아이폰%2015&refresh=1

정상 응답에서 확인
- analysis
- providers.당근.collecting
- providers.번개장터.collecting
- candidateCount
- listings[].browserCollected

사이트에서도
- 첫 매물이 빠르게 보임
- 추가 수집 중이면 자동으로 한두 번 갱신
- AI 구매 판단에 신뢰도 표시
- Apple 외 제조사 검색/모델 필터 표시
- 스마트폰 전체 비교 가능

28단계 catalog 확인
https://sisebom.onrender.com/api/catalog/status
이제 /api/phones?live=1은 공식 카탈로그 스캔 완료까지 기다리지 않고 즉시 현재 DB를 반환합니다.

남은 단계
30단계: 전체 QA / 모바일 / 속도 / Render 안정화 / 출시판

GitHub Summary: 시세분석 검색 UI 통합 29단계
