시세봄 20단계 - 예약중/판매완료 오탐 수정

19단계 결과는 번개장터·당근·중고나라가 모두 최종 목록에 들어와서 큰 구조는 정상입니다.

남은 문제:
최종 excluded.unavailable이 8개로 너무 많습니다.
원인은 현재 매물이 정상 판매중이어도 description/modelText 안에 주변 추천 매물의
'예약중', '판매완료' 문구가 섞이면 현재 매물까지 제거되던 것입니다.

수정:
- unavailable 판별은 item.status + 현재 제목만 사용
- description/modelText의 다른 추천 매물 상태 문구는 무시
- 모델 판별은 기존대로 modelText/description 사용
- 액세서리/구매글/카탈로그도 제목 중심 판별 유지

적용:
1. ZIP 풀기
2. server 폴더를 sisebom 폴더에 덮어쓰기
3. GitHub Desktop Summary:
   예약중 판매완료 오탐 수정 20단계
4. Commit to main -> Push origin

배포 후 테스트:
https://sisebom.onrender.com/api/live/combined?q=아이폰%2015&refresh=1

기대:
- excluded.unavailable이 크게 감소
- 이전에 주변 추천 매물의 '예약중' 때문에 빠졌던 정상 iPhone 15 매물이 복구
- 번개장터 579,000원 / 중고나라 정상 매물은 유지
