시세봄 23단계 - 전 iPhone 모델 정확매칭 + 회귀 테스트

이번 단계는 iPhone 15만 잘 되는 상태에서 끝내지 않고
다른 iPhone 모델 검색도 정확하게 만들기 위한 단계입니다.

수정:
- iPhone 3G / 3GS 구분
- iPhone 4S 구분
- iPhone 5 / 5c / 5s 구분
- iPhone 6 / 6s / Plus 계열 구분
- iPhone SE 1/2/3세대 구분 유지
- iPhone X / XR / XS / XS Max 구분 유지
- iPhone Air를 숫자형 iPhone과 별도 모델로 정확히 판별
- Tavily 스니펫에서도 3GS, 5s, 5c, 6s, Air 모델명이 잘리지 않게 수정

추가:
- server/qa/modelMatching.test.js
- npm test로 모델 필터 회귀 테스트 가능
- npm run check에 문법검사 + 자동 테스트 포함

적용:
1. ZIP 풀기
2. 안의 server 폴더를 기존 sisebom 폴더에 덮어쓰기
3. GitHub Desktop Summary:
   전 iPhone 모델 정확매칭 23단계
4. Commit to main -> Push origin

테스트 추천:
- 아이폰 15
- 아이폰 15 프로
- 아이폰 6s
- 아이폰 6s 플러스
- 아이폰 5s
- 아이폰 에어

GitHub Summary: 전 iPhone 모델 정확매칭 23단계
