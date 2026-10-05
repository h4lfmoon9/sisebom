시세봄 30단계 FINAL RELEASE

29단계까지 실제 매물수집 → 필터링 → 시세분석 → 구매판단이 정상 동작한 상태에서
마지막 안정화/모바일/오류처리를 마무리하는 최종 단계입니다.

이번 최종판
- refresh=1이 캐시만 건너뛰는 것이 아니라 완료된 브라우저 수집 작업도 실제로 새로 시작
- 중고나라처럼 공개 페이지가 HTTP 403인 경우 ok:true로 잘못 표시하지 않음
- 차단/접근제한은 "공개 페이지 접근 제한"으로 표시하고 우회하지 않음
- 당근처럼 검색 카드에서 사진이 안 보이는 경우:
  원본 공개 매물 페이지의 og:image/twitter:image를 소수 매물에 한해 추가 확인
- 원본 페이지에서 확인할 수 없는 사진은 계속 "사진 없음" 유지
- 깨진 외부 이미지가 보이면 자동으로 "사진 없음" 카드로 대체
- 사용자가 새로고침했는데 일시 오류가 나도 기존 정상 매물 결과 유지
- 브라우저 요청 15초 안전 타임아웃
- 용량 필터 선택 시 해당 용량의 신제품 가격 표시
- 모바일 760px 이하 레이아웃/입력/필터/비교표/모델카드 최종 보강
- API health/realtime 결과에 release: "30-final" 추가

적용 순서
1. ZIP을 sisebom 저장소 루트에 풀고 덮어쓰기
2. PowerShell을 sisebom 폴더에서 열기
3. 반드시 실행:
   node apply-step30.js
4. 아래 문구 확인:
   ✅ 시세봄 30단계 최종판 적용 완료
5. GitHub Desktop
   Summary: 시세봄 최종 안정화 30단계
6. Commit to main
7. Push origin
8. Render 최신 배포가 초록 체크인지 확인

최종 확인 주소
1) https://sisebom.onrender.com/api/health
   release가 "30-final"인지 확인

2) https://sisebom.onrender.com/api/live/combined?q=아이폰%2015&refresh=1
   확인할 값:
   - release: "30-final"
   - count > 0 (공개 페이지 상황에 따라 달라짐)
   - analysis.engine: "sisebom-market-v2"
   - providers.당근.collectionStatus
   - providers.번개장터.collectionStatus
   - providers.중고나라.ok
   - providers.중고나라.blocked
   - imageEnrichedCount

중고나라 안내
현재 공개 검색 페이지가 서버 환경에서 HTTP 403을 반환할 수 있습니다.
30단계는 이를 우회하지 않고 정확히 접근 제한 상태로 표시합니다.
당근/번개장터가 정상일 경우 전체 시세분석은 계속 동작합니다.

GitHub Summary: 시세봄 최종 안정화 30단계
