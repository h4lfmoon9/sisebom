시세봄 FINAL V2 - iPhone 전 세대 검색 + 대표이미지 복구

확인한 원인
- iPhone 12/13/14 데이터와 대표 이미지 파일은 이미 저장소에 있습니다.
- 넓은 검색을 먼저 돌려 후보가 많이 차면 Pro/악세서리 후보가 섞여
  12/13/14 일반형의 정확 검색까지 못 가는 경우가 있었습니다.
- 대표이미지는 한 경로가 실패하면 다른 저장소 이미지를 재시도하지 않았습니다.

FINAL V2 수정
- iPhone 12/13/14/15 포함 숫자 세대는 용량이 붙은 정확 검색을 먼저 실행
- 한글 띄어쓰기/붙여쓰기 + 영문 표기 후보 생성
- iPhone 12 일반형: 64/128/256GB 우선
- iPhone 13/14/15 일반형: 128/256/512GB 우선
- Pro/Pro Max/Plus/mini 변형도 이름 유지
- Apple 대표이미지 자동 fallback:
  1) 현재 등록 image
  2) images/apple/<id>.png
  3) images/apple/provided/<id>.png
- 모델 목록 이미지도 첫 경로 실패 시 다음 경로 자동 시도
- 빈 이미지가 정상 이미지를 덮지 않도록 카탈로그 병합 수정
- 외부 임의 사진은 새로 추가하지 않고 이미 저장소에 있는 Apple 이미지부터 사용

적용
1. ZIP을 sisebom 저장소 루트에 풀어서 덮어쓰기
2. PowerShell:
   node apply-step30-v2.js
3. "✅ 시세봄 30단계 FINAL V2 적용 완료" 확인
4. GitHub Desktop Summary:
   아이폰 전세대 검색 이미지 복구 FINAL V2
5. Commit to main -> Push origin

테스트
- 아이폰 12
- 아이폰 12 128
- 아이폰 13
- 아이폰 14
- 아이폰 14 프로
- 아이폰 15

GitHub Summary: 아이폰 전세대 검색 이미지 복구 FINAL V2
