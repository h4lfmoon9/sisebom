시세봄 15단계 - 모델별 의심가격 제거

현재 iPhone 15 중고나라 결과가 20,000원으로 잡히는 문제 수정.

핵심:
- iPhone 세대별 현실적인 최소 가격 가드
- iPhone 15~16: 10만원 미만은 의심가격으로 제외
- iPhone 13~14: 7만원 미만 제외
- iPhone 11~12: 4만원 미만 제외
- 구형 모델은 더 낮은 가격도 허용
- 제목 가격 우선, 설명에 여러 가격이 있으면 배송비 같은 작은 금액 대신 큰 실제 판매가 후보를 우선
- 부품용/파손폰/고장폰도 시세 계산에서 제외

적용:
1. ZIP 압축 해제
2. server 폴더를 sisebom 폴더에 덮어쓰기
3. GitHub Desktop Summary:
   모델별 의심가격 필터 15단계
4. Commit to main
5. Push origin

배포 후 테스트:
https://sisebom.onrender.com/api/live/combined?q=아이폰%2015&refresh=1

기대 결과:
- 20,000원 중고나라 항목 제거
- excluded.suspiciousPrice 값 증가 가능
- 정상 iPhone 15 매물은 유지
