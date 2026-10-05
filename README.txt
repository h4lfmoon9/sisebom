시세봄 17단계 - 번개장터 모델명 복원

원인:
번개장터 Tavily 결과의 title이 실제 상품명이 아니라 대부분 '번개장터'로만 들어왔습니다.
그래서 실제 설명 안에 iPhone 15 정보가 있어도 exactModel 필터에서 전부 wrongModel로 빠졌습니다.

수정:
- 제목이 플랫폼명뿐이면 검색 설명에서 iPhone 모델 부분을 찾아 제목으로 사용
- modelText 필드를 추가해 정확한 모델 판별에 사용
- 품질 필터가 title만 보지 않고 modelText/description도 사용
- Tavily 검색어를 따옴표 검색으로 조금 더 정확하게 변경
- 중고나라의 iPhone 15 Pro는 iPhone 15 일반 검색에서 계속 제외됨 (정상)

적용:
1. ZIP 풀기
2. server 폴더를 sisebom 폴더에 덮어쓰기
3. GitHub Desktop Summary: 번개장터 모델명 복원 17단계
4. Commit to main -> Push origin

배포 후 테스트:
https://sisebom.onrender.com/api/live/combined?q=아이폰%2015&refresh=1

확인 포인트:
- 최종 listings에 platform:"번개장터" 항목이 생기는지
- 번개장터 제목이 더 이상 전부 "번개장터"로만 나오지 않는지
- 중고나라 Pro 매물은 일반 iPhone 15 결과에서 제외되는지
