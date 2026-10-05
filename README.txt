시세봄 14단계 - 가격 오인식 정리

이번 결과에서 중고나라 매물이 3,000원으로 잘못 잡힌 문제를 수정합니다.

변경:
- 1만원 미만 가격은 휴대폰 본체 가격으로 사용하지 않음
- 검색 문장 안에 여러 가격이 있을 때 너무 낮은 배송비/부가금액은 건너뜀
- 최종 품질 필터에서도 1만원 미만 가격 제거

적용:
1. ZIP을 풉니다.
2. 안의 server 폴더를 기존 sisebom 폴더에 덮어씁니다.
3. GitHub Desktop Summary:
   실제 매물 가격 오인식 수정 14단계
4. Commit to main -> Push origin
5. Render 배포 후 테스트:
   https://sisebom.onrender.com/api/live/combined?q=아이폰%2015&refresh=1

확인할 것:
- 3,000원 같은 잘못된 휴대폰 가격이 없어야 함
- 실제 iPhone 15 매물은 계속 남아 있어야 함
