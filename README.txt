시세봄 FINAL V3 — 멀티브랜드 자동화

추가된 것
- Galaxy / Xiaomi / Redmi / POCO / Motorola도 중고 통합검색 강화
- 기존 모델의 성능점수/저장용량 자동 보강
- 새 시리즈가 공식 제조사 페이지에 나오면 자동 감지
- 공식 제조사 페이지에서 확인되는 이미지를 대표이미지로 사용
- 공식 카드 텍스트에서 확인 가능한 칩셋/화면/카메라/충전 스펙 자동 추출
- 공식 이미지가 없으면 실제 중고검색에서 확인된 첫 매물 사진을 대표이미지로 사용
- 관계없는 임의 이미지는 사용하지 않음
- 외부 유료 AI API/Tavily 없이 동작

자동 등록 방식
'AI 자동등록'은 별도 유료 AI API 대신:
공식 제조사 페이지 감지 + 시세봄 자동 분석 규칙으로 구현했습니다.
새 제품 이름/공식 이미지/확인 가능한 스펙은 공식 페이지에서 가져오고,
성능점수는 시세봄 내부 비교용 자동 점수입니다.

적용
1. ZIP을 sisebom 저장소 루트에 풀고 덮어쓰기
2. PowerShell에서 반드시:
   node apply-final-v3.js
3. 아래 문구 확인:
   ✅ 시세봄 FINAL V3 멀티브랜드 자동화 적용 완료
4. GitHub Desktop Summary:
   멀티브랜드 자동등록 검색 FINAL V3
5. Commit to main -> Push origin
6. Render 최신 배포 초록 체크 확인

테스트 검색
- 갤럭시 S24
- 갤럭시 S24 울트라
- 갤럭시 A55
- Xiaomi 14
- 샤오미 14
- Redmi Note 14 Pro
- POCO F6
- motorola edge 50

GitHub Summary: 멀티브랜드 자동등록 검색 FINAL V3
